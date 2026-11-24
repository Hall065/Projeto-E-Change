import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../Icon';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily } from '../../theme/fonts';
import { elevation, radius } from '../../theme/tokens';

function etaClock(minutes: number) {
  const d = new Date(Date.now() + Math.max(0, minutes) * 60_000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return { value: `${m}`, unit: 'min' };
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (rem === 0) return { value: `${h}`, unit: 'h' };
  return { value: `${h}h${rem}`, unit: 'min' };
}

function formatDistance(km: number) {
  if (km < 1) return { value: `${Math.max(50, Math.round(km * 1000))}`, unit: 'm' };
  return { value: km >= 100 ? km.toFixed(0) : km.toFixed(1), unit: 'km' };
}

export function NavBottomDock({
  remainingKm,
  remainingMin,
  batteryPercent,
  batteryOk,
  destination,
  onArrive,
  onEnd,
}: {
  remainingKm: number;
  remainingMin: number;
  batteryPercent: number;
  batteryOk: boolean;
  destination?: string;
  onArrive: () => void;
  onEnd: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const duration = useMemo(() => formatDuration(remainingMin), [remainingMin]);
  const distance = useMemo(() => formatDistance(remainingKm), [remainingKm]);
  const arrival = useMemo(() => etaClock(remainingMin), [remainingMin]);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.anchor, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      <View style={[styles.card, elevation.sheet, { backgroundColor: colors.surface }]}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.ink }]}>{arrival}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>chegada</Text>
          </View>

          <View style={[styles.vDivider, { backgroundColor: colors.line }]} />

          <View style={styles.stat}>
            <View style={styles.valueRow}>
              <Text style={[styles.statValue, styles.statValueSm, { color: colors.ink }]}>
                {duration.value}
              </Text>
              <Text style={[styles.statUnit, { color: colors.ink }]}>{duration.unit}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.muted }]}>tempo</Text>
          </View>

          <View style={[styles.vDivider, { backgroundColor: colors.line }]} />

          <View style={styles.stat}>
            <View style={styles.valueRow}>
              <Text style={[styles.statValue, styles.statValueSm, { color: colors.ink }]}>
                {distance.value}
              </Text>
              <Text style={[styles.statUnit, { color: colors.ink }]}>{distance.unit}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.muted }]}>restante</Text>
          </View>

          <View style={[styles.vDivider, { backgroundColor: colors.line }]} />

          <View style={styles.stat}>
            <View style={styles.valueRow}>
              <Text
                style={[
                  styles.statValue,
                  styles.statValueSm,
                  { color: batteryOk ? colors.battery : colors.batteryLow },
                ]}
              >
                {batteryPercent.toFixed(0)}
              </Text>
              <Text
                style={[
                  styles.statUnit,
                  { color: batteryOk ? colors.battery : colors.batteryLow },
                ]}
              >
                %
              </Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.muted }]}>bateria</Text>
          </View>
        </View>

        {destination ? (
          <View style={[styles.destRow, { backgroundColor: colors.soft }]}>
            <View style={[styles.destIcon, { backgroundColor: colors.ink }]}>
              <Icon name="flash" size={14} color="#fff" />
            </View>
            <Text style={{ color: colors.ink, fontFamily: fontFamily.semibold, flex: 1 }} numberOfLines={1}>
              {destination}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable onPress={onEnd} style={[styles.endBtn, { borderColor: colors.line }]}>
            <Icon name="close" size={18} color={colors.danger} />
            <Text style={{ color: colors.danger, fontFamily: fontFamily.bold }}>Sair</Text>
          </Pressable>
          <Pressable onPress={onArrive} style={styles.arriveBtn}>
            <Text style={{ color: '#fff', fontFamily: fontFamily.bold, fontSize: 16 }}>Cheguei</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 0,
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  statValue: {
    fontFamily: fontFamily.extrabold,
    fontSize: 28,
    letterSpacing: -0.8,
  },
  statValueSm: {
    fontSize: 22,
    letterSpacing: -0.4,
  },
  statUnit: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  statLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
  },
  vDivider: {
    width: StyleSheet.hairlineWidth,
    height: 34,
    opacity: 0.9,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  destIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  arriveBtn: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
});
