import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Button, Card, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { getConnectorsForOwner, patchConnectorStatus } from '../../src/lib/localCatalog';
import type { Connector, ConnectorStatus } from '../../src/types/database';
import { colors } from '../../src/theme/colors';

type Row = Connector & { stations?: { name: string } };

export default function OwnerConnectors() {
  const { user } = useAuth();
  const [connectors, setConnectors] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setConnectors(await getConnectorsForOwner(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const setStatus = async (id: string, status: ConnectorStatus) => {
    await patchConnectorStatus(id, status);
    load();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Conectores' }} />
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        {connectors.map((c) => (
          <Card key={c.id}>
            <Text style={styles.title}>
              {c.stations?.name} · #{c.label}
            </Text>
            <Text style={styles.meta}>
              {c.connector_type} · {c.max_power_kw} kW · {c.status}
            </Text>
            <View style={styles.row}>
              {(['free', 'occupied', 'maintenance'] as ConnectorStatus[]).map((status) => (
                <View key={status} style={{ flex: 1, marginRight: 6 }}>
                  <Button title={status} ghost={c.status !== status} onPress={() => setStatus(c.id, status)} />
                </View>
              ))}
            </View>
          </Card>
        ))}
        {!connectors.length && (
          <Text style={styles.meta}>Nenhum conector nos seus postos ainda.</Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  title: { fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
  row: { flexDirection: 'row', marginTop: 6 },
});
