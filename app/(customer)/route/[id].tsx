import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { MapCanvas } from '../../../src/components/MapCanvas';
import { useJourney } from '../../../src/context/JourneyContext';
import { useVehicle } from '../../../src/context/VehicleContext';
import { useDeviceLocation } from '../../../src/hooks/useDeviceLocation';
import { formatPriceKwh } from '../../../src/lib/format';
import { resolveOpsOrigin } from '../../../src/lib/opsOrigin';
import { planChargeStops } from '../../../src/services/energy';
import { describeStep, fetchDrivingAlternatives, type NavRoute } from '../../../src/services/routing';
import { isCustomDestinationId } from '../../../src/services/customDestination';
import { fetchStationById, fetchStations } from '../../../src/services/stations';
import type { StationWithMetrics } from '../../../src/types/database';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily } from '../../../src/theme/fonts';
import { elevation, radius } from '../../../src/theme/tokens';
import { Icon } from '../../../src/components/Icon';

export default function RoutePreviewScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = rawId ? decodeURIComponent(rawId) : rawId;
  const { colors, isDark } = useTheme();
  const { station, setStation, reservation, setNavRoute } = useJourney();
  const { vehicle, battery } = useVehicle();
  const { coord: rawCoord, location, ready, hasFix, refresh } = useDeviceLocation({ watch: true });
  // Origem da rota = GPS real apenas (nunca hub Sé / fallback de mapa)
  const userOrigin = useMemo(
    () =>
      hasFix
        ? { latitude: rawCoord.latitude, longitude: rawCoord.longitude }
        : null,
    [hasFix, rawCoord.latitude, rawCoord.longitude],
  );
  const ops = useMemo(
    () => resolveOpsOrigin(rawCoord, { hasFix }),
    [rawCoord.latitude, rawCoord.longitude, hasFix],
  );
  const coord = userOrigin ?? ops.coord;
  const [localStation, setLocalStation] = useState<StationWithMetrics | null>(
    station?.id === id ? station : null,
  );
  const [routes, setRoutes] = useState<NavRoute[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nearby, setNearby] = useState<StationWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchGen = useRef(0);

  // Carrega o posto UMA vez por id — NÃO depende de station?.id (evita loop setStation ↔ effect)
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setRoutes([]);
    setSelectedId(null);
    setError(null);
    setLoading(true);

    if (station?.id === id) {
      setLocalStation(station);
      return;
    }

    setLocalStation(null);
    fetchStationById(id, {
      latitude: rawCoord.latitude,
      longitude: rawCoord.longitude,
    }).then((s) => {
      if (cancelled || !s) return;
      setLocalStation(s);
      setStation(s);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à troca de posto na URL
  }, [id]);

  useEffect(() => {
    if (!localStation || !ready) return;
    if (!hasFix || !userOrigin) {
      setLoading((v) => (v ? false : v));
      return;
    }
    const gen = ++fetchGen.current;
    let cancelled = false;
    const from = { latitude: userOrigin.latitude, longitude: userOrigin.longitude };
    const dest = { latitude: localStation.latitude, longitude: localStation.longitude };
    const stationId = localStation.id;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [alts, stations] = await Promise.all([
          fetchDrivingAlternatives(from, dest),
          fetchStations(from),
        ]);
        if (cancelled || gen !== fetchGen.current) return;
        const unique = alts.map((r, i) => ({
          ...r,
          id: `route-${stationId}-${i}`,
          label: i === 0 ? 'Recomendada' : `Alternativa ${i}`,
          coordinates: Array.isArray(r.coordinates) ? r.coordinates : [from, dest],
          steps: Array.isArray(r.steps) ? r.steps : [],
        }));
        setRoutes(unique);
        setSelectedId(unique[0]?.id ?? null);
        setNearby(stations);
        if (unique[0]) setNavRoute(unique[0]);
      } catch (e: any) {
        if (!cancelled && gen === fetchGen.current) {
          setError(e?.message ?? 'Falha ao calcular rota');
          setRoutes([]);
          setSelectedId(null);
        }
      } finally {
        if (!cancelled && gen === fetchGen.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [localStation?.id, ready, hasFix]);

  const route = useMemo(
    () => routes.find((r) => r.id === selectedId) ?? routes[0] ?? null,
    [routes, selectedId],
  );

  const plan = useMemo(() => {
    if (!route || !localStation || !userOrigin) return null;
    try {
      return planChargeStops({
        vehicle,
        battery,
        route,
        stations: nearby,
        origin: userOrigin,
        destination: { latitude: localStation.latitude, longitude: localStation.longitude },
      });
    } catch {
      return null;
    }
  }, [route?.id, localStation?.id, nearby, vehicle, battery, userOrigin?.latitude, userOrigin?.longitude]);

  // Espelha a rota escolhida no contexto (só quando o id muda)
  useEffect(() => {
    if (!route) return;
    setNavRoute(route);
  }, [route?.id]);

  const first = route?.steps?.[0];
  const preview = first ? describeStep(first) : null;
  const mapStations = useMemo(() => {
    const stops = plan?.stops.map((s) => s.station) ?? [];
    return localStation ? [localStation, ...stops] : stops;
  }, [localStation, plan]);

  const altCoordinates = useMemo(
    () =>
      routes
        .filter((r) => r.id !== route?.id)
        .map((r) => r.coordinates)
        .filter((c) => c.length > 1),
    [routes, route?.id],
  );

  const onSelectRoute = (routeId: string) => {
    const next = routes.find((r) => r.id === routeId);
    if (!next || next.id === selectedId) return;
    setSelectedId(next.id);
    setNavRoute(next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MapCanvas
        stations={mapStations}
        height="100%"
        showRoute
        dark={isDark}
        routeCoordinates={route?.coordinates}
        alternativeRoutes={altCoordinates}
        userCoord={hasFix ? coord : undefined}
        userHeading={hasFix ? location.heading : null}
        focus={hasFix ? coord : undefined}
        hideUserMarker={!hasFix}
        selectedStationId={localStation?.id}
        style={{ flex: 1 }}
      />

      <Animated.View
        entering={FadeInUp.duration(360)}
        style={[styles.sheet, elevation.sheet, { backgroundColor: colors.surface, borderColor: colors.line }]}
      >
        <SafeAreaView edges={['bottom']}>
          <View style={[styles.handle, { backgroundColor: colors.line }]} />
          <Text style={[styles.title, { color: colors.ink }]}>Planejar rota</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>{localStation?.name ?? 'Destino'}</Text>
          {localStation && isCustomDestinationId(localStation.id) ? (
            <Text style={{ color: colors.muted, marginTop: 2, fontSize: 12, fontFamily: fontFamily.medium }}>
              Destino personalizado · {localStation.address}
            </Text>
          ) : null}

          {!hasFix && !routes.length ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.muted, flex: 1 }}>
                Aguardando sua localização GPS para montar a rota…
              </Text>
              <Pressable onPress={() => void refresh()}>
                <Text style={{ color: colors.primary, fontFamily: fontFamily.bold }}>Atualizar</Text>
              </Pressable>
            </View>
          ) : loading && !routes.length ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.muted }}>Calculando alternativas OSRM…</Text>
            </View>
          ) : error ? (
            <Text style={{ color: colors.danger, marginTop: 12 }}>{error}</Text>
          ) : (
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              <View style={styles.altRow}>
                {routes.map((r) => {
                  const active = r.id === route?.id;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => onSelectRoute(r.id)}
                      style={[
                        styles.altCard,
                        {
                          borderColor: active ? colors.primary : colors.line,
                          backgroundColor: active ? colors.soft : colors.bg,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.ink, fontWeight: '900' }}>{r.label ?? 'Rota'}</Text>
                      <Text style={{ color: colors.muted, marginTop: 4, fontSize: 12 }}>
                        {r.durationMin} min · {r.distanceKm} km
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.row}>
                <Metric label="distância" value={`${route?.distanceKm ?? '—'} km`} color={colors.ink} muted={colors.muted} />
                <Metric label="tempo" value={`${route?.durationMin ?? '—'} min`} color={colors.ink} muted={colors.muted} />
                <Metric
                  label="bateria"
                  value={plan ? `${plan.finalArrivalPercent.toFixed(0)}%` : '—'}
                  color={plan?.feasible ? colors.battery : colors.batteryLow}
                  muted={colors.muted}
                />
              </View>

              {plan ? (
                <View style={[styles.energyBox, { backgroundColor: colors.soft, borderColor: colors.line }]}>
                  <Text style={{ color: colors.ink, fontWeight: '800' }}>
                    {plan.feasible ? 'Viagem energeticamente viável' : 'Atenção: autonomia crítica'}
                  </Text>
                  <Text style={{ color: colors.muted, marginTop: 6, fontSize: 12 }}>{plan.message}</Text>
                  <Text style={{ color: colors.muted, marginTop: 6, fontSize: 11 }}>{plan.estimate.note}</Text>
                  {plan.stops.map((stop) => (
                    <View key={stop.station.id} style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'flex-start' }}>
                      <Icon name="flash" size={14} color={colors.battery} />
                      <Text style={{ color: colors.ink, flex: 1, fontSize: 12, fontFamily: fontFamily.bold }}>
                        {stop.station.name}: chega {stop.arrivePercent}% → sai {stop.departPercent}% (~{stop.chargeMinutes} min)
                      </Text>
                    </View>
                  ))}
                  {plan.totalChargeMinutes > 0 ? (
                    <Text style={{ color: colors.muted, marginTop: 8, fontSize: 12 }}>
                      Tempo extra de carga: {plan.totalChargeMinutes} min · {formatPriceKwh(localStation?.min_price ?? 0)}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {preview ? (
                <View style={[styles.stepBox, { backgroundColor: colors.dark }]}>
                  <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 12 }}>{preview.banner}</Text>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 4 }}>{preview.title}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{preview.road}</Text>
                </View>
              ) : null}

              <Text style={{ color: colors.muted, marginTop: 8, marginBottom: 8 }}>
                {reservation ? 'Reserva solicitada' : 'Sem reserva'} · provedor {route?.provider}
              </Text>
            </ScrollView>
          )}

          <Pressable
            disabled={loading || !route || !id || !hasFix}
            onPress={() => {
              if (route) setNavRoute(route);
              router.push(`/(customer)/navigation/${id}`);
            }}
            style={[
              styles.cta,
              { backgroundColor: colors.primary, opacity: loading || !route || !hasFix ? 0.5 : 1 },
            ]}
          >
            <Text style={styles.ctaText}>Iniciar navegação</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ color: colors.muted, fontWeight: '700' }}>Voltar</Text>
          </Pressable>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

function Metric({
  label,
  value,
  color,
  muted,
}: {
  label: string;
  value: string;
  color: string;
  muted: string;
}) {
  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '900', color }}>{value}</Text>
      <Text style={{ color: muted, fontSize: 12, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '900' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  altRow: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 8 },
  altCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 8 },
  energyBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 12,
    marginTop: 6,
  },
  stepBox: {
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },
  cta: {
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
