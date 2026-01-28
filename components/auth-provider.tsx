"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

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
    const formatError = (err: unknown) => {
        if (!err) return "Unknown error";
        if (typeof err === "string") return err;
        if (err instanceof Error) return err.message;
        const maybe = err as { message?: string; details?: string; hint?: string };
        if (maybe.message) {
            const details = maybe.details ? ` (${maybe.details})` : "";
            const hint = maybe.hint ? ` Hint: ${maybe.hint}` : "";
            return `${maybe.message}${details}${hint}`;
        }
        try {
            return JSON.stringify(err);
        } catch {
            return String(err);
        }
    };

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error("Error fetching profile:", formatError(error));
                setRole(null);
                setProfile(null);
            } else {
                setRole(data?.role as UserRole ?? null);
                setProfile(data ?? null);
            }
        } catch (err) {
            console.error("Unexpected error fetching profile", err);
            setRole(null);
            setProfile(null);
        }
    }

    useEffect(() => {
        const fetchSession = async () => {
            setIsLoading(true);
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                if (currentSession?.user) {
                    await fetchProfile(currentSession.user.id);
                } else {
                    setRole(null);
                    setProfile(null);
                }
            } catch (error) {
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
            setUser(newSession?.user ?? null);
            if (newSession?.user) {
                await fetchProfile(newSession.user.id);
            } else {
                setRole(null);
                setProfile(null);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    useEffect(() => {
        // Listen for profile updates (dispatched after upsert)
        const handler = () => {
            const currentId = session?.user?.id ?? user?.id
            if (currentId) {
                void fetchProfile(currentId)
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('profile-updated', handler)
            return () => window.removeEventListener('profile-updated', handler)
        }
    }, [session?.user?.id, user?.id, supabase]);
    

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
