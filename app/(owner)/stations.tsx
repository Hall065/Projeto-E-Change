import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { Button, Card, Input, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';

export default function OwnerStations() {
  const { user } = useAuth();
  const [stations, setStations] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('stations').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
    setStations(data ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const create = async () => {
    if (!user || !name.trim() || !address.trim()) return;
    const { error } = await supabase.from('stations').insert({
      owner_id: user.id,
      name: name.trim(),
      address: address.trim(),
      city: 'São Paulo',
      state: 'SP',
      latitude: -23.55 + Math.random() * 0.05,
      longitude: -46.63 - Math.random() * 0.05,
      status: 'pending',
    });
    if (error) Alert.alert('Erro', error.message);
    else {
      setName('');
      setAddress('');
      Alert.alert('Enviado', 'Posto criado e aguardando aprovação do admin.');
      load();
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Minhas estações' }} />
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.h}>Cadastrar posto</Text>
        <Input placeholder="Nome do posto" value={name} onChangeText={setName} />
        <Input placeholder="Endereço" value={address} onChangeText={setAddress} />
        <Button title="Enviar para aprovação" onPress={create} />
        {stations.map((s) => (
          <Card key={s.id}>
            <Text style={styles.title}>{s.name}</Text>
            <Text style={styles.meta}>{s.address}</Text>
            <Text style={styles.meta}>Status: {s.status}</Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20 },
  h: { fontWeight: '800', color: colors.ink, marginBottom: 4 },
  title: { fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
});
