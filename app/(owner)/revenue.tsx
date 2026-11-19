import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { Card, Screen, Stat } from '../../src/components/ui';
import { formatBRL } from '../../src/lib/format';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';

export default function OwnerRevenue() {
  const [paid, setPaid] = useState(0);
  const [pending, setPending] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    supabase.from('payments').select('amount,status').then(({ data }) => {
      const rows = data ?? [];
      setCount(rows.length);
      setPaid(rows.filter((r) => r.status === 'paid').reduce((a, r) => a + Number(r.amount), 0));
      setPending(rows.filter((r) => r.status === 'pending').reduce((a, r) => a + Number(r.amount), 0));
    });
  }, []);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Faturamento' }} />
      <ScrollView contentContainerStyle={styles.pad}>
        <Card>
          <Text style={styles.title}>Resumo</Text>
          <Text style={styles.meta}>{count} pagamentos registrados</Text>
        </Card>
        <Stat label="Recebido" value={formatBRL(paid)} />
        <Stat label="Pendente" value={formatBRL(pending)} />
        <Text style={styles.note}>Repasse automatizado ao dono via gateway (Stripe / Mercado Pago) — integração prevista na doc.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, gap: 12 },
  title: { fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
  note: { color: colors.muted, marginTop: 12, lineHeight: 20 },
});
