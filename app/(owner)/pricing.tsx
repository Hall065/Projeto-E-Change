import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { Button, Card, Input, Screen } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';

export default function OwnerPricing() {
  const [connectors, setConnectors] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase.from('connectors').select('*, stations(name)');
    setConnectors(data ?? []);
    const map: Record<string, string> = {};
    (data ?? []).forEach((c) => { map[c.id] = String(c.price_per_kwh); });
    setPrices(map);
  };

  useEffect(() => { load(); }, []);

  const save = async (id: string) => {
    const value = Number(prices[id]);
    if (!value || value <= 0) return Alert.alert('Tarifa inválida');
    const { error } = await supabase.from('connectors').update({ price_per_kwh: value }).eq('id', id);
    if (error) Alert.alert('Erro', error.message);
    else Alert.alert('Salvo', 'Tarifa atualizada');
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Tarifas' }} />
      <ScrollView contentContainerStyle={styles.pad}>
        {connectors.map((c) => (
          <Card key={c.id}>
            <Text style={styles.title}>{c.stations?.name} · #{c.label} ({c.connector_type})</Text>
            <Input
              placeholder="R$/kWh"
              keyboardType="decimal-pad"
              value={prices[c.id] ?? ''}
              onChangeText={(t) => setPrices((p) => ({ ...p, [c.id]: t }))}
            />
            <Button title="Salvar tarifa" onPress={() => save(c.id)} />
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20 },
  title: { fontWeight: '800', color: colors.ink },
});
