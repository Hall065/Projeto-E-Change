import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Card, Screen, Stat } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';

export default function OwnerHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ stations: 0, free: 0, occupied: 0, revenue: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: stations } = await supabase.from('stations').select('id').eq('owner_id', user.id);
      const ids = (stations ?? []).map((s) => s.id);
      if (!ids.length) {
        // demo: show global active metrics for owners without owned stations yet
        const { data: connectors } = await supabase.from('connectors').select('status');
        setStats({
          stations: 0,
          free: (connectors ?? []).filter((c) => c.status === 'free').length,
          occupied: (connectors ?? []).filter((c) => c.status === 'occupied').length,
          revenue: 0,
        });
        return;
      }
      const { data: connectors } = await supabase.from('connectors').select('status').in('station_id', ids);
      setStats({
        stations: ids.length,
        free: (connectors ?? []).filter((c) => c.status === 'free').length,
        occupied: (connectors ?? []).filter((c) => c.status === 'occupied').length,
        revenue: 0,
      });
    })();
  }, [user]);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Owner Portal' }} />
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.h1}>Meus postos</Text>
        <Text style={styles.sub}>Cadastre tarifas, status de conectores e acompanhe faturamento.</Text>
        <View style={styles.stats}>
          <Stat label="Postos" value={String(stats.stations)} />
          <Stat label="Livres" value={String(stats.free)} />
          <Stat label="Ocupados" value={String(stats.occupied)} />
        </View>
        <Card>
          <Text style={styles.cardTitle}>Ações rápidas</Text>
          <Link href="/(owner)/stations" style={styles.link}>Gerenciar estações</Link>
          <Link href="/(owner)/connectors" style={styles.link}>Status dos conectores</Link>
          <Link href="/(owner)/pricing" style={styles.link}>Tarifas por kWh</Link>
          <Link href="/(owner)/revenue" style={styles.link}>Relatório de faturamento</Link>
          <Link href="/(customer)/map" style={styles.link}>← Voltar ao app</Link>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20 },
  h1: { fontSize: 28, fontWeight: '900', color: colors.ink },
  sub: { color: colors.muted, marginTop: 6, marginBottom: 14 },
  stats: { flexDirection: 'row', gap: 10 },
  cardTitle: { fontWeight: '800', color: colors.ink, marginBottom: 8 },
  link: { color: colors.primary, fontWeight: '700', marginTop: 12 },
});
