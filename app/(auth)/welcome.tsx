import React, { useEffect } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, LeafLogo } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';

const BG =
  'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80';

export default function WelcomeScreen() {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 700 });
    translateY.value = withDelay(120, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, []);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.dark }}>
      <ImageBackground source={{ uri: BG }} style={styles.bg} resizeMode="cover">
        <LinearGradient colors={['rgba(15,18,14,0.35)', 'rgba(15,18,14,0.82)', '#0F120E']} style={styles.shade}>
          <SafeAreaView style={styles.safe}>
            <Animated.View style={[styles.hero, anim]}>
              <LeafLogo size={64} />
              <Text style={styles.brand}>E-Charge Map</Text>
              <Text style={styles.title}>Drive electric.{"\n"}Go further.</Text>
              <Text style={styles.sub}>Find stations, compare prices, reserve and pay — all in one place.</Text>
            </Animated.View>
            <View style={styles.actions}>
              <Button title="Get Started" onPress={() => router.push('/(auth)/register')} />
              <Button title="Sign In" ghost onPress={() => router.push('/(auth)/login')} />
              <Link href="/(customer)/(tabs)/map" style={styles.link}>Explorar mapa</Link>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  shade: { flex: 1 },
  safe: { flex: 1, justifyContent: 'space-between' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  brand: { marginTop: 14, color: colors.light, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 36, fontWeight: '900', color: colors.white, textAlign: 'center', marginTop: 16, lineHeight: 42 },
  sub: { color: '#D5DEC9', textAlign: 'center', marginTop: 14, lineHeight: 22, fontSize: 15, maxWidth: 320 },
  actions: { padding: 20, paddingBottom: 28 },
  link: { textAlign: 'center', color: colors.accent, marginTop: 16, fontWeight: '700' },
});
