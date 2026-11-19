import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { Card, Screen } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';

export default function AdminReservations() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from('reservations')
      .select('*, stations(name), connectors(label, connector_type)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, []);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Reservations' }} />
      <ScrollView contentContainerStyle={styles.pad}>
        {rows.map((r) => (
          <Card key={r.id}>
            <Text style={styles.title}>{r.stations?.name ?? 'Station'}</Text>
            <Text style={styles.meta}>#{r.connectors?.label} {r.connectors?.connector_type} · {r.status}</Text>
            <Text style={styles.meta}>Chegada {new Date(r.arrives_at).toLocaleString('pt-BR')}</Text>
          </Card>
        ))}
        {!rows.length && <Text style={styles.meta}>Sem reservas ainda.</Text>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20 },
  title: { fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
});
