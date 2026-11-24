import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FavoriteButton } from './FavoriteButton';
import { Icon } from './Icon';
import { formatPriceKwh } from '../lib/format';
import type { StationWithMetrics } from '../types/database';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';

export function StationCard({
  station,
  onPress,
  showFavorite = true,
  onFavoriteChange,
}: {
  station: StationWithMetrics;
  onPress?: () => void;
  showFavorite?: boolean;
  onFavoriteChange?: (favorite: boolean) => void;
}) {
  const { colors } = useTheme();
  const types = Array.from(new Set((station.connectors ?? []).map((c) => c.connector_type))).join(' · ');

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
    >
      <View style={styles.row}>
        <View style={[styles.bolt, { backgroundColor: colors.primary }]}>
          <Icon name="flash" size={16} color={colors.onPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.ink, fontFamily: fontFamily.bold }]} numberOfLines={1}>
            {station.name}
          </Text>
          <Text style={[styles.meta, { color: colors.muted, fontFamily: fontFamily.medium }]}>
            {station.distance_km ?? '—'} km · {station.eta_min ?? '—'} min · {station.free_connectors}/
            {station.total_connectors} livres
          </Text>
        </View>
        {showFavorite ? (
          <View onStartShouldSetResponder={() => true}>
            <FavoriteButton stationId={station.id} size={22} onChange={onFavoriteChange} />
          </View>
        ) : null}
        <Text style={[styles.price, { color: colors.ink, fontFamily: fontFamily.extrabold }]}>
          {formatPriceKwh(station.min_price)}
        </Text>
      </View>
      <Text style={[styles.meta, { color: colors.muted, fontFamily: fontFamily.medium }]}>
        {station.max_power_kw} kW · {types || 'Conector indisponível'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 10,
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bolt: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15 },
  meta: { fontSize: 12, marginTop: 3 },
  price: { fontSize: 12 },
});
