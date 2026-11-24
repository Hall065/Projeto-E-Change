import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Screen } from '../../../src/components/ui';
import { useJourney } from '../../../src/context/JourneyContext';
import { formatBRL, formatPriceKwh } from '../../../src/lib/format';
import { getDemoSession } from '../../../src/services/demoSession';
import { useTheme } from '../../../src/theme/ThemeContext';

export default function PaymentReceiptScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = rawId ? decodeURIComponent(String(rawId)) : '';
  const { colors } = useTheme();
  const { station, session, connectorId, resetJourney } = useJourney();

  const resolved = session ?? (id ? getDemoSession(id) : null);
  const connector = (station?.connectors ?? []).find(
    (c) => c.id === (connectorId ?? resolved?.connector_id),
  );

  const energy = Number(resolved?.energy_kwh ?? 0);
  const price = Number(connector?.price_per_kwh ?? station?.min_price ?? 1.85);
  const rawTotal = resolved?.final_cost ?? resolved?.estimated_cost ?? energy * price;
  const total = Number.isFinite(Number(rawTotal)) ? Number(rawTotal) : 0;
  const minutes = Number(resolved?.elapsed_minutes ?? 0);

  const paidAt = useMemo(
    () =>
      new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [],
  );

  const nfNumber = useMemo(() => {
    const seed = String(resolved?.id ?? id ?? 'NF')
      .replace(/\W/g, '')
      .slice(-8)
      .toUpperCase();
    return `NF-ECM-${seed || '00000000'}`;
  }, [resolved?.id, id]);

  const lines = [
    { label: 'Nº da nota', value: nfNumber },
    { label: 'Data', value: paidAt },
    { label: 'Posto', value: station?.name ?? 'E-Charge Map' },
    {
      label: 'Conector',
      value: connector ? `${connector.label} · ${connector.connector_type}` : '—',
    },
    { label: 'Energia', value: `${energy.toFixed(1)} kWh` },
    { label: 'Tarifa', value: formatPriceKwh(price) },
    { label: 'Duração', value: `${minutes} min` },
    { label: 'Forma de pagamento', value: 'Pix' },
    { label: 'Status', value: 'Pago' },
  ];

  const goMap = () => {
    resetJourney();
    router.replace('/(customer)/(tabs)/map');
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad}>
          <View style={styles.hero}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✓</Text>
            </View>
            <Text style={[styles.title, { color: colors.ink }]}>Pagamento aprovado</Text>
            <Text style={[styles.sub, { color: colors.muted }]}>Nota fiscal da sua recarga</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            {lines.map((line) => (
              <View key={line.label} style={styles.row}>
                <Text style={[styles.label, { color: colors.muted }]}>{line.label}</Text>
                <Text
                  style={[
                    styles.value,
                    { color: line.label === 'Status' ? '#06C167' : colors.ink },
                  ]}
                >
                  {line.value}
                </Text>
              </View>
            ))}
            <View style={[styles.divider, { backgroundColor: colors.line }]} />
            <Text style={[styles.label, { color: colors.muted }]}>Total pago</Text>
            <Text style={[styles.total, { color: colors.ink }]}>{formatBRL(total)}</Text>
            <View style={styles.okBadge}>
              <Text style={styles.okText}>Transação concluída com sucesso</Text>
            </View>
          </View>

          <Button title="Voltar ao mapa" onPress={goMap} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 18, marginTop: 8 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: '#06C167',
  },
  badgeText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.4 },
  sub: { marginTop: 4, fontSize: 14 },
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },
  label: { fontSize: 14 },
  value: {
    fontWeight: '700',
    maxWidth: '58%',
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  total: {
    fontSize: 34,
    marginTop: 4,
    letterSpacing: -0.8,
    fontWeight: '900',
  },
  okBadge: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(6,193,103,0.12)',
  },
  okText: { color: '#06C167', fontWeight: '700' },
});
