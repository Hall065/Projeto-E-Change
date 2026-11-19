import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ChargingRing } from '../../../src/components/ChargingRing';
import { Button, Screen, Stat } from '../../../src/components/ui';
import { useJourney } from '../../../src/context/JourneyContext';
import { formatBRL } from '../../../src/lib/format';
import { endSession, tickSession } from '../../../src/services/journey';
import { colors } from '../../../src/theme/colors';

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { station, session, setSession, connectorId } = useJourney();
  const [loading, setLoading] = useState(false);
  const price = useMemo(() => {
    const c = (station?.connectors ?? []).find((x) => x.id === (connectorId ?? session?.connector_id));
    return Number(c?.price_per_kwh ?? station?.min_price ?? 1.75);
  }, [station, connectorId, session]);

  useEffect(() => {
    if (!session?.id || session.status !== 'charging') return;
    const timer = setInterval(async () => {
      try {
        const next = await tickSession(session.id, price);
        setSession(next);
      } catch {
        /* ignore */
      }
    }, 3500);
    return () => clearInterval(timer);
  }, [session?.id, session?.status, price]);

  const local = session ?? {
    id,
    battery_percent: 68,
    energy_kwh: 32.5,
    power_kw: 120,
    elapsed_minutes: 18,
    estimated_cost: 60.13,
    status: 'charging' as const,
  };

  const finish = async () => {
    try {
      setLoading(true);
      if (session?.id && (connectorId || session.connector_id)) {
        const ended = await endSession(session.id, connectorId ?? session.connector_id, price);
        setSession(ended);
        router.push(`/(customer)/bill/${ended.id}`);
      } else {
        router.push(`/(customer)/bill/${id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen dark style={{ backgroundColor: colors.dark }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center' }}>
            <Text style={styles.kicker}>LIVE SESSION</Text>
            <Text style={styles.title}>Charging in progress</Text>
            <Text style={styles.sub}>{station?.name ?? 'Station'} · Connector live</Text>
            <ChargingRing percent={Number(local.battery_percent)} dark />
          </Animated.View>
          <View style={styles.grid}>
            <View style={styles.statDark}><Text style={styles.statLabel}>Energy added</Text><Text style={styles.statValue}>{Number(local.energy_kwh).toFixed(1)} kWh</Text></View>
            <View style={styles.statDark}><Text style={styles.statLabel}>Current power</Text><Text style={styles.statValue}>{Number(local.power_kw).toFixed(0)} kW</Text></View>
            <View style={styles.statDark}><Text style={styles.statLabel}>Elapsed</Text><Text style={styles.statValue}>{local.elapsed_minutes} min</Text></View>
            <View style={styles.statDark}><Text style={styles.statLabel}>Est. cost</Text><Text style={styles.statValue}>{formatBRL(Number(local.estimated_cost))}</Text></View>
          </View>
          <Button title="End Charging" onPress={finish} loading={loading} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  kicker: { color: colors.accent, fontWeight: '800', letterSpacing: 1.2, fontSize: 11 },
  title: { fontSize: 26, fontWeight: '900', color: colors.white, marginTop: 8 },
  sub: { color: '#A7B39A', marginTop: 6, marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%', marginBottom: 8 },
  statDark: {
    width: '48%',
    backgroundColor: colors.darkCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A3328',
  },
  statLabel: { color: '#8B9580', fontSize: 12, fontWeight: '600' },
  statValue: { color: colors.white, fontSize: 18, fontWeight: '800', marginTop: 4 },
});
