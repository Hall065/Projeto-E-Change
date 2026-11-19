import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, EmptyState, Screen, Subtitle, Title } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { formatBRL } from '../../src/lib/format';
import { fetchUserHistory } from '../../src/services/journey';
import { colors } from '../../src/theme/colors';

export default function HistoryScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      setRows(await fetchUserHistory(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.pad}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        >
          <Title>Charging history</Title>
          <Subtitle>Past sessions and receipts.</Subtitle>
          {!user && <EmptyState title="Faça login" subtitle="Seu histórico aparece aqui após as recargas." />}
          {user && !rows.length && <EmptyState title="Sem sessões ainda" subtitle="Complete uma jornada de recarga para ver o histórico." />}
          {rows.map((row) => (
            <Card key={row.id}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{row.stations?.name ?? 'Station'}</Text>
                  <Text style={styles.meta}>
                    {new Date(row.started_at).toLocaleDateString('pt-BR')} · {Number(row.energy_kwh).toFixed(1)} kWh · {row.payments?.[0]?.method ?? '—'}
                  </Text>
                </View>
                <Text style={styles.price}>{formatBRL(Number(row.final_cost ?? row.estimated_cost ?? 0))}</Text>
              </View>
            </Card>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 14, fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4, fontSize: 12 },
  price: { fontWeight: '800', color: colors.primary },
});
