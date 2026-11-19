import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Button, Card, Screen } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import type { ConnectorStatus } from '../../src/types/database';
import { colors } from '../../src/theme/colors';

export default function OwnerConnectors() {
  const [connectors, setConnectors] = useState<any[]>([]);
  const load = () => supabase.from('connectors').select('*, stations(name)').then(({ data }) => setConnectors(data ?? []));
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: ConnectorStatus) => {
    await supabase.from('connectors').update({ status }).eq('id', id);
    load();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Conectores' }} />
      <ScrollView contentContainerStyle={styles.pad}>
        {connectors.map((c) => (
          <Card key={c.id}>
            <Text style={styles.title}>{c.stations?.name} · #{c.label}</Text>
            <Text style={styles.meta}>{c.connector_type} · {c.max_power_kw} kW · {c.status}</Text>
            <View style={styles.row}>
              {(['free', 'occupied', 'maintenance'] as ConnectorStatus[]).map((status) => (
                <View key={status} style={{ flex: 1, marginRight: 6 }}>
                  <Button title={status} ghost={c.status !== status} onPress={() => setStatus(c.id, status)} />
                </View>
              ))}
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20 },
  title: { fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
  row: { flexDirection: 'row', marginTop: 6 },
});
