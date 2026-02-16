"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { logSbError } from "@/utils/supabase/log";

type UserRole = "admin" | "farm_manager" | "system_operator" | "data_analyst" | "viewer" | null;

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: UserRole;
    profile: Record<string, any> | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [profile, setProfile] = useState<Record<string, any> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const supabase = createClient();
    const deriveRole = (authUser: User | null): UserRole => {
        const raw = authUser?.user_metadata?.role ?? authUser?.app_metadata?.role ?? null;
        return (typeof raw === "string" ? raw : null) as UserRole;
    };

    const deriveProfile = (authUser: User | null) => {
        if (!authUser) return null;
        return {
            email: authUser.email ?? null,
            ...authUser.user_metadata,
        };
    };

    useEffect(() => {
        const fetchSession = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    logSbError("authProvider:getSession", error);
                }
                const currentSession = data?.session ?? null;
                const currentUser = currentSession?.user ?? null;
                setSession(currentSession);
                setUser(currentUser);
                setRole(deriveRole(currentUser));
                setProfile(deriveProfile(currentUser));
            } catch (error) {
                logSbError("authProvider:getSession:catch", error);
                console.error("Error fetching session:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            setSession(newSession);
            const nextUser = newSession?.user ?? null;
            setUser(nextUser);
            setRole(deriveRole(nextUser));
            setProfile(deriveProfile(nextUser));
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    useEffect(() => {
        // Listen for profile updates that may have changed user metadata.
        const handler = () => {
            setRole(deriveRole(user ?? null));
            setProfile(deriveProfile(user ?? null));
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('profile-updated', handler);
            return () => window.removeEventListener('profile-updated', handler);
        }
    }, [user]);
    

    const signOut = async () => {
        // Clear local state immediately so UI responds quickly, even if network is slow.
        setUser(null);
        setSession(null);
        setRole(null);
        setProfile(null);

        try {
            const timeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Sign out timed out")), 4000)
            );
            await Promise.race([supabase.auth.signOut(), timeout]);
        } catch (err) {
            console.warn("Sign out request failed or timed out:", err);
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, role, profile, isLoading, signOut }}>
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
