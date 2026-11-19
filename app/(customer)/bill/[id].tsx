import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Card, Screen, Subtitle, Title } from '../../../src/components/ui';
import { useJourney } from '../../../src/context/JourneyContext';
import { formatBRL, formatPriceKwh } from '../../../src/lib/format';
import { colors } from '../../../src/theme/colors';

export default function BillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { station, session, connectorId } = useJourney();
  const connector = (station?.connectors ?? []).find((c) => c.id === (connectorId ?? session?.connector_id));
  const energy = Number(session?.energy_kwh ?? 32.5);
  const price = Number(connector?.price_per_kwh ?? station?.min_price ?? 1.85);
  const total = Number(session?.final_cost ?? session?.estimated_cost ?? energy * price);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1, padding: 20 }}>
        <Title>Charging Session Completed!</Title>
        <Subtitle>Your final charging summary.</Subtitle>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Card>
            <Text style={styles.label}>Energy consumed</Text>
            <Text style={styles.big}>{energy.toFixed(1)} kWh</Text>
            <Text style={styles.meta}>{formatPriceKwh(price)}</Text>
            <View style={styles.divider} />
            <Text style={styles.label}>Total</Text>
            <Text style={styles.total}>{formatBRL(total)}</Text>
            <View style={styles.pixBadge}>
              <Text style={styles.pixText}>◉  Pix</Text>
            </View>
          </Card>
        </Animated.View>
        <Button title="Pay Now" onPress={() => router.push(`/(customer)/payment/${session?.id ?? id}`)} />
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  big: { fontSize: 32, fontWeight: '900', color: colors.ink, marginTop: 6 },
  meta: { color: colors.muted, marginTop: 6 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 14 },
  total: { fontSize: 36, fontWeight: '900', color: colors.primary, marginTop: 4 },
  pixBadge: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: colors.ghost,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pixText: { color: colors.primary, fontWeight: '800' },
});
