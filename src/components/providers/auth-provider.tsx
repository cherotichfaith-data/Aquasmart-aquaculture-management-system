"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Session } from "@supabase/supabase-js";
import { getMe } from "@/lib/api";
import { DASHBOARD_ROOT, normalizeRole, sanitizeNextPath, type AquasmartRole } from "@/lib/app-entry";
import { redirectBrowserAfterSignOut } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { clearBrowserWorkspaceContext } from "@/lib/context";
import { isSbAuthMissing, isSbInvalidRefreshToken, isSbNetworkError, isSbPermissionDenied, logSbError } from "@/lib/supabase/log";
import { getSessionIdentity } from "@/lib/supabase/session";
import { mergeUserContext } from "@/lib/user-context";

type UserRole = AquasmartRole;
type AuthProfile = Record<string, unknown> | null;
type AuthSettings = Record<string, unknown> | null;

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: UserRole;
    profile: AuthProfile;
    settings: AuthSettings;
    hasProfile: boolean;
    isLoading: boolean;
    signInWithPassword: (email: string, password: string) => Promise<void>;
    signInWithGoogle: (nextPath?: string | null) => Promise<void>;
    signUpWithPassword: (params: { firstName: string; lastName: string; email: string; password: string }) => Promise<{ hasSession: boolean }>;
    resetPasswordForEmail: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isSupabaseAuthCookie(name: string) {
    return name.startsWith("sb-") && (name.includes("-auth-token") || name.includes("-auth-token-code-verifier"));
}

function clearSupabaseBrowserCookies() {
    if (typeof document === "undefined") return;

    document.cookie
        .split(";")
        .map((cookie) => cookie.split("=")[0]?.trim())
        .filter((name): name is string => Boolean(name && isSupabaseAuthCookie(name)))
        .forEach((name) => {
            document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
        });
}

function buildServerBackedSession(user: User, accessToken: string): Session {
    const issuedAtSeconds = Math.floor(Date.now() / 1000);

    return {
        access_token: accessToken,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: issuedAtSeconds + 3600,
        refresh_token: "",
        user,
    };
}

function sanitizeSession(nextSession: Session | null): Session | null {
    if (!nextSession?.access_token) return nextSession;

    const identity = getSessionIdentity(nextSession.access_token);
    if (!identity) return nextSession;

    return {
        ...nextSession,
        user: {
            id: identity.userId,
            email: identity.email ?? undefined,
            user_metadata: identity.userMetadata,
            app_metadata: identity.appMetadata,
        } as User,
    };
}

async function clearSupabaseServerCookies() {
    if (typeof window === "undefined") return;

    await fetch("/api/auth/sign-out", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
    });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [profile, setProfile] = useState<AuthProfile>(null);
    const [settings, setSettings] = useState<AuthSettings>(null);
    const [hasProfile, setHasProfile] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const supabase = useMemo(() => createClient(), []);
    const queryClient = useQueryClient();
    const previousUserIdRef = useRef<string | null>(null);
    const userContextRequestRef = useRef(0);
    const deriveRole = (authUser: User | null): UserRole => {
        const raw = authUser?.user_metadata?.farm_role ?? null;
        return normalizeRole(typeof raw === "string" ? raw : null);
    };

    const deriveFallbackProfile = (authUser: User | null) => {
        if (!authUser) return null;
        return {
            email: authUser.email ?? null,
            ...authUser.user_metadata,
        };
    };

    const loadUserContext = useCallback(async (authUser: User | null) => {
        if (!authUser) {
            return {
                resolvedRole: null as UserRole,
                resolvedProfile: null as AuthProfile,
                resolvedSettings: null as AuthSettings,
                hasProfileRow: false,
            };
        }

        const fallbackProfile = deriveFallbackProfile(authUser);

        const [profileResult, settingsResult] = await Promise.all([
            supabase
                .from("user_profile")
                .select("user_id, email, full_name, notifications_enabled, created_at, updated_at")
                .eq("user_id", authUser.id)
                .maybeSingle(),
            supabase
                .from("user_settings")
                .select("user_id, theme, default_views, created_at, updated_at")
                .eq("user_id", authUser.id)
                .maybeSingle(),
        ]);

        if (profileResult.error && !isSbNetworkError(profileResult.error) && !isSbPermissionDenied(profileResult.error) && !isSbAuthMissing(profileResult.error)) {
            logSbError("authProvider:loadProfile", profileResult.error);
        }

        if (settingsResult.error && !isSbNetworkError(settingsResult.error) && !isSbPermissionDenied(settingsResult.error) && !isSbAuthMissing(settingsResult.error)) {
            logSbError("authProvider:loadSettings", settingsResult.error);
        }

        const profileRow = profileResult.data ?? null;
        const settingsRow = settingsResult.data ?? null;
        const mergedContext = mergeUserContext({
            profile: profileRow
                ? {
                    ...profileRow,
                    email: authUser.email ?? null,
                }
                : null,
            settings: settingsRow,
            fallback: fallbackProfile,
        });
        const resolvedProfile = mergedContext.profile ?? fallbackProfile;
        const resolvedSettings = mergedContext.settings;
        const resolvedRole = deriveRole(authUser);

        return {
            resolvedRole,
            resolvedProfile,
            resolvedSettings,
            hasProfileRow: Boolean(profileRow),
        };
    }, [supabase]);

    const resetClientStateForUser = useCallback((nextUserId: string | null) => {
        if (previousUserIdRef.current === nextUserId) {
            return;
        }

        if (previousUserIdRef.current === null) {
            previousUserIdRef.current = nextUserId;
            return;
        }

        previousUserIdRef.current = nextUserId;
        queryClient.clear();
    }, [queryClient]);

    const applyUserContext = useCallback(async (nextSession: Session | null) => {
        const safeSession = sanitizeSession(nextSession);
        const nextUser = safeSession?.user ?? null;
        resetClientStateForUser(nextUser?.id ?? null);
        setSession(safeSession);
        setUser(nextUser);
        setRole(deriveRole(nextUser));
        setProfile(deriveFallbackProfile(nextUser));
        setSettings(null);
        setHasProfile(false);

        const requestId = ++userContextRequestRef.current;
        const { resolvedRole, resolvedProfile, resolvedSettings, hasProfileRow } = await loadUserContext(nextUser);

        if (userContextRequestRef.current !== requestId) {
            return;
        }

        setRole(resolvedRole);
        setProfile(resolvedProfile);
        setSettings(resolvedSettings);
        setHasProfile(hasProfileRow);
    }, [loadUserContext, resetClientStateForUser]);

    const refreshProfile = useCallback(async () => {
        const currentUser = session?.user ?? user ?? null;
        const { resolvedRole, resolvedProfile, resolvedSettings, hasProfileRow } = await loadUserContext(currentUser);
        setRole(resolvedRole);
        setProfile(resolvedProfile);
        setSettings(resolvedSettings);
        setHasProfile(hasProfileRow);
    }, [loadUserContext, session, user]);

    const clearInvalidSession = useCallback(async () => {
        try {
            await clearSupabaseServerCookies();
        } catch {
        }

        clearSupabaseBrowserCookies();
        clearBrowserWorkspaceContext();

        try {
            await supabase.auth.signOut({ scope: "local" });
        } catch {
        }

        await applyUserContext(null);
    }, [applyUserContext, supabase]);

    const resolveServerBackedSession = useCallback(async () => {
        try {
            const result = await getMe();
            const serverUser = (result.user ?? null) as unknown as User | null;
            const accessToken = typeof result.token === "string" ? result.token : null;

            if (!serverUser || !accessToken) {
                return null;
            }

            return buildServerBackedSession(serverUser, accessToken);
        } catch {
            return null;
        }
    }, []);

    const resolvePreferredSession = useCallback(
        async (candidate: Session | null | undefined) => {
            if (candidate?.access_token) {
                return candidate;
            }

            return resolveServerBackedSession();
        },
        [resolveServerBackedSession],
    );

    useEffect(() => {
        const fetchSession = async () => {
            setIsLoading(true);
            try {
                const serverBackedSession = await resolveServerBackedSession();
                if (serverBackedSession) {
                    await applyUserContext(serverBackedSession);
                    return;
                }

                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    if (isSbInvalidRefreshToken(error)) {
                        await clearInvalidSession();
                        return;
                    }
                    if (!isSbNetworkError(error)) {
                        logSbError("authProvider:getSession", error);
                    }
                }
                const currentSession = await resolvePreferredSession(data?.session);
                await applyUserContext(currentSession);
            } catch (error) {
                if (isSbInvalidRefreshToken(error)) {
                    await clearInvalidSession();
                    return;
                }
                if (!isSbNetworkError(error)) {
                    logSbError("authProvider:getSession:catch", error);
                }
                const fallbackSession = await resolvePreferredSession(null);
                await applyUserContext(fallbackSession);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            setIsLoading(true);
            try {
                if (event === "SIGNED_OUT") {
                    await applyUserContext(null);
                    return;
                }

                const resolvedSession = await resolvePreferredSession(newSession);
                await applyUserContext(resolvedSession);
            } finally {
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [applyUserContext, clearInvalidSession, resolvePreferredSession, resolveServerBackedSession, supabase]);

    useEffect(() => {
        const handler = () => {
            void refreshProfile();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('profile-updated', handler);
            window.addEventListener('farm-memberships-updated', handler);
            return () => {
                window.removeEventListener('profile-updated', handler);
                window.removeEventListener('farm-memberships-updated', handler);
            };
        }
    }, [refreshProfile]);
    

    const signInWithPassword = useCallback(async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            throw error;
        }

        await applyUserContext(data.session ?? null);
    }, [applyUserContext, supabase]);

    const signInWithGoogle = useCallback(async (nextPath?: string | null) => {
        // OAuth uses the same server callback as the email links: /auth/callback
        // exchanges the code, claims any pending farm invitations, then redirects
        // to `next`. Middleware (proxy.ts) takes it from there -- onboarding vs.
        // workspace select vs. dashboard based on membership.
        const destination = sanitizeNextPath(nextPath ?? null, DASHBOARD_ROOT);
        const redirectTo =
            typeof window !== "undefined"
                ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`
                : undefined;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo,
                queryParams: { prompt: "select_account" },
            },
        });

        if (error) {
            throw error;
        }
        // On success the browser is navigating to Google; nothing else runs here.
    }, [supabase]);

    const signUpWithPassword = useCallback(async (params: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
    }) => {
        const firstName = params.firstName.trim();
        const lastName = params.lastName.trim();
        const fullName = [firstName, lastName].filter(Boolean).join(" ");
        const { data, error } = await supabase.auth.signUp({
            email: params.email.trim(),
            password: params.password,
            options: {
                emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback?next=/auth` : undefined,
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    full_name: fullName,
                    name: fullName,
                    role: "admin",
                    password_configured: true,
                },
            },
        });

        if (error) {
            throw error;
        }

        await applyUserContext(data.session ?? null);
        return { hasSession: Boolean(data.session) };
    }, [applyUserContext, supabase]);

    const resetPasswordForEmail = useCallback(async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback?next=/auth/set-password` : undefined,
        });

        if (error) {
            throw error;
        }
    }, [supabase]);

    const signOut = async () => {
        // Clear local state immediately so UI responds quickly, even if network is slow.
        setUser(null);
        setSession(null);
        setRole(null);
        setProfile(null);
        setSettings(null);
        setHasProfile(false);
        resetClientStateForUser(null);

        try {
            await clearSupabaseServerCookies();
        } catch (err) {
            console.warn("Server sign out cleanup failed:", err);
        } finally {
            clearSupabaseBrowserCookies();
            clearBrowserWorkspaceContext();
        }

        try {
            const timeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Local sign out timed out")), 1000)
            );
            await Promise.race([supabase.auth.signOut({ scope: "local" }), timeout]);
        } catch (err) {
            console.warn("Local sign out failed:", err);
        } finally {
            try {
                await applyUserContext(null);
            } catch {
            }
            redirectBrowserAfterSignOut();
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                role,
                profile,
                settings,
                hasProfile,
                isLoading,
                signInWithPassword,
                signInWithGoogle,
                signUpWithPassword,
                resetPasswordForEmail,
                signOut,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
