import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Screen, Stat } from '../../../src/components/ui';
import { useJourney } from '../../../src/context/JourneyContext';
import { formatPriceKwh } from '../../../src/lib/format';
import { fetchStationById } from '../../../src/services/stations';
import type { StationWithMetrics } from '../../../src/types/database';
import { colors } from '../../../src/theme/colors';

const HERO =
  'https://images.unsplash.com/photo-1593941707874-ef25b8b4a52a?auto=format&fit=crop&w=1200&q=80';

export default function StationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { setStation, setConnectorId } = useJourney();
  const [station, setLocal] = useState<StationWithMetrics | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchStationById(id).then((s) => {
      setLocal(s);
      if (s) setStation(s);
    });
  }, [id]);

  if (!station) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const free = (station.connectors ?? []).find((c) => c.status === 'free');
  const types = Array.from(new Set((station.connectors ?? []).map((c) => c.connector_type))).join(', ');

  return (
    <Screen>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ImageBackground source={{ uri: station.photo_url || HERO }} style={styles.hero}>
          <LinearGradient colors={['transparent', 'rgba(15,18,14,0.75)']} style={styles.heroShade}>
            <Text style={styles.heroTitle}>{station.name}</Text>
            <Text style={styles.heroMeta}>{Number(station.rating_avg).toFixed(1)} / 5 · {station.rating_count} avaliações</Text>
          </LinearGradient>
        </ImageBackground>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.meta}>Open · Closes {String(station.closes_at).slice(0, 5)}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPriceKwh(station.min_price).replace('/kWh', '')}</Text>
            <Text style={styles.meta}> / kWh</Text>
          </View>
          <Text style={styles.meta}>
            {station.distance_km} km · {station.eta_min} min · {station.free_connectors}/{station.total_connectors} connectors
          </Text>
          <View style={styles.stats}>
            <Stat label="Available" value={`${station.free_connectors}/${station.total_connectors}`} />
            <Stat label="Max power" value={`${station.max_power_kw} kW`} />
            <Stat label="Connectors" value={types || '—'} />
          </View>
          <Text style={styles.address}>{station.address} · {station.city}/{station.state}</Text>
          <Button
            title="Traçar rota"
            onPress={() => {
              setStation(station);
              router.push(`/(customer)/route/${station.id}`);
            }}
          />
          <Button
            title="Reservar conector"
            ghost
            onPress={() => {
              setConnectorId(free?.id ?? station.connectors?.[0]?.id ?? null);
              router.push(`/(customer)/reserve/${station.id}`);
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 220, width: '100%' },
  heroShade: { flex: 1, justifyContent: 'flex-end', padding: 18 },
  heroTitle: { color: colors.white, fontSize: 26, fontWeight: '900' },
  heroMeta: { color: colors.accent, marginTop: 4, fontWeight: '700' },
  pad: { padding: 20, paddingBottom: 40 },
  meta: { fontSize: 14, color: colors.muted, marginTop: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 10 },
  price: { fontSize: 32, fontWeight: '900', color: colors.ink },
  stats: { flexDirection: 'row', gap: 10, marginTop: 16 },
  address: { marginTop: 14, color: colors.muted, marginBottom: 8 },
});
