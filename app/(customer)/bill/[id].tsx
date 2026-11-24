import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Screen } from '../../../src/components/ui';
import { Icon } from '../../../src/components/Icon';
import { useJourney } from '../../../src/context/JourneyContext';
import { formatBRL, formatPriceKwh } from '../../../src/lib/format';
import { getDemoSession } from '../../../src/services/demoSession';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily } from '../../../src/theme/fonts';
import { elevation, radius } from '../../../src/theme/tokens';

export default function BillScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = rawId ? decodeURIComponent(rawId) : rawId;
  const { colors } = useTheme();
  const { station, session, connectorId } = useJourney();

  const resolved = session ?? (id ? getDemoSession(id) : null);
  const connector = (station?.connectors ?? []).find((c) => c.id === (connectorId ?? resolved?.connector_id));
  const energy = Number(resolved?.energy_kwh ?? 0);
  const price = Number(connector?.price_per_kwh ?? station?.min_price ?? 1.85);
  const total = Number(resolved?.final_cost ?? resolved?.estimated_cost ?? energy * price);
  const minutes = Number(resolved?.elapsed_minutes ?? 0);

  const lines = useMemo(
    () => [
      { label: 'Posto', value: station?.name ?? '—' },
      { label: 'Conector', value: connector ? `${connector.label} · ${connector.connector_type}` : '—' },
      { label: 'Energia', value: `${energy.toFixed(1)} kWh` },
      { label: 'Tarifa', value: formatPriceKwh(price) },
      { label: 'Duração', value: `${minutes} min` },
    ],
    [station?.name, connector, energy, price, minutes],
  );

  return (
    <Screen style={{ backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1, padding: 20 }}>
        <View style={styles.hero}>
          <View style={[styles.badge, { backgroundColor: '#06C167' }]}>
            <Icon name="checkmark" size={22} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.ink, fontFamily: fontFamily.extrabold }]}>
            Recarga concluída
          </Text>
          <Text style={[styles.sub, { color: colors.muted, fontFamily: fontFamily.medium }]}>
            Resumo da sessão e pagamento
          </Text>
        </View>

        <Animated.View
          entering={FadeInDown.duration(400)}
          style={[styles.card, elevation.soft, { backgroundColor: colors.surface }]}
        >
          {lines.map((line) => (
            <View key={line.label} style={styles.row}>
              <Text style={{ color: colors.muted, fontFamily: fontFamily.medium }}>{line.label}</Text>
              <Text style={{ color: colors.ink, fontFamily: fontFamily.bold }}>{line.value}</Text>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <Text style={{ color: colors.muted, fontFamily: fontFamily.medium }}>Total</Text>
          <Text style={[styles.total, { color: colors.ink, fontFamily: fontFamily.extrabold }]}>
            {formatBRL(total)}
          </Text>
          <View style={[styles.pixBadge, { backgroundColor: colors.soft }]}>
            <Icon name="qr-code" size={16} color={colors.ink} />
            <Text style={{ color: colors.ink, fontFamily: fontFamily.bold }}>Pronto para finalizar</Text>
          </View>
        </Animated.View>

        <Button
          title="Finalizar e ver nota fiscal"
          onPress={() => router.push(`/(customer)/payment/${encodeURIComponent(String(resolved?.id ?? id))}`)}
        />
        <Button
          title="Voltar ao mapa"
          ghost
          onPress={() => router.replace('/(customer)/(tabs)/map')}
        />
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: 18, marginTop: 8 },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 26, letterSpacing: -0.4 },
  sub: { marginTop: 4, fontSize: 14 },
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  total: { fontSize: 34, marginTop: 4, letterSpacing: -0.8 },
  pixBadge: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
