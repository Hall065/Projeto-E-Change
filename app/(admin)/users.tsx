import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Card, Screen } from '../../src/components/ui';
import { listLocalAccounts } from '../../src/lib/localAccounts';
import { maskSensitive } from '../../src/lib/format';
import { supabase, supabaseConfigured } from '../../src/lib/supabase';
import type { Profile } from '../../src/types/database';
import { colors } from '../../src/theme/colors';

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const local = await listLocalAccounts();
      if (!supabaseConfigured) {
        setUsers(local);
        return;
      }
      try {
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        const remote = (data ?? []) as Profile[];
        const remoteIds = new Set(remote.map((u) => u.id));
        setUsers([...remote, ...local.filter((u) => !remoteIds.has(u.id))]);
      } catch {
        setUsers(local);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Usuários' }} />
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        {users.map((u) => (
          <Card key={u.id}>
            <Text style={styles.title}>{u.full_name || 'Sem nome'}</Text>
            <Text style={styles.meta}>
              {u.email} · role {u.role}
            </Text>
            <Text style={styles.meta}>CPF/CNPJ {maskSensitive(u.cpf_cnpj)}</Text>
          </Card>
        ))}
        {!users.length && <Text style={styles.meta}>Nenhum usuário ainda. Use os logins demo.</Text>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  title: { fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
});
