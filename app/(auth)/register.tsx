import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Chip, Input, LeafLogo, Screen } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useAuth } from '../../src/context/AuthContext';
import type { UserRole } from '../../src/types/database';
import { ROLE_LABELS } from '../../src/lib/demoAccounts';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily } from '../../src/theme/fonts';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Preencha nome, e-mail e senha.');
      return;
    }
    try {
      setLoading(true);
      await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        cpfCnpj: cpfCnpj.trim() || undefined,
        role,
      });
      // Sessão já ativa — index redireciona conforme o role
      router.replace('/');
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen dark>
      <LinearGradient colors={['#0A0A0A', '#121412', '#0A0A0A']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
              <Icon name="chevron-back" size={22} color="#fff" />
            </Pressable>

            <Animated.View entering={FadeInDown.duration(400)} style={styles.hero}>
              <LeafLogo size={48} />
              <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>Criar conta</Text>
              <Text style={[styles.sub, { fontFamily: fontFamily.medium }]}>
                Seus dados ficam no perfil e abrem o painel certo ({ROLE_LABELS[role]}).
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(100).duration(420)}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
            >
              <Input placeholder="Nome completo" value={fullName} onChangeText={setFullName} />
              <Input
                placeholder="E-mail"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <Input placeholder="CPF / CNPJ" value={cpfCnpj} onChangeText={setCpfCnpj} />
              <Input placeholder="Senha" secureTextEntry value={password} onChangeText={setPassword} />

              <Text style={[styles.label, { color: colors.muted, fontFamily: fontFamily.semibold }]}>
                Tipo de conta
              </Text>
              <View style={styles.chips}>
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((value) => (
                  <Chip
                    key={value}
                    label={ROLE_LABELS[value]}
                    active={role === value}
                    onPress={() => setRole(value)}
                  />
                ))}
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button title="Criar conta e entrar" onPress={onSubmit} loading={loading} />
              <Button title="Já tenho conta" ghost onPress={() => router.back()} />
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20, paddingBottom: 40 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 4,
  },
  hero: { alignItems: 'center', paddingVertical: 18 },
  title: { marginTop: 12, fontSize: 28, color: '#fff', letterSpacing: -0.5 },
  sub: { marginTop: 6, color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: 14, maxWidth: 320 },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
  },
  label: { marginTop: 14, marginBottom: 6, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  errorBox: {
    marginTop: 12,
    backgroundColor: '#C04545',
    borderRadius: 12,
    padding: 10,
  },
  errorText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
