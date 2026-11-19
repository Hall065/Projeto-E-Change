import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { Card, Screen } from '../../src/components/ui';
import { formatBRL } from '../../src/lib/format';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';

export default function AdminPayments() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('payments').select('*').order('created_at', { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, []);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Payments' }} />
      <ScrollView contentContainerStyle={styles.pad}>
        {rows.map((r) => (
          <Card key={r.id}>
            <Text style={styles.title}>{formatBRL(Number(r.amount))} · {r.method}</Text>
            <Text style={styles.meta}>{r.status} {r.paid_at ? `· ${new Date(r.paid_at).toLocaleString('pt-BR')}` : ''}</Text>
          </Card>
        ))}
        {!rows.length && <Text style={styles.meta}>Sem pagamentos ainda.</Text>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20 },
  title: { fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
});
