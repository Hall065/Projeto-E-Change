import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Profile, UserRole } from '../types/database';
import { DEMO_ACCOUNT_LIST, DEMO_PASSWORD, buildDemoProfile, type DemoAccount } from './demoAccounts';

const STORAGE_KEY = 'echarge.local.accounts.v1';

export type LocalAccountRecord = {
  id: string;
  email: string;
  password: string;
  fullName: string;
  cpfCnpj: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

type Store = Record<string, LocalAccountRecord>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function webGet(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

function webSet(value: string) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, value);
}

async function readRaw(): Promise<string | null> {
  if (Platform.OS === 'web') return webGet();
  return AsyncStorage.getItem(STORAGE_KEY);
}

async function writeRaw(value: string) {
  if (Platform.OS === 'web') {
    webSet(value);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, value);
}

function seedStore(): Store {
  const store: Store = {};
  for (const demo of DEMO_ACCOUNT_LIST) {
    const id = `demo-user-${demo.role}`;
    store[normalizeEmail(demo.email)] = {
      id,
      email: demo.email,
      password: demo.password,
      fullName: demo.fullName,
      cpfCnpj: demo.cpfCnpj,
      phone: null,
      role: demo.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return store;
}

async function loadStore(): Promise<Store> {
  try {
    const raw = await readRaw();
    if (!raw) {
      const seeded = seedStore();
      await writeRaw(JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Store;
    // Garante demos sempre presentes (sem sobrescrever senha custom se alguém alterou email demo — reseed demos)
    let changed = false;
    for (const demo of DEMO_ACCOUNT_LIST) {
      const key = normalizeEmail(demo.email);
      if (!parsed[key]) {
        parsed[key] = {
          id: `demo-user-${demo.role}`,
          email: demo.email,
          password: DEMO_PASSWORD,
          fullName: demo.fullName,
          cpfCnpj: demo.cpfCnpj,
          phone: null,
          role: demo.role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        changed = true;
      }
    }
    if (changed) await writeRaw(JSON.stringify(parsed));
    return parsed;
  } catch {
    const seeded = seedStore();
    await writeRaw(JSON.stringify(seeded));
    return seeded;
  }
}

async function saveStore(store: Store) {
  await writeRaw(JSON.stringify(store));
}

export function recordToProfile(record: LocalAccountRecord): Profile {
  return {
    id: record.id,
    full_name: record.fullName,
    email: record.email,
    cpf_cnpj: record.cpfCnpj,
    phone: record.phone,
    role: record.role,
    avatar_url: null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

export function recordToDemoAccount(record: LocalAccountRecord): DemoAccount {
  return {
    role: record.role,
    email: record.email,
    password: record.password,
    fullName: record.fullName,
    label: record.role === 'admin' ? 'Admin' : record.role === 'owner' ? 'Dono' : 'Cliente',
    cpfCnpj: record.cpfCnpj ?? '',
  };
}

export async function authenticateLocal(
  email: string,
  password: string,
): Promise<LocalAccountRecord | null> {
  const store = await loadStore();
  const record = store[normalizeEmail(email)];
  if (!record) return null;
  if (record.password !== password) return null;
  return record;
}

export async function registerLocal(input: {
  email: string;
  password: string;
  fullName: string;
  cpfCnpj?: string;
  phone?: string;
  role?: UserRole;
}): Promise<LocalAccountRecord> {
  const store = await loadStore();
  const email = normalizeEmail(input.email);
  if (!email || !input.password || !input.fullName.trim()) {
    throw new Error('Preencha nome, e-mail e senha.');
  }
  const existing = store[email];
  // Contas demo oficiais: permite “resetar” dados de perfil mantendo o role demo
  const isOfficialDemo = DEMO_ACCOUNT_LIST.some((d) => d.email === email);
  if (existing && !isOfficialDemo) {
    throw new Error('Já existe uma conta com este e-mail. Faça login.');
  }

  const now = new Date().toISOString();
  const role = input.role ?? 'customer';
  const record: LocalAccountRecord = {
    id: existing?.id ?? `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    email,
    password: input.password,
    fullName: input.fullName.trim(),
    cpfCnpj: input.cpfCnpj?.trim() || null,
    phone: input.phone?.trim() || null,
    role,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  store[email] = record;
  await saveStore(store);
  return record;
}

export async function updateLocalProfile(
  email: string,
  patch: Partial<Pick<LocalAccountRecord, 'fullName' | 'cpfCnpj' | 'phone' | 'password'>>,
): Promise<LocalAccountRecord | null> {
  const store = await loadStore();
  const key = normalizeEmail(email);
  const current = store[key];
  if (!current) return null;
  const next: LocalAccountRecord = {
    ...current,
    fullName: patch.fullName?.trim() || current.fullName,
    cpfCnpj: patch.cpfCnpj !== undefined ? patch.cpfCnpj : current.cpfCnpj,
    phone: patch.phone !== undefined ? patch.phone : current.phone,
    password: patch.password || current.password,
    updatedAt: new Date().toISOString(),
  };
  store[key] = next;
  await saveStore(store);
  return next;
}

export async function getLocalProfileById(id: string): Promise<Profile | null> {
  const store = await loadStore();
  const record = Object.values(store).find((r) => r.id === id);
  return record ? recordToProfile(record) : null;
}

/** Garante seed das 3 demos (chame no boot). */
export async function ensureLocalDemoAccounts() {
  await loadStore();
  return DEMO_ACCOUNT_LIST.map((d) => buildDemoProfile(d));
}

/** Lista todas as contas locais (admin). */
export async function listLocalAccounts(): Promise<Profile[]> {
  const store = await loadStore();
  return Object.values(store)
    .map(recordToProfile)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
