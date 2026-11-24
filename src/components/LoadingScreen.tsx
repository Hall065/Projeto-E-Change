import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LeafLogo } from './ui';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily } from '../theme/fonts';

/** Tela cheia de boot / auth loading */
export function LoadingScreen({
  label = 'Carregando…',
  dark,
}: {
  label?: string;
  dark?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const useDark = dark ?? true;
  const pulse = useSharedValue(0);
  const bar = useSharedValue(0);
  const fade = useSharedValue(0);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 420 });
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    bar.value = withDelay(
      160,
      withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.cubic) }), -1, false),
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: 0.9 + fade.value * 0.1 + pulse.value * 0.04 }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0.08]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.28]) }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${8 + bar.value * 92}%` as `${number}%`,
  }));

  const bg = useDark ? '#0A0A0A' : colors.bg;
  const titleColor = useDark ? '#FFFFFF' : colors.ink;
  const muted = useDark ? 'rgba(255,255,255,0.55)' : colors.muted;
  const track = useDark ? '#222' : colors.line;

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <View style={styles.center}>
        <View style={styles.logoStack}>
          <Animated.View
            style={[
              styles.ring,
              { borderColor: colors.accent },
              ringStyle,
            ]}
          />
          <Animated.View style={logoStyle}>
            <LeafLogo size={68} />
          </Animated.View>
        </View>
        <Animated.Text
          style={[styles.title, { color: titleColor, fontFamily: fontFamily.extrabold }, titleStyle]}
        >
          E-Charge Map
        </Animated.Text>
        <Text style={[styles.label, { color: muted, fontFamily: fontFamily.medium }]}>{label}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: track }]}>
        <Animated.View style={[styles.fill, { backgroundColor: colors.accent }, barStyle]} />
      </View>
    </View>
  );
}

/** Bloco compacto pra sheet / listas */
export function LoadingBlock({ label }: { label?: string }) {
  const { colors } = useTheme();
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false);
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + spin.value * 0.65,
    transform: [{ scale: 0.85 + spin.value * 0.2 }],
  }));

  return (
    <View style={styles.block}>
      <Animated.View style={[styles.dot, { backgroundColor: colors.accent }, dotStyle]} />
      <Text style={{ color: colors.muted, fontFamily: fontFamily.medium, fontSize: 13 }}>
        {label ?? 'Carregando…'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: 32 },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  logoStack: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
  },
  title: { marginTop: 10, fontSize: 26, letterSpacing: -0.5 },
  label: { marginTop: 8, fontSize: 14 },
  track: {
    height: 4,
    borderRadius: 4,
    overflow: 'hidden',
    width: '70%',
    alignSelf: 'center',
    marginBottom: 36,
  },
  fill: { height: '100%', borderRadius: 4 },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
