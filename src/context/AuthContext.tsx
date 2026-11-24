import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DEMO_ACCOUNTS, profileFromUserMetadata } from '../lib/demoAccounts';
import {
  authenticateLocal,
  ensureLocalDemoAccounts,
  recordToProfile,
  registerLocal,
  updateLocalProfile,
  type LocalAccountRecord,
} from '../lib/localAccounts';
import type { Profile, UserRole } from '../types/database';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isDemoSession: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    fullName: string;
    cpfCnpj?: string;
    role?: UserRole;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: {
    fullName?: string;
    cpfCnpj?: string | null;
    phone?: string | null;
  }) => Promise<void>;
  demoSignIn: (role?: UserRole) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function makeLocalUser(record: LocalAccountRecord): User {
  return {
    id: record.id,
    email: record.email,
    app_metadata: { provider: 'local', role: record.role },
    user_metadata: {
      full_name: record.fullName,
      role: record.role,
      cpf_cnpj: record.cpfCnpj,
      phone: record.phone,
    },
    aud: 'authenticated',
    created_at: record.createdAt,
  } as User;
}

function makeLocalSession(record: LocalAccountRecord): Session {
  return {
    access_token: `local-token-${record.id}`,
    refresh_token: `local-refresh-${record.id}`,
    expires_in: 60 * 60 * 24 * 30,
    token_type: 'bearer',
    user: makeLocalUser(record),
  } as Session;
}

async function upsertRemoteProfile(profile: Profile) {
  if (!supabaseConfigured) return;
  try {
    await supabase.from('profiles').upsert(
      {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        cpf_cnpj: profile.cpf_cnpj,
        phone: profile.phone,
        role: profile.role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  } catch (e) {
    console.warn('upsertRemoteProfile', e);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoSession, setIsDemoSession] = useState(false);

  const applyLocalRecord = (record: LocalAccountRecord) => {
    setSession(makeLocalSession(record));
    setProfile(recordToProfile(record));
    setIsDemoSession(record.id.startsWith('demo-user-') || record.id.startsWith('local-'));
  };

  const resolveRemoteProfile = async (user: User) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (data) {
      setProfile(data as Profile);
      return data as Profile;
    }
    const built = profileFromUserMetadata(
      user.id,
      user.email,
      user.user_metadata as Record<string, unknown>,
    );
    setProfile(built);
    await upsertRemoteProfile(built);
    return built;
  };

  const refreshProfile = async () => {
    if (!session?.user?.id) return;
    if (session.access_token?.startsWith('local-token-') || session.user.id.startsWith('demo-user-') || session.user.id.startsWith('local-')) {
      // perfil já está em memória / local store
      return;
    }
    await resolveRemoteProfile(session.user);
  };

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    const failSafe = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2500);

    (async () => {
      await ensureLocalDemoAccounts();
      if (!supabaseConfigured) {
        if (mounted) setLoading(false);
        clearTimeout(failSafe);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const remote = data.session;
        if (
          remote?.user &&
          !remote.access_token?.startsWith('local-token-') &&
          !remote.user.id.startsWith('demo-user-')
        ) {
          setSession(remote);
          setIsDemoSession(false);
          await resolveRemoteProfile(remote.user);
        }
      } catch {
        /* ok */
      } finally {
        if (mounted) setLoading(false);
        clearTimeout(failSafe);
      }

      const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
        if (
          !next?.user ||
          next.access_token?.startsWith('local-token-') ||
          next.user.id.startsWith('demo-user-')
        ) {
          return;
        }
        setSession(next);
        setIsDemoSession(false);
        await resolveRemoteProfile(next.user);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    })();

    return () => {
      mounted = false;
      clearTimeout(failSafe);
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isDemoSession,
      refreshProfile,
      updateProfile: async (patch) => {
        if (!profile?.email) throw new Error('Nenhum perfil ativo.');
        const updated = await updateLocalProfile(profile.email, {
          fullName: patch.fullName,
          cpfCnpj: patch.cpfCnpj ?? undefined,
          phone: patch.phone ?? undefined,
        });
        if (updated) {
          const next = recordToProfile(updated);
          setProfile(next);
          setSession(makeLocalSession(updated));
          await upsertRemoteProfile(next);
          return;
        }
        // Sessão remota: atualiza tabela profiles
        if (supabaseConfigured && profile.id && !profile.id.startsWith('local-') && !profile.id.startsWith('demo-user-')) {
          const next: Profile = {
            ...profile,
            full_name: patch.fullName?.trim() || profile.full_name,
            cpf_cnpj: patch.cpfCnpj !== undefined ? patch.cpfCnpj : profile.cpf_cnpj,
            phone: patch.phone !== undefined ? patch.phone : profile.phone,
            updated_at: new Date().toISOString(),
          };
          await upsertRemoteProfile(next);
          setProfile(next);
          return;
        }
        throw new Error('Não foi possível atualizar o perfil.');
      },
      signIn: async (email, password) => {
        const local = await authenticateLocal(email, password);
        if (local) {
          applyLocalRecord(local);
          return;
        }

        if (!supabaseConfigured) {
          throw new Error('Conta não encontrada. Cadastre-se ou use cliente@demo.com / demo123.');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.session?.user) {
          setSession(data.session);
          setIsDemoSession(false);
          await resolveRemoteProfile(data.session.user);
        }
      },
      signUp: async ({ email, password, fullName, cpfCnpj, role = 'customer' }) => {
        // Sempre registra no store local (fonte de verdade offline + novas contas)
        const record = await registerLocal({
          email,
          password,
          fullName,
          cpfCnpj,
          role,
        });

        if (supabaseConfigured) {
          try {
            const { data, error } = await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: {
                data: {
                  full_name: fullName.trim(),
                  role,
                  cpf_cnpj: cpfCnpj ?? null,
                },
              },
            });
            if (!error && data.user) {
              const remoteProfile = profileFromUserMetadata(
                data.user.id,
                data.user.email ?? email,
                {
                  full_name: fullName.trim(),
                  role,
                  cpf_cnpj: cpfCnpj ?? null,
                },
              );
              await upsertRemoteProfile(remoteProfile);
              if (data.session) {
                setSession(data.session);
                setProfile(remoteProfile);
                setIsDemoSession(false);
                return;
              }
            }
          } catch (e) {
            console.warn('signUp remote fallback local', e);
          }
        }

        // Sessão local imediata com os dados cadastrados
        applyLocalRecord(record);
      },
      signOut: async () => {
        setSession(null);
        setProfile(null);
        setIsDemoSession(false);
        if (supabaseConfigured) {
          try {
            await supabase.auth.signOut();
          } catch {
            /* ok */
          }
        }
      },
      demoSignIn: async (role: UserRole = 'customer') => {
        const account = DEMO_ACCOUNTS[role];
        const local = await authenticateLocal(account.email, account.password);
        if (local) {
          applyLocalRecord(local);
          return;
        }
        // Re-seed e tenta de novo
        await ensureLocalDemoAccounts();
        const again = await authenticateLocal(account.email, account.password);
        if (again) {
          applyLocalRecord(again);
          return;
        }
        throw new Error('Não foi possível entrar na conta demo.');
      },
    }),
    [session, profile, loading, isDemoSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
