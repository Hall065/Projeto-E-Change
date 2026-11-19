import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark, Button, FadeInCard, Input, LeafLogo, Screen, Subtitle, Title } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

export default function LoginScreen() {
  const { signIn, demoSignIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Falha no login', e.message ?? 'Tente novamente');
    } finally {
      setLoading(false);
    }
  };

  const demo = async (role: 'customer' | 'owner' | 'admin') => {
    try {
      setLoading(true);
      await demoSignIn(role);
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Demo login', e.message ?? 'Não foi possível entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad}>
          <FadeInCard>
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <LeafLogo size={48} />
            </View>
            <BrandMark />
            <Title>Welcome back!</Title>
            <Subtitle>Sign in to continue your journey.</Subtitle>
          </FadeInCard>
          <FadeInCard delay={80}>
            <Input placeholder="Email address" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
            <Button title="Sign In" onPress={onSubmit} loading={loading} />
          </FadeInCard>
          <Text style={styles.or}>or continue with</Text>
          <View style={styles.socialRow}>
            <Pressable style={styles.social} onPress={() => Alert.alert('Google', 'Conecte OAuth Google no Supabase Auth.')}>
              <Text style={styles.socialText}>G  Google</Text>
            </Pressable>
            <Pressable style={styles.social} onPress={() => Alert.alert('Apple', 'Conecte Sign in with Apple no Supabase Auth.')}>
              <Text style={styles.socialText}>  Apple</Text>
            </Pressable>
          </View>
          <Text style={styles.or}>demo accounts</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}><Button title="Cliente" ghost onPress={() => demo('customer')} /></View>
            <View style={{ width: 8 }} />
            <View style={{ flex: 1 }}><Button title="Dono" ghost onPress={() => demo('owner')} /></View>
            <View style={{ width: 8 }} />
            <View style={{ flex: 1 }}><Button title="Admin" ghost onPress={() => demo('admin')} /></View>
          </View>
          <Text style={styles.create} onPress={() => router.push('/(auth)/register')}>New here? Create an account</Text>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 22, paddingBottom: 40 },
  or: { textAlign: 'center', color: colors.muted, marginTop: 18, marginBottom: 8, fontWeight: '600' },
  row: { flexDirection: 'row' },
  socialRow: { flexDirection: 'row', gap: 10 },
  social: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  socialText: { fontWeight: '700', color: colors.ink },
  create: { textAlign: 'center', color: colors.primary, fontWeight: '700', marginTop: 18 },
});
