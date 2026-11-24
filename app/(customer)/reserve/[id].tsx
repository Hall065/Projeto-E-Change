import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, Chip, Screen } from '../../../src/components/ui';
import { Icon } from '../../../src/components/Icon';
import { useAuth } from '../../../src/context/AuthContext';
import { useJourney } from '../../../src/context/JourneyContext';
import { createReservation } from '../../../src/services/journey';
import { fetchStationById } from '../../../src/services/stations';
import { useTheme } from '../../../src/theme/ThemeContext';

const OPTIONS = [
  { label: 'Agora', minutes: 0 },
  { label: '+15 min', minutes: 15 },
  { label: '+30 min', minutes: 30 },
  { label: '+1 hora', minutes: 60 },
] as const;

export default function ReserveScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = rawId ? decodeURIComponent(String(Array.isArray(rawId) ? rawId[0] : rawId)) : '';
  const { user } = useAuth();
  const { colors } = useTheme();
  const {
    station,
    setStation,
    connectorId,
    setConnectorId,
    setReservation,
    reservation,
    setArrivalOffsetMin,
    arrivalOffsetMin,
  } = useJourney();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stationRef = useRef(station);
  const connectorIdRef = useRef(connectorId);
  stationRef.current = station;
  connectorIdRef.current = connectorId;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;

      let s = stationRef.current?.id === id ? stationRef.current : null;
      if (!s) {
        s = await fetchStationById(id);
        if (cancelled || !s) return;
        setStation(s);
      }

      const currentCid = connectorIdRef.current;
      const belongs = !!currentCid && (s.connectors ?? []).some((c) => c.id === currentCid);
      if (belongs) return;

      const next =
        (s.connectors ?? []).find((c) => c.status === 'free')?.id ??
        s.connectors?.[0]?.id ??
        null;
      if (next && next !== currentCid) {
        setConnectorId(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, setStation, setConnectorId]);

  const connector = useMemo(
    () => (station?.connectors ?? []).find((c) => c.id === connectorId) ?? null,
    [station, connectorId],
  );

  const freeConnectors = useMemo(
    () => (station?.connectors ?? []).filter((c) => c.status === 'free' || c.id === connectorId),
    [station, connectorId],
  );

  const arrivesAt = useMemo(
    () => new Date(Date.now() + arrivalOffsetMin * 60_000),
    [arrivalOffsetMin],
  );

  const arrivesLabel = arrivesAt.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const graceLabel = useMemo(() => {
    const base = reservation?.grace_until
      ? new Date(reservation.grace_until)
      : new Date(arrivesAt.getTime() + 15 * 60_000);
    return base.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, [reservation?.grace_until, arrivesAt]);

  const goRoute = () => {
    router.push(`/(customer)/route/${encodeURIComponent(id)}`);
  };

  const confirm = async () => {
    if (!station) {
      setError('Posto não encontrado. Volte e escolha novamente.');
      return;
    }
    const cid =
      connectorId ??
      (station.connectors ?? []).find((c) => c.status === 'free')?.id ??
      station.connectors?.[0]?.id;
    if (!cid) {
      setError('Nenhum conector disponível neste posto.');
      return;
    }
    setConnectorId(cid);
    setError(null);
    try {
      setLoading(true);
      const next = await createReservation({
        userId: user?.id ?? 'demo-user',
        stationId: station.id,
        connectorId: cid,
        arrivesInMinutes: arrivalOffsetMin,
      });
      setReservation(next);
      setConnectorId(cid);
      setStation({
        ...station,
        connectors: (station.connectors ?? []).map((c) =>
          c.id === cid ? { ...c, status: 'reserved' as const } : c,
        ),
        free_connectors: (station.connectors ?? []).filter(
          (c) => c.id !== cid && c.status === 'free',
        ).length,
      });
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Falha ao reservar');
    } finally {
      setLoading(false);
    }
  };

  const skip = () => {
    setReservation(null);
    goRoute();
  };

  if (done) {
    return (
      <Screen>
        <SafeAreaView style={{ flex: 1 }}>
          <LinearGradient colors={['#0B0D0A', '#121412', '#1A1F18']} style={styles.successHero}>
            <View style={styles.badge}>
              <Icon name="checkmark" size={28} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Reserva confirmada</Text>
            <Text style={styles.successSub}>Conector garantido até você chegar</Text>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.pad}>
            <Card>
              <Text style={[styles.name, { color: colors.ink }]}>{station?.name ?? 'Posto'}</Text>
              <View style={styles.row}>
                <Text style={[styles.meta, { color: colors.muted }]}>Chegada</Text>
                <Text style={[styles.value, { color: colors.ink }]}>{arrivesLabel}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.meta, { color: colors.muted }]}>Tolerância até</Text>
                <Text style={[styles.value, { color: colors.ink }]}>{graceLabel}</Text>
              </View>
              {connector ? (
                <View style={styles.row}>
                  <Text style={[styles.meta, { color: colors.muted }]}>Conector</Text>
                  <Text style={[styles.value, { color: colors.ink }]}>
                    {connector.label} · {connector.connector_type}
                  </Text>
                </View>
              ) : null}
              <View style={styles.okPill}>
                <Text style={styles.okPillText}>Tudo certo · status confirmado</Text>
              </View>
            </Card>

            <Button title="Ver rota" onPress={goRoute} />
            <Button title="Voltar ao mapa" ghost onPress={() => router.replace('/(customer)/(tabs)/map')} />
          </ScrollView>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={['#0B0D0A', '#151815']} style={styles.hero}>
          <Text style={styles.heroEyebrow}>E-Charge Map</Text>
          <Text style={styles.heroTitle}>Reservar esta vaga?</Text>
          <Text style={styles.heroSub}>Garanta um conector antes de chegar.</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.pad}>
          <Card>
            <Text style={[styles.name, { color: colors.ink }]}>
              {station?.name ?? 'Carregando posto…'}
            </Text>
            <Text style={[styles.meta, { color: colors.muted }]}>Escolha a janela de chegada</Text>
            <Text style={[styles.time, { color: colors.ink }]}>{arrivesLabel}</Text>
            {connector ? (
              <Text style={[styles.conn, { color: colors.muted }]}>
                Conector: {connector.label} · {connector.connector_type} · {connector.max_power_kw} kW
              </Text>
            ) : null}
          </Card>

          <View style={styles.chips}>
            {OPTIONS.map((o) => (
              <Chip
                key={o.label}
                label={o.label}
                active={arrivalOffsetMin === o.minutes}
                onPress={() => setArrivalOffsetMin(o.minutes)}
              />
            ))}
          </View>

          {freeConnectors.length > 1 ? (
            <View style={styles.connBlock}>
              <Text style={[styles.meta, { color: colors.muted }]}>Conector</Text>
              <View style={styles.chips}>
                {freeConnectors.map((c) => (
                  <Chip
                    key={c.id}
                    label={`${c.label} · ${c.connector_type}`}
                    active={connectorId === c.id}
                    onPress={() => setConnectorId(c.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <Text style={[styles.note, { color: colors.muted }]}>
            A reserva segura um conector compatível por um período de tolerância. A disponibilidade é
            confirmada pela estação.
          </Text>

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <Button title="Confirmar reserva" onPress={confirm} loading={loading} disabled={!station} />
          <Button title="Continuar sem reserva" ghost onPress={skip} disabled={loading} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 8,
    letterSpacing: -0.6,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  successHero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#06C167',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  successSub: {
    color: 'rgba(255,255,255,0.65)',
    marginTop: 6,
    fontSize: 14,
  },
  pad: { padding: 20, paddingBottom: 40 },
  name: { fontSize: 16, fontWeight: '800' },
  meta: { marginTop: 4, fontSize: 13 },
  time: { marginTop: 10, fontSize: 22, fontWeight: '800' },
  conn: { marginTop: 10, fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, gap: 4 },
  connBlock: { marginTop: 4 },
  note: { lineHeight: 20, marginTop: 12, marginBottom: 12, fontSize: 13 },
  error: { marginBottom: 8, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  value: { fontWeight: '700', maxWidth: '58%', textAlign: 'right' },
  okPill: {
    marginTop: 16,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(6,193,103,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  okPillText: { color: '#06C167', fontWeight: '800', fontSize: 13 },
});
