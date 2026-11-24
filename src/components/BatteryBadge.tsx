import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily } from '../theme/fonts';
import { elevation, radius } from '../theme/tokens';

export function BatteryBadge({
  percent,
  compact,
  onPress,
}: {
  percent: number;
  compact?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const low = percent < 20;
  const tint = low ? colors.batteryLow : colors.battery;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.wrap,
        elevation.float,
        { backgroundColor: colors.surface, borderColor: colors.line },
        compact && styles.compact,
      ]}
    >
      <Icon name={low ? 'battery-dead' : percent > 70 ? 'battery-full' : 'battery-half'} size={18} color={tint} />
      <Text style={[styles.text, { color: colors.ink, fontFamily: fontFamily.bold }]}>{Math.round(percent)}%</Text>
      {!compact ? (
        <Text style={[styles.hint, { color: colors.muted, fontFamily: fontFamily.medium }]}>manual</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  compact: { paddingVertical: 10, paddingHorizontal: 12 },
  text: { fontSize: 13 },
  hint: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
});
