import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Button, Card, Input, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { createOwnerStation, getStationsForOwner } from '../../src/lib/localCatalog';
import type { Station } from '../../src/types/database';
import { colors } from '../../src/theme/colors';

export default function OwnerStations() {
  const { user } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setStations(await getStationsForOwner(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const create = async () => {
    if (!user || !name.trim() || !address.trim()) {
      Alert.alert('Preencha nome e endereço');
      return;
    }
    await createOwnerStation({
      ownerId: user.id,
      name: name.trim(),
      address: address.trim(),
    });
    setName('');
    setAddress('');
    Alert.alert('Enviado', 'Posto criado e aguardando aprovação do admin.');
    load();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Minhas estações' }} />
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        <Text style={styles.h}>Cadastrar posto</Text>
        <Input placeholder="Nome do posto" value={name} onChangeText={setName} />
        <Input placeholder="Endereço" value={address} onChangeText={setAddress} />
        <Button title="Enviar para aprovação" onPress={create} />
        <Text style={[styles.h, { marginTop: 18 }]}>Seus postos ({stations.length})</Text>
        {stations.map((s) => (
          <Card key={s.id}>
            <Text style={styles.title}>{s.name}</Text>
            <Text style={styles.meta}>{s.address}</Text>
            <Text style={styles.meta}>
              {s.city}/{s.state} · Status: {s.status}
            </Text>
          </Card>
        ))}
        {!stations.length && (
          <Text style={styles.meta}>Nenhum posto ainda. Cadastre o primeiro acima.</Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  h: { fontWeight: '800', color: colors.ink, marginBottom: 4 },
  title: { fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
});
