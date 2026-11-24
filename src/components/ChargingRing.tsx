import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 200;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export function ChargingRing({
  percent,
  dark,
  animMs = 700,
}: {
  percent: number;
  dark?: boolean;
  /** Duração da animação do anel — menor = acompanha carga rápida */
  animMs?: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(100, Math.max(0, percent)) / 100, {
      duration: Math.max(80, animMs),
      easing: Easing.out(Easing.cubic),
    });
  }, [percent, animMs]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: C * (1 - progress.value),
  }));

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={dark ? '#2A3328' : colors.line}
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={colors.accent}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${C} ${C}`}
          animatedProps={animatedProps}
          // SVG transform (evita transform-origin inválido no DOM/web)
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.percent, dark && { color: colors.white }]}>{Math.round(percent)}%</Text>
        <Text style={[styles.label, dark && { color: colors.light }]}>Charging...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', marginVertical: 16 },
  center: { position: 'absolute', alignItems: 'center' },
  percent: { fontSize: 42, fontWeight: '900', color: colors.ink },
  label: { fontSize: 13, color: colors.muted, marginTop: 2, fontWeight: '600' },
});
