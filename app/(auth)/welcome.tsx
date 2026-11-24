import React, { useEffect } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, LeafLogo } from '../../src/components/ui';
import { fontFamily } from '../../src/theme/fonts';

const BG =
  'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80';

export default function WelcomeScreen() {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(28);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 700 });
    translateY.value = withDelay(
      100,
      withTiming(0, { duration: 720, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <ImageBackground source={{ uri: BG }} style={styles.bg} resizeMode="cover">
        <LinearGradient
          colors={['rgba(10,10,10,0.25)', 'rgba(10,10,10,0.55)', '#0A0A0A']}
          style={styles.shade}
        >
          <SafeAreaView style={styles.safe}>
            <Animated.View style={[styles.hero, anim]}>
              <LeafLogo size={64} />
              <Text style={[styles.brand, { fontFamily: fontFamily.bold }]}>E-CHARGE MAP</Text>
              <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>
                Dirija elétrico.{"\n"}Vá mais longe.
              </Text>
              <Text style={[styles.sub, { fontFamily: fontFamily.medium }]}>
                Encontre postos, compare preços, reserve e pague — tudo em um só lugar.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(280).duration(450)} style={styles.actions}>
              <Button title="Criar conta" onPress={() => router.push('/(auth)/register')} />
              <Button title="Entrar" ghost onPress={() => router.push('/(auth)/login')} />
              <Pressable onPress={() => router.replace('/(customer)/(tabs)/map')} style={styles.linkWrap}>
                <Text style={[styles.link, { fontFamily: fontFamily.bold }]}>Explorar mapa</Text>
              </Pressable>
            </Animated.View>
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
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  brand: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    fontSize: 11,
  },
  title: {
    fontSize: 36,
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 42,
    letterSpacing: -0.8,
  },
  sub: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 22,
    fontSize: 15,
    maxWidth: 320,
  },
  actions: { padding: 20, paddingBottom: 28 },
  linkWrap: { marginTop: 16, alignItems: 'center' },
  link: { color: '#06C167', fontSize: 15 },
});
