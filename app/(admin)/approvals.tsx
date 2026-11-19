import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Button, Card, Screen } from '../../src/components/ui';
import { fetchAllStationsAdmin, updateStationStatus } from '../../src/services/stations';
import { colors } from '../../src/theme/colors';

export default function AdminApprovals() {
  const [pending, setPending] = useState<any[]>([]);
  const load = () => fetchAllStationsAdmin().then((all) => setPending(all.filter((s: any) => s.status === 'pending')));
  useEffect(() => { load(); }, []);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Approvals' }} />
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.sub}>Aprovar novos postos cadastrados por donos (RF-06 / perfil ADM).</Text>
        {pending.map((s) => (
          <Card key={s.id}>
            <Text style={styles.title}>{s.name}</Text>
            <Text style={styles.meta}>{s.address}</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Button title="Approve" onPress={async () => { await updateStationStatus(s.id, 'active'); load(); }} />
              </View>
              <View style={{ width: 8 }} />
              <View style={{ flex: 1 }}>
                <Button title="Reject" ghost onPress={async () => { await updateStationStatus(s.id, 'inactive'); load(); }} />
              </View>
            </View>
          </Card>
        ))}
        {!pending.length && <Text style={styles.meta}>Nenhuma aprovação pendente.</Text>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20 },
  sub: { color: colors.muted, marginBottom: 8 },
  title: { fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
  row: { flexDirection: 'row', marginTop: 4 },
});
