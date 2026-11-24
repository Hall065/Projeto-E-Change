import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Button, Card, Input, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { getConnectorsForOwner, patchConnectorPrice } from '../../src/lib/localCatalog';
import type { Connector } from '../../src/types/database';
import { colors } from '../../src/theme/colors';

type Row = Connector & { stations?: { name: string } };

export default function OwnerPricing() {
  const { user } = useAuth();
  const [connectors, setConnectors] = useState<Row[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getConnectorsForOwner(user.id);
      setConnectors(data);
      const map: Record<string, string> = {};
      data.forEach((c) => {
        map[c.id] = String(c.price_per_kwh);
      });
      setPrices(map);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async (id: string) => {
    const value = Number(String(prices[id]).replace(',', '.'));
    if (!value || value <= 0) {
      Alert.alert('Tarifa inválida');
      return;
    }
    await patchConnectorPrice(id, value);
    Alert.alert('Salvo', 'Tarifa atualizada');
    load();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Tarifas' }} />
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        {connectors.map((c) => (
          <Card key={c.id}>
            <Text style={styles.title}>
              {c.stations?.name} · #{c.label} ({c.connector_type})
            </Text>
            <Input
              placeholder="R$/kWh"
              keyboardType="decimal-pad"
              value={prices[c.id] ?? ''}
              onChangeText={(t) => setPrices((p) => ({ ...p, [c.id]: t }))}
            />
            <Button title="Salvar tarifa" onPress={() => save(c.id)} />
          </Card>
        ))}
        {!connectors.length && <Text style={styles.meta}>Nenhum conector para precificar.</Text>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  title: { fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
});
