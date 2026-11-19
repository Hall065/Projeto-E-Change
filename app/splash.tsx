import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { DarkHero, LeafLogo } from '../src/components/ui';
import { colors } from '../src/theme/colors';

export default function SplashScreen() {
  const bar = useSharedValue(0);
  const fade = useSharedValue(0);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 500 });
    bar.value = withDelay(200, withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }));
    const t = setTimeout(() => router.replace('/(auth)/welcome'), 1800);
    return () => clearTimeout(t);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ scale: 0.92 + fade.value * 0.08 }] }));
  const barStyle = useAnimatedStyle(() => ({ width: `${Math.max(8, bar.value * 100)}%` as any }));

  return (
    <DarkHero>
      <View style={styles.center}>
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <LeafLogo size={72} />
          <Text style={styles.title}>E-Charge Map</Text>
          <Text style={styles.sub}>The complete solution for electric mobility</Text>
        </Animated.View>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, barStyle]} />
        </View>
      </View>
    </DarkHero>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logoWrap: { alignItems: 'center' },
  title: { marginTop: 18, fontSize: 28, fontWeight: '900', color: colors.white },
  sub: { marginTop: 8, color: colors.light, textAlign: 'center' },
  track: {
    position: 'absolute',
    bottom: 48,
    width: '70%',
    height: 4,
    borderRadius: 4,
    backgroundColor: '#2A3328',
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
});
