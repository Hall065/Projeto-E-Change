import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Button, Card, Screen } from '../../src/components/ui';
import { fetchAllStationsAdmin, updateStationStatus } from '../../src/services/stations';
import { colors } from '../../src/theme/colors';

export default function AdminStations() {
  const [stations, setStations] = useState<any[]>([]);

  const load = () => fetchAllStationsAdmin().then(setStations).catch(console.error);
  useEffect(() => { load(); }, []);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Stations' }} />
      <ScrollView contentContainerStyle={styles.pad}>
        {stations.map((s) => (
          <Card key={s.id}>
            <Text style={styles.title}>{s.name}</Text>
            <Text style={styles.meta}>{s.address} · {s.city}/{s.state}</Text>
            <Text style={styles.meta}>Status: {s.status} · Conectores: {s.connectors?.length ?? 0}</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Button title="Activate" onPress={async () => { await updateStationStatus(s.id, 'active'); load(); }} />
              </View>
              <View style={{ width: 8 }} />
              <View style={{ flex: 1 }}>
                <Button title="Maintenance" ghost onPress={async () => { await updateStationStatus(s.id, 'maintenance'); load(); }} />
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  title: { fontWeight: '800', fontSize: 16, color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
  row: { flexDirection: 'row', marginTop: 4 },
});
