import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { formatPriceKwh } from '../lib/format';
import type { StationWithMetrics } from '../types/database';

export function StationCard({
  station,
  onPress,
}: {
  station: StationWithMetrics;
  onPress?: () => void;
}) {
  const types = Array.from(new Set((station.connectors ?? []).map((c) => c.connector_type))).join(', ');
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.bolt}><Text style={styles.boltText}>⚡</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{station.name}</Text>
          <Text style={styles.meta}>
            {station.distance_km ?? '—'} km · {station.eta_min ?? '—'} min · {station.free_connectors}/{station.total_connectors} livres
          </Text>
        </View>
        <Text style={styles.price}>{formatPriceKwh(station.min_price)}</Text>
      </View>
      <Text style={styles.meta}>{station.max_power_kw} kW máx · {types || '—'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 15,
    marginTop: 10,
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bolt: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boltText: { color: colors.white, fontSize: 14 },
  title: { fontSize: 15, fontWeight: '800', color: colors.ink },
  meta: { fontSize: 12, color: colors.muted, marginTop: 3 },
  price: { fontSize: 13, fontWeight: '900', color: colors.primary },
});
