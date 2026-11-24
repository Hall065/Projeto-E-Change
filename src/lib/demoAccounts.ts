import type { Profile, UserRole } from '../types/database';

/** Senha padrão das contas genéricas de demonstração. */
export const DEMO_PASSWORD = 'demo123';

export type DemoAccount = {
  role: UserRole;
  email: string;
  password: string;
  fullName: string;
  label: string;
  cpfCnpj: string;
};

export const DEMO_ACCOUNTS: Record<UserRole, DemoAccount> = {
  customer: {
    role: 'customer',
    email: 'cliente@demo.com',
    password: DEMO_PASSWORD,
    fullName: 'Cliente Demo',
    label: 'Cliente',
    cpfCnpj: '000.000.000-00',
  },
  owner: {
    role: 'owner',
    email: 'dono@demo.com',
    password: DEMO_PASSWORD,
    fullName: 'Dono Demo',
    label: 'Dono',
    cpfCnpj: '00.000.000/0001-00',
  },
  admin: {
    role: 'admin',
    email: 'admin@demo.com',
    password: DEMO_PASSWORD,
    fullName: 'Admin Demo',
    label: 'Admin',
    cpfCnpj: '111.111.111-11',
  },
};

export const DEMO_ACCOUNT_LIST = Object.values(DEMO_ACCOUNTS);

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'Cliente',
  owner: 'Dono de posto',
  admin: 'Administrador',
};

export function findDemoAccount(email: string, password: string): DemoAccount | null {
  const normalized = email.trim().toLowerCase();
  const account = DEMO_ACCOUNT_LIST.find((a) => a.email === normalized);
  if (!account) return null;
  if (password !== account.password) return null;
  return account;
}

export function findDemoAccountByEmail(email: string): DemoAccount | null {
  const normalized = email.trim().toLowerCase();
  return DEMO_ACCOUNT_LIST.find((a) => a.email === normalized) ?? null;
}

export function buildDemoProfile(account: Pick<DemoAccount, 'role' | 'email' | 'fullName' | 'cpfCnpj'> & { id?: string }): Profile {
  const now = new Date().toISOString();
  return {
    id: account.id ?? `demo-user-${account.role}`,
    full_name: account.fullName,
    email: account.email,
    cpf_cnpj: account.cpfCnpj || null,
    phone: null,
    role: account.role,
    avatar_url: null,
    created_at: now,
    updated_at: now,
  };
}

export function profileFromUserMetadata(
  userId: string,
  email: string | null | undefined,
  meta: Record<string, unknown> | null | undefined,
  fallbackRole: UserRole = 'customer',
): Profile {
  const now = new Date().toISOString();
  const role = (meta?.role as UserRole) || fallbackRole;
  return {
    id: userId,
    full_name: String(meta?.full_name ?? meta?.name ?? email?.split('@')[0] ?? 'Usuário'),
    email: email ?? null,
    cpf_cnpj: (meta?.cpf_cnpj as string) ?? null,
    phone: (meta?.phone as string) ?? null,
    role: ['customer', 'owner', 'admin'].includes(role) ? role : 'customer',
    avatar_url: (meta?.avatar_url as string) ?? null,
    created_at: now,
    updated_at: now,
  };
}
