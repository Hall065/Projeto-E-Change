import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { fontFamily } from '../../theme/fonts';
import { elevation } from '../../theme/tokens';

/**
 * Velocímetro estilo Waze — canto inferior esquerdo, acima do dock.
 * Reage a mudanças de velocidade com escala + cor.
 */
export function NavSpeedometer({ speedKmh }: { speedKmh: number }) {
  const speed = Math.max(0, Math.round(speedKmh || 0));
  const pulse = useSharedValue(1);
  const activity = useSharedValue(speed > 0 ? 1 : 0);

  useEffect(() => {
    activity.value = withTiming(speed > 2 ? 1 : 0, { duration: 320 });
    pulse.value = withSpring(1.08, { damping: 12, stiffness: 180 });
    const t = setTimeout(() => {
      pulse.value = withSpring(1, { damping: 14, stiffness: 160 });
    }, 120);
    return () => clearTimeout(t);
  }, [speed]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    borderColor: interpolateColor(activity.value, [0, 1], ['#C8C8C8', '#06C167']),
  }));

  const numStyle = useAnimatedStyle(() => ({
    color: interpolateColor(activity.value, [0, 1], ['#6B6B6B', '#000000']),
  }));

  return (
    <Animated.View style={[styles.wrap, elevation.float, ringStyle]}>
      <View style={styles.inner}>
        <Animated.Text style={[styles.num, numStyle]}>{speed || '—'}</Animated.Text>
        <Text style={styles.unit}>km/h</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontSize: 24,
    fontFamily: fontFamily.extrabold,
    letterSpacing: -0.6,
    lineHeight: 28,
  },
  unit: {
    marginTop: -2,
    fontSize: 10,
    color: '#6B6B6B',
    fontFamily: fontFamily.bold,
    textTransform: 'lowercase',
  },
});
