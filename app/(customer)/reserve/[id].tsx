import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Chip, Screen, Subtitle, Title } from '../../../src/components/ui';
import { useAuth } from '../../../src/context/AuthContext';
import { useJourney } from '../../../src/context/JourneyContext';
import { createReservation } from '../../../src/services/journey';
import { colors } from '../../../src/theme/colors';

const OPTIONS = [
  { label: 'Now', minutes: 0 },
  { label: '+15 min', minutes: 15 },
  { label: '+30 min', minutes: 30 },
  { label: '+1 hour', minutes: 60 },
];

export default function ReserveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { station, connectorId, setReservation, setArrivalOffsetMin, arrivalOffsetMin } = useJourney();
  const [loading, setLoading] = useState(false);
  const arrivesAt = new Date(Date.now() + arrivalOffsetMin * 60_000);

  const confirm = async () => {
    if (!user) {
      Alert.alert('Login necessário', 'Entre para reservar um conector.', [
        { text: 'Login', onPress: () => router.push('/(auth)/login') },
        { text: 'Cancelar', style: 'cancel' },
      ]);
      return;
    }
    if (!station || !connectorId) {
      Alert.alert('Sem conector', 'Volte e selecione um posto com conector livre.');
      return;
    }
    try {
      setLoading(true);
      const reservation = await createReservation({
        userId: user.id,
        stationId: station.id,
        connectorId,
        arrivesInMinutes: arrivalOffsetMin,
      });
      setReservation(reservation);
      router.push(`/(customer)/route/${id}`);
    } catch (e: any) {
      Alert.alert('Reserva', e.message ?? 'Falha ao reservar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Title>Reserve this spot?</Title>
          <Subtitle>Secure a connector before you arrive.</Subtitle>
          <Card>
            <Text style={styles.name}>{station?.name ?? 'Station'}</Text>
            <Text style={styles.meta}>Choose your arrival window</Text>
            <Text style={styles.time}>{arrivesAt.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</Text>
          </Card>
          <View style={styles.chips}>
            {OPTIONS.map((o) => (
              <Chip key={o.label} label={o.label} active={arrivalOffsetMin === o.minutes} onPress={() => setArrivalOffsetMin(o.minutes)} />
            ))}
          </View>
          <Text style={styles.note}>A reserva segura um conector compatível por um período de tolerância. A disponibilidade é confirmada pela estação.</Text>
          <Button title="Confirm Reservation" onPress={confirm} loading={loading} />
          <Button title="Continue without reservation" ghost onPress={() => {
            setReservation(null);
            router.push(`/(customer)/route/${id}`);
          }} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  name: { fontSize: 15, fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
  time: { marginTop: 10, fontSize: 20, fontWeight: '800', color: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 },
  note: { color: colors.muted, lineHeight: 20, marginTop: 8, marginBottom: 8 },
});
