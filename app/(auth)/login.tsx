import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, Input, LeafLogo, Screen } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useAuth } from '../../src/context/AuthContext';
import { DEMO_ACCOUNT_LIST, DEMO_PASSWORD, type DemoAccount } from '../../src/lib/demoAccounts';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily } from '../../src/theme/fonts';
import { radius } from '../../src/theme/tokens';

export default function LoginScreen() {
  const { signIn, demoSignIn } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState(DEMO_ACCOUNT_LIST[0].email);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hero = useSharedValue(0);

  useEffect(() => {
    hero.value = withTiming(1, { duration: 600 });
  }, []);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: hero.value,
    transform: [{ translateY: (1 - hero.value) * 16 }],
  }));

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    try {
      setLoading(true);
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível entrar. Tente de novo.');
    } finally {
      setLoading(false);
    }
  };

  const fillAccount = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  const demo = async (account: DemoAccount) => {
    setError(null);
    fillAccount(account);
    try {
      setLoading(true);
      await demoSignIn(account.role);
      router.replace('/');
    } catch (e: any) {
      setError(e?.message ?? 'Falha no login demo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen dark>
      <LinearGradient colors={['#0A0A0A', '#121412', '#0A0A0A']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.pad}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
                <Icon name="chevron-back" size={22} color="#fff" />
              </Pressable>

              <Animated.View style={[styles.hero, heroStyle]}>
                <LeafLogo size={56} />
                <Text style={[styles.brand, { fontFamily: fontFamily.bold }]}>E-CHARGE MAP</Text>
                <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>
                  Bem-vindo de volta
                </Text>
                <Text style={[styles.sub, { fontFamily: fontFamily.medium }]}>
                  Entre para reservar conectores e acompanhar suas recargas.
                </Text>
              </Animated.View>

              <Animated.View
                entering={FadeInUp.delay(120).duration(420)}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.line },
                ]}
              >
                <Text style={[styles.cardTitle, { color: colors.ink, fontFamily: fontFamily.bold }]}>
                  Entrar
                </Text>
                <Input
                  placeholder="E-mail"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
                <Input
                  placeholder="Senha"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />

                {error ? (
                  <Animated.View entering={FadeInDown.duration(250)} style={styles.errorBox}>
                    <Icon name="alert-circle" size={16} color="#fff" />
                    <Text style={styles.errorText}>{error}</Text>
                  </Animated.View>
                ) : null}

                <Button title="Entrar" onPress={onSubmit} loading={loading} />

                <View style={styles.dividerRow}>
                  <View style={[styles.divider, { backgroundColor: colors.line }]} />
                  <Text style={{ color: colors.muted, fontSize: 12, fontFamily: fontFamily.semibold }}>
                    ou continue com
                  </Text>
                  <View style={[styles.divider, { backgroundColor: colors.line }]} />
                </View>

                <View style={styles.socialRow}>
                  <Pressable
                    style={[styles.social, { borderColor: colors.line, backgroundColor: colors.ghost }]}
                    onPress={() => setError('Conecte OAuth Google no Supabase Auth.')}
                  >
                    <Text style={{ color: colors.ink, fontFamily: fontFamily.bold }}>Google</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.social, { borderColor: colors.line, backgroundColor: colors.ghost }]}
                    onPress={() => setError('Conecte Sign in with Apple no Supabase Auth.')}
                  >
                    <Text style={{ color: colors.ink, fontFamily: fontFamily.bold }}>Apple</Text>
                  </Pressable>
                </View>

                <Text
                  style={[styles.demoLabel, { color: colors.muted, fontFamily: fontFamily.semibold }]}
                >
                  Contas padrão (senha: {DEMO_PASSWORD})
                </Text>
                <View style={styles.demoList}>
                  {DEMO_ACCOUNT_LIST.map((account) => {
                    const active = email.trim().toLowerCase() === account.email;
                    return (
                      <Pressable
                        key={account.role}
                        disabled={loading}
                        onPress={() => void demo(account)}
                        onLongPress={() => fillAccount(account)}
                        style={[
                          styles.demoCard,
                          {
                            backgroundColor: active ? colors.primary : colors.ghost,
                            borderColor: active ? colors.primary : colors.ghostBorder,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: active ? colors.onPrimary : colors.ink,
                            fontFamily: fontFamily.bold,
                            fontSize: 13,
                          }}
                        >
                          {account.label}
                        </Text>
                        <Text
                          style={{
                            color: active ? colors.onPrimary : colors.muted,
                            fontFamily: fontFamily.medium,
                            fontSize: 11,
                            marginTop: 2,
                          }}
                        >
                          {account.email}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>
                  Toque para entrar · segure para preencher o formulário
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(220).duration(400)}>
                <Pressable onPress={() => router.push('/(auth)/register')} style={styles.createWrap}>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontFamily: fontFamily.medium }}>
                    Novo por aqui?{' '}
                    <Text style={{ color: colors.accent, fontFamily: fontFamily.bold }}>
                      Criar conta
                    </Text>
                  </Text>
                </Pressable>
                <Pressable onPress={() => router.replace('/(customer)/(tabs)/map')}>
                  <Text style={styles.skip}>Explorar mapa sem login</Text>
                </Pressable>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 4,
  },
  hero: { alignItems: 'center', paddingTop: 18, paddingBottom: 20 },
  brand: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    fontSize: 11,
  },
  title: {
    marginTop: 10,
    fontSize: 30,
    color: '#fff',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  sub: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 14,
    maxWidth: 300,
  },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginTop: 4,
  },
  cardTitle: { fontSize: 18, marginBottom: 4 },
  errorBox: {
    marginTop: 12,
    backgroundColor: '#C04545',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: { color: '#fff', flex: 1, fontSize: 12, fontWeight: '600' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    marginBottom: 12,
  },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  socialRow: { flexDirection: 'row', gap: 10 },
  social: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  demoLabel: { marginTop: 18, marginBottom: 8, fontSize: 12 },
  demoList: { gap: 8 },
  demoCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  createWrap: { alignItems: 'center', marginTop: 22 },
  skip: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.45)',
    marginTop: 14,
    fontWeight: '600',
    fontSize: 13,
  },
});
