import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { Card, Screen } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { maskSensitive } from '../../src/lib/format';
import { colors } from '../../src/theme/colors';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => setUsers(data ?? []));
  }, []);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Users' }} />
      <ScrollView contentContainerStyle={styles.pad}>
        {users.map((u) => (
          <Card key={u.id}>
            <Text style={styles.title}>{u.full_name || 'Sem nome'}</Text>
            <Text style={styles.meta}>{u.email} · role {u.role}</Text>
            <Text style={styles.meta}>CPF/CNPJ {maskSensitive(u.cpf_cnpj)}</Text>
          </Card>
        ))}
        {!users.length && <Text style={styles.meta}>Nenhum usuário ainda. Use os logins demo.</Text>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20 },
  title: { fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
});
