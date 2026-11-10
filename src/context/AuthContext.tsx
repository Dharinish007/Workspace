import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<{ success: boolean; error: string | null }>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: false,
  isConfigured: false,
  authError: null,
  signIn: async () => ({ success: false, error: 'Auth not initialized' }),
  signOut: async () => ({ success: false, error: 'Auth not initialized' }),
  clearError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);

  const failedAttemptsRef = useRef<number>(0);
  const cooldownUntilRef = useRef<number>(0);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // Read existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.warn('Failed to retrieve Supabase session:', error.message);
        setAuthError(error.message);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setIsLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setAuthError(null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error: string | null }> => {
    if (!isSupabaseConfigured) {
      const err = 'Supabase credentials are not configured in .env.local';
      setAuthError(err);
      return { success: false, error: err };
    }

    const now = Date.now();
    if (cooldownUntilRef.current > now) {
      const waitSeconds = Math.ceil((cooldownUntilRef.current - now) / 1000);
      const err = `Too many failed sign-in attempts. Please wait ${waitSeconds}s before trying again.`;
      setAuthError(err);
      return { success: false, error: err };
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        failedAttemptsRef.current += 1;
        if (failedAttemptsRef.current >= MAX_FAILED_ATTEMPTS) {
          cooldownUntilRef.current = Date.now() + COOLDOWN_SECONDS * 1000;
          failedAttemptsRef.current = 0;
          const msg = `Too many failed sign-in attempts. Please wait ${COOLDOWN_SECONDS}s before trying again.`;
          setAuthError(msg);
          setIsLoading(false);
          return { success: false, error: msg };
        }

        setAuthError(error.message);
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      // Reset throttle on successful authentication
      failedAttemptsRef.current = 0;
      cooldownUntilRef.current = 0;

      setSession(data.session);
      setUser(data.user);
      setIsLoading(false);
      return { success: true, error: null };
    } catch (err: any) {
      const msg = err?.message || 'An unexpected authentication error occurred';
      setAuthError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  }, []);

  const signOut = useCallback(async (): Promise<{ success: boolean; error: string | null }> => {
    if (!isSupabaseConfigured) {
      return { success: true, error: null };
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthError(error.message);
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      setSession(null);
      setUser(null);
      setAuthError(null);
      setIsLoading(false);
      return { success: true, error: null };
    } catch (err: any) {
      const msg = err?.message || 'Failed to sign out';
      setAuthError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  }, []);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isConfigured: isSupabaseConfigured,
        authError,
        signIn,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

