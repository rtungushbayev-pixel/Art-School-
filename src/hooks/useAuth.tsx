import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { clearPushToken, syncPushToken } from '../lib/notifications';
import { AUTH_REDIRECT_URL, listenForAuthLinks } from '../lib/authLinks';
import type { Profile } from '../types/database';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    accountType: SignUpAccountType;
    groupId: string | null;
  }) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// needsConfirmation: Supabase ждёт подтверждения почты; иначе пользователь
// уже вошёл (подтверждение выключено в настройках проекта).
export type SignUpResult = { error: string | null; needsConfirmation: boolean };

// Сотрудником при регистрации стать нельзя: эту роль назначает администрация.
export type SignUpAccountType = 'student' | 'parent';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) {
      setProfile(data as Profile);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Вход по ссылке подтверждения из письма.
  useEffect(() => listenForAuthLinks(), []);

  useEffect(() => {
    if (profile) {
      syncPushToken();
    }
  }, [profile?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error?.message ?? null;
      },
      signUp: async ({ email, password, fullName, accountType, groupId }) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: AUTH_REDIRECT_URL,
            data: { full_name: fullName, account_type: accountType, group_id: groupId },
          },
        });
        return { error: error?.message ?? null, needsConfirmation: !error && !data.session };
      },
      signOut: async () => {
        // Чистим push-токен устройства, чтобы после выхода на общем устройстве
        // следующий пользователь не получал чужие уведомления (тот же физический
        // токен иначе остаётся привязан к профилю прошлого аккаунта).
        if (profile) {
          await clearPushToken();
        }
        await supabase.auth.signOut();
      },
      refreshProfile: async () => {
        if (session?.user) {
          await loadProfile(session.user.id);
        }
      },
    }),
    [session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider');
  return ctx;
}
