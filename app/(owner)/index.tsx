import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, Stack, useFocusEffect } from 'expo-router';
import { Card, Screen, Stat } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { getOwnerStats } from '../../src/lib/localCatalog';
import { colors } from '../../src/theme/colors';

export default function OwnerHome() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ stations: 0, free: 0, occupied: 0, revenue: 0 });

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      getOwnerStats(user.id).then(setStats).catch(console.error);
    }, [user]),
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Portal do Dono' }} />
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.h1}>Olá, {profile?.full_name ?? 'Dono'}</Text>
        <Text style={styles.sub}>
          {profile?.email ?? user?.email ?? ''} · Cadastre tarifas, status de conectores e acompanhe faturamento.
        </Text>
        <View style={styles.stats}>
          <Stat label="Postos" value={String(stats.stations)} />
          <Stat label="Livres" value={String(stats.free)} />
          <Stat label="Ocupados" value={String(stats.occupied)} />
        </View>
        <Card>
          <Text style={styles.cardTitle}>Ações rápidas</Text>
          <Link href="/(owner)/stations" style={styles.link}>
            Gerenciar estações
          </Link>
          <Link href="/(owner)/connectors" style={styles.link}>
            Status dos conectores
          </Link>
          <Link href="/(owner)/pricing" style={styles.link}>
            Tarifas por kWh
          </Link>
          <Link href="/(owner)/revenue" style={styles.link}>
            Relatório de faturamento
          </Link>
          <Link href="/(customer)/(tabs)/map" style={styles.link}>
            ← Voltar ao app
          </Link>
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
