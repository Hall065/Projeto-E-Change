import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Screen, Title } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { maskSensitive } from '../../src/lib/format';
import { colors } from '../../src/theme/colors';

const LINKS = [
  'Vehicles & connectors',
  'Payment methods',
  'Notifications',
  'Privacy & LGPD',
  'Help & support',
];

export default function ProfileScreen() {
  const { profile, user, signOut } = useAuth();

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Title>Profile</Title>
          <Card>
            <View style={styles.row}>
              <View style={styles.avatar}><Text style={{ color: colors.white, fontWeight: '800' }}>{(profile?.full_name ?? 'U').slice(0, 1).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{profile?.full_name ?? 'Visitante'}</Text>
                <Text style={styles.meta}>{profile?.email ?? user?.email ?? 'Não autenticado'}</Text>
                <Text style={styles.meta}>{profile?.role ?? 'customer'} · CPF {maskSensitive(profile?.cpf_cnpj)}</Text>
              </View>
            </View>
          </Card>
          {LINKS.map((label) => (
            <Card key={label}>
              <View style={styles.rowBetween}>
                <Text style={styles.link}>{label}</Text>
                <Text style={styles.chev}>›</Text>
              </View>
            </Card>
          ))}
          {user ? (
            <Button
              title="Sign out"
              danger
              onPress={async () => {
                await signOut();
                router.replace('/(auth)/welcome');
              }}
            />
          ) : (
            <Button title="Sign in" onPress={() => router.push('/(auth)/login')} />
          )}
          {profile?.role === 'admin' && <Button title="Open Admin Panel" ghost onPress={() => router.push('/(admin)')} />}
          {profile?.role === 'owner' && <Button title="Open Owner Portal" ghost onPress={() => router.push('/(owner)')} />}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 3, fontSize: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { fontWeight: '700', color: colors.ink },
  chev: { color: colors.muted, fontSize: 18, fontWeight: '700' },
});
