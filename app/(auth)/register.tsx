import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark, Button, Chip, Input, Screen, Subtitle, Title } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import type { UserRole } from '../../src/types/database';
import { colors } from '../../src/theme/colors';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);
      await signUp({ email: email.trim(), password, fullName, cpfCnpj, role });
      Alert.alert('Conta criada', 'Verifique seu e-mail se a confirmação estiver ativa, ou faça login.');
      router.replace('/(auth)/login');
    } catch (e: any) {
      Alert.alert('Cadastro', e.message ?? 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad}>
          <BrandMark />
          <Title>Create account</Title>
          <Subtitle>RF-01 · e-mail, senha forte e CPF/CNPJ.</Subtitle>
          <Input placeholder="Full name" value={fullName} onChangeText={setFullName} />
          <Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Input placeholder="CPF / CNPJ" value={cpfCnpj} onChangeText={setCpfCnpj} />
          <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
          <Text style={styles.label}>Tipo de conta</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {([
              ['customer', 'Cliente'],
              ['owner', 'Dono de posto'],
              ['admin', 'Admin'],
            ] as const).map(([value, label]) => (
              <Chip key={value} label={label} active={role === value} onPress={() => setRole(value)} />
            ))}
          </ScrollView>
          <Button title="Create account" onPress={onSubmit} loading={loading} />
          <Button title="Already have an account" ghost onPress={() => router.back()} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 22, paddingBottom: 40 },
  label: { marginTop: 16, fontWeight: '700', color: colors.ink },
});
