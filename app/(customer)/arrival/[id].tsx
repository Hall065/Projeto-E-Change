import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Screen, Stat, Subtitle, Title } from '../../../src/components/ui';
import { useAuth } from '../../../src/context/AuthContext';
import { useJourney } from '../../../src/context/JourneyContext';
import { startSession } from '../../../src/services/journey';
import { colors } from '../../../src/theme/colors';

export default function ArrivalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { station, connectorId, reservation, setSession, setConnectorId } = useJourney();
  const [loading, setLoading] = useState(false);
  const connector = (station?.connectors ?? []).find((c) => c.id === connectorId) ?? (station?.connectors ?? []).find((c) => c.status === 'free' || c.status === 'reserved');

  const start = async () => {
    if (!user || !station || !connector) {
      Alert.alert('Login necessário', 'Entre para iniciar a recarga.', [
        { text: 'Login', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    try {
      setLoading(true);
      setConnectorId(connector.id);
      const session = await startSession({
        userId: user.id,
        stationId: station.id,
        connectorId: connector.id,
        reservationId: reservation?.id,
        pricePerKwh: Number(connector.price_per_kwh),
      });
      setSession(session);
      router.push(`/(customer)/session/${session.id}`);
    } catch (e: any) {
      Alert.alert('Charging', e.message ?? 'Não foi possível iniciar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Title>You have arrived</Title>
          <Subtitle>{station?.name ?? 'Station'}</Subtitle>
          <Card style={{ alignItems: 'center' }}>
            <Text style={styles.bolt}>⚡</Text>
            <Text style={styles.big}>Ready to charge</Text>
            <Text style={styles.meta}>Connector #{connector?.label ?? '—'} · {connector?.connector_type ?? '—'} · {connector?.max_power_kw ?? '—'} kW · {connector?.status ?? '—'}</Text>
          </Card>
          <View style={styles.stats}>
            <Stat label="Energy" value="0 kWh" />
            <Stat label="Power" value={`${connector?.max_power_kw ?? 0} kW`} />
            <Stat label="Elapsed" value="0 min" />
          </View>
          <Button title="Start charging" onPress={start} loading={loading} />
          <Text style={styles.note}>Starting requires station authorization and a valid payment method.</Text>
          <Button title="Skip demo start" ghost onPress={() => router.push(`/(customer)/session/${id}`)} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  bolt: { fontSize: 40, color: colors.primary },
  big: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 8 },
  meta: { color: colors.muted, marginTop: 6, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 10, marginTop: 14 },
  note: { color: colors.muted, fontSize: 12, marginTop: 8 },
});
