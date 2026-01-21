"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

type UserRole = "admin" | "farm_manager" | "system_operator" | "data_analyst" | "viewer" | null;

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: UserRole;
    isLoading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [isLoading, setIsLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        const fetchSession = async () => {
            setIsLoading(true);
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                if (currentSession?.user) {
                    await fetchRole(currentSession.user.id);
                } else {
                    setRole(null);
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
                await fetchRole(newSession.user.id);
            } else {
                setRole(null);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const fetchRole = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (error) {
                console.error("Error fetching profile role:", error);
                setRole(null); // Or default role
            } else {
                setRole(data?.role as UserRole);
            }
        } catch (err) {
            console.error("Unexpected error fetching role", err);
            setRole(null);
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setRole(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, role, isLoading, signOut }}>
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
