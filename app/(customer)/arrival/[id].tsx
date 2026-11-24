import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Icon } from '../../../src/components/Icon';
import { Button, Screen } from '../../../src/components/ui';
import { useAuth } from '../../../src/context/AuthContext';
import { useJourney } from '../../../src/context/JourneyContext';
import { useVehicle } from '../../../src/context/VehicleContext';
import { formatPriceKwh } from '../../../src/lib/format';
import { ensureDemoConnectors } from '../../../src/services/demoSession';
import { startSession } from '../../../src/services/journey';
import { fetchStationById } from '../../../src/services/stations';
import type { Connector, StationWithMetrics } from '../../../src/types/database';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily } from '../../../src/theme/fonts';
import { elevation, radius } from '../../../src/theme/tokens';

function statusLabel(status: Connector['status']) {
  switch (status) {
    case 'free':
      return 'Livre';
    case 'reserved':
      return 'Reservado';
    case 'occupied':
      return 'Ocupado';
    case 'offline':
      return 'Offline';
    default:
      return status;
  }
}

export default function ArrivalScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = rawId ? decodeURIComponent(rawId) : rawId;
  const { colors } = useTheme();
  const { user, demoSignIn } = useAuth();
  const { vehicle, battery } = useVehicle();
  const { station, setStation, connectorId, reservation, setSession, setConnectorId } = useJourney();

  const reservedConnectorId =
    reservation && reservation.station_id === id
      ? reservation.connector_id
      : reservation && station?.id === id
        ? reservation.connector_id
        : null;
  const hasReservation = Boolean(reservedConnectorId || (reservation && connectorId));
  const lockedConnectorId = reservedConnectorId ?? (hasReservation ? connectorId : null);

  const applyReservationStatus = (s: StationWithMetrics): StationWithMetrics => {
    const cid = lockedConnectorId;
    if (!cid) return s;
    const connectors = (s.connectors ?? []).map((c) =>
      c.id === cid ? { ...c, status: 'reserved' as const } : c,
    );
    return {
      ...s,
      connectors,
      free_connectors: connectors.filter((c) => c.status === 'free').length,
    };
  };

  const [localStation, setLocalStation] = useState<StationWithMetrics | null>(
    station?.id === id ? applyReservationStatus(ensureDemoConnectors(station)) : null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(lockedConnectorId ?? connectorId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        const base =
          station?.id === id ? station : await fetchStationById(id);
        if (cancelled || !base) return;
        const enriched = applyReservationStatus(ensureDemoConnectors(base));
        setLocalStation(enriched);
        // Só sincroniza a jornada se mudou o posto / status dos conectores
        if (station?.id !== enriched.id || station?.free_connectors !== enriched.free_connectors) {
          setStation(enriched);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Não foi possível carregar o posto');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evita loop com setStation(enriched)
  }, [id, lockedConnectorId]);

  // Com reserva: força a vaga reservada. Sem reserva: usuário escolhe.
  useEffect(() => {
    if (lockedConnectorId) {
      setSelectedId(lockedConnectorId);
      if (connectorId !== lockedConnectorId) setConnectorId(lockedConnectorId);
      return;
    }
    if (!selectedId && connectorId) setSelectedId(connectorId);
  }, [lockedConnectorId, connectorId, selectedId, setConnectorId]);

  const connectors = localStation?.connectors ?? [];
  const selected = lockedConnectorId
    ? connectors.find((c) => c.id === lockedConnectorId) ??
      connectors.find((c) => c.id === selectedId) ??
      null
    : connectors.find((c) => c.id === selectedId) ??
      connectors.find((c) => c.status === 'free') ??
      connectors[0] ??
      null;

  useEffect(() => {
    if (!lockedConnectorId && selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected?.id, lockedConnectorId]);

  const compatible = useMemo(() => {
    if (!selected) return true;
    return vehicle.connectors.includes(selected.connector_type);
  }, [selected, vehicle.connectors]);

  const start = async (forceDemo = false) => {
    setError(null);
    if (!localStation || !selected) {
      setError('Nenhum conector disponível neste ponto.');
      return;
    }
    try {
      setLoading(true);
      let userId = user?.id;
      if (!userId) {
        if (forceDemo) {
          try {
            await demoSignIn('customer');
          } catch {
            /* demo local não depende do Auth remoto */
          }
          userId = user?.id ?? 'demo-customer';
        } else {
          setError('Entre na conta para autorizar a recarga, ou use o modo demo.');
          setLoading(false);
          return;
        }
      }
      setConnectorId(selected.id);
      const session = await startSession({
        userId: userId!,
        stationId: localStation.id,
        connectorId: selected.id,
        reservationId: reservation?.id,
        pricePerKwh: Number(selected.price_per_kwh),
        powerKw: Number(selected.max_power_kw),
      });
      setSession(session);
      router.push(`/(customer)/session/${session.id}`);
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível iniciar a recarga');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={{ backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(380)}>
            <View style={styles.heroRow}>
              <View style={[styles.check, { backgroundColor: '#06C167' }]}>
                <Icon name="checkmark" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.kicker, { color: colors.muted }]}>CHEGADA</Text>
                <Text style={[styles.title, { color: colors.ink, fontFamily: fontFamily.extrabold }]}>
                  Você chegou
                </Text>
                <Text style={[styles.sub, { color: colors.muted, fontFamily: fontFamily.medium }]}>
                  {localStation?.name ?? 'Carregando posto…'}
                </Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(80).duration(400)} style={[styles.card, elevation.soft, { backgroundColor: colors.surface }]}>
            <Text style={[styles.ready, { color: colors.ink, fontFamily: fontFamily.extrabold }]}>
              Pronto para carregar
            </Text>
            <Text style={[styles.meta, { color: colors.muted }]}>
              {localStation?.address || 'Conecte o veículo no conector escolhido'}
            </Text>
            <View style={styles.pillRow}>
              <View style={[styles.pill, { backgroundColor: colors.soft }]}>
                <Icon name="battery-half" size={14} color={colors.ink} />
                <Text style={{ color: colors.ink, fontFamily: fontFamily.bold, fontSize: 12 }}>
                  Bateria {battery.percent.toFixed(0)}%
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: colors.soft }]}>
                <Icon name="car-sport" size={14} color={colors.ink} />
                <Text style={{ color: colors.ink, fontFamily: fontFamily.bold, fontSize: 12 }}>
                  {vehicle.name}
                </Text>
              </View>
            </View>
          </Animated.View>

          <Text style={[styles.section, { color: colors.ink, fontFamily: fontFamily.bold }]}>
            {lockedConnectorId ? 'Sua vaga reservada' : 'Escolha o conector'}
          </Text>

          {lockedConnectorId && selected ? (
            <View
              style={[
                styles.connector,
                elevation.soft,
                { backgroundColor: colors.surface, borderColor: '#06C167' },
              ]}
            >
              <View style={[styles.connIcon, { backgroundColor: '#06C167' }]}>
                <Icon name="flash" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink, fontFamily: fontFamily.bold }}>
                  {selected.label} · {selected.connector_type}
                </Text>
                <Text style={{ color: colors.muted, marginTop: 2, fontSize: 12 }}>
                  {selected.max_power_kw} kW · {formatPriceKwh(selected.price_per_kwh)} · Reservado pra você
                </Text>
              </View>
              <Icon name="checkmark-circle" size={22} color="#06C167" />
            </View>
          ) : connectors.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.muted }}>Carregando conectores…</Text>
            </View>
          ) : (
            connectors.map((c) => {
              const active = selected?.id === c.id;
              const busy = c.status === 'occupied' || c.status === 'offline' || c.status === 'reserved';
              return (
                <Pressable
                  key={c.id}
                  disabled={busy}
                  onPress={() => {
                    setSelectedId(c.id);
                    setConnectorId(c.id);
                  }}
                  style={[
                    styles.connector,
                    elevation.soft,
                    {
                      backgroundColor: colors.surface,
                      borderColor: active ? colors.ink : colors.line,
                      opacity: busy ? 0.5 : 1,
                    },
                  ]}
                >
                  <View style={[styles.connIcon, { backgroundColor: active ? colors.primary : colors.soft }]}>
                    <Icon name="flash" size={18} color={active ? colors.onPrimary : colors.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontFamily: fontFamily.bold }}>
                      {c.label} · {c.connector_type}
                    </Text>
                    <Text style={{ color: colors.muted, marginTop: 2, fontSize: 12 }}>
                      {c.max_power_kw} kW · {formatPriceKwh(c.price_per_kwh)} · {statusLabel(c.status)}
                    </Text>
                  </View>
                  {active ? <Icon name="checkmark-circle" size={22} color="#06C167" /> : null}
                </Pressable>
              );
            })
          )}

          {!compatible && selected ? (
            <Text style={[styles.warn, { color: colors.danger }]}>
              Este conector ({selected.connector_type}) pode não ser compatível com o {vehicle.name}.
            </Text>
          ) : null}

          <View style={styles.stats}>
            <View style={[styles.stat, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Energia</Text>
              <Text style={[styles.statValue, { color: colors.ink, fontFamily: fontFamily.extrabold }]}>0 kWh</Text>
            </View>
            <View style={[styles.stat, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Potência</Text>
              <Text style={[styles.statValue, { color: colors.ink, fontFamily: fontFamily.extrabold }]}>
                {selected?.max_power_kw ?? 0} kW
              </Text>
            </View>
            <View style={[styles.stat, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Tempo</Text>
              <Text style={[styles.statValue, { color: colors.ink, fontFamily: fontFamily.extrabold }]}>0 min</Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle" size={16} color="#fff" />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => setError(null)}>
                <Icon name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          ) : null}

          <Button
            title="Iniciar carregamento"
            onPress={() => void start(false)}
            loading={loading}
            disabled={!selected || loading}
          />
          <Text style={[styles.note, { color: colors.muted }]}>
            A autorização usa sua conta. Em demo local o fluxo funciona sem backend.
          </Text>
          <Button
            title="Iniciar em modo demo"
            ghost
            onPress={() => void start(true)}
            loading={loading}
            disabled={!selected || loading}
          />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 48, gap: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  check: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 28, letterSpacing: -0.6, marginTop: 2 },
  sub: { fontSize: 14, marginTop: 2 },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  ready: { fontSize: 18 },
  meta: { marginTop: 6, fontSize: 13, lineHeight: 18 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  section: { marginTop: 10, marginBottom: 2, fontSize: 15 },
  connector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
  },
  connIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warn: { fontSize: 12, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 6 },
  stat: {
    flex: 1,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  statLabel: { fontSize: 11, fontWeight: '600' },
  statValue: { fontSize: 16, marginTop: 4 },
  note: { fontSize: 12, marginTop: 4, marginBottom: 2 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#C04545',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { color: '#fff', flex: 1, fontSize: 12, fontWeight: '600' },
});
