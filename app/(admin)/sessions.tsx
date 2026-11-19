import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { Card, Screen } from '../../src/components/ui';
import { formatBRL } from '../../src/lib/format';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';

export default function AdminSessions() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from('charging_sessions')
      .select('*, stations(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, []);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Sessions' }} />
      <ScrollView contentContainerStyle={styles.pad}>
        {rows.map((r) => (
          <Card key={r.id}>
            <Text style={styles.title}>{r.stations?.name ?? 'Station'}</Text>
            <Text style={styles.meta}>{r.status} · {Number(r.energy_kwh).toFixed(1)} kWh · {formatBRL(Number(r.final_cost ?? r.estimated_cost))}</Text>
          </Card>
        ))}
        {!rows.length && <Text style={styles.meta}>Sem sessões ainda.</Text>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20 },
  title: { fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
});
