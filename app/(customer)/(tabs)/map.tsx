import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BatteryBadge } from '../../../src/components/BatteryBadge';
import { FloatingSearchBar } from '../../../src/components/FloatingSearchBar';
import { Icon } from '../../../src/components/Icon';
import { LoadingBlock } from '../../../src/components/LoadingScreen';
import { MapCanvas, type MapCanvasHandle } from '../../../src/components/MapCanvas';
import { FavoriteButton } from '../../../src/components/FavoriteButton';
import { StationCard } from '../../../src/components/StationCard';
import { useJourney } from '../../../src/context/JourneyContext';
import { useVehicle } from '../../../src/context/VehicleContext';
import { useDeviceLocation } from '../../../src/hooks/useDeviceLocation';
import { resolveOpsOrigin } from '../../../src/lib/opsOrigin';
import { estimateRouteEnergy } from '../../../src/services/energy';
import { fetchStations } from '../../../src/services/stations';
import type { StationWithMetrics } from '../../../src/types/database';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily } from '../../../src/theme/fonts';
import { elevation, radius, spacing } from '../../../src/theme/tokens';

type PowerFilter = 'all' | 'fast' | 'compat';

export default function MapScreen() {
  const { colors, isDark, toggle } = useTheme();
  const { setStation, setConnectorId } = useJourney();
  const { vehicle, battery, setBatteryPercent } = useVehicle();
  const mapRef = useRef<MapCanvasHandle>(null);
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const { coord: rawCoord, ready, error, refresh, location, hasFix, isFallback } = useDeviceLocation({
    watch: true,
    distanceInterval: 12,
  });

  const ops = useMemo(
    () => resolveOpsOrigin(rawCoord, { hasFix, isFallback }),
    [rawCoord.latitude, rawCoord.longitude, hasFix, isFallback],
  );
  const coord = ops.coord;

  const [stations, setStations] = useState<StationWithMetrics[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<PowerFilter>('all');
  const stationsBooted = useRef(false);
  const coordRef = useRef(rawCoord);
  coordRef.current = rawCoord;

  const load = useCallback(async (opts?: { forceGps?: boolean }) => {
    // Postos com coordenada atual (demo/SENAI = instantâneo) — não espera GPS
    const originNow = {
      latitude: coordRef.current.latitude,
      longitude: coordRef.current.longitude,
    };
    try {
      if (!stationsBooted.current) setLoading(true);
      setStations(await fetchStations(originNow));
      stationsBooted.current = true;
    } finally {
      setLoading(false);
    }

    if (opts?.forceGps === false) return;
    try {
      const origin = await refresh();
      setStations(
        await fetchStations({ latitude: origin.latitude, longitude: origin.longitude }),
      );
    } catch {
      /* mantém lista já exibida */
    }
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void load({ forceGps: !stationsBooted.current });
    }, [load]),
  );

  const filtered = useMemo(() => {
    let list = [...stations];
    if (filter === 'fast') list = list.filter((s) => s.max_power_kw >= 100);
    if (filter === 'compat') {
      list = list.filter((s) =>
        (s.connectors ?? []).some((c) => vehicle.connectors.includes(c.connector_type)),
      );
    }
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((s) => `${s.name} ${s.address} ${s.city}`.toLowerCase().includes(q));
    return list;
  }, [stations, filter, query, vehicle.connectors]);

  const selected = useMemo(
    () => filtered.find((s) => s.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const energyHint = useMemo(() => {
    if (!selected) return null;
    return estimateRouteEnergy(vehicle, battery, selected.distance_km ?? 0);
  }, [selected, vehicle, battery]);

  const openStation = (s: StationWithMetrics) => {
    try {
      setStation(s);
      router.push(`/(customer)/station/${encodeURIComponent(s.id)}`);
    } catch (e) {
      console.warn('[map] openStation failed', e);
    }
  };

  const startRoute = (s: StationWithMetrics) => {
    try {
      setStation(s);
      const free = (s.connectors ?? []).find((c) => c.status === 'free');
      setConnectorId(free?.id ?? s.connectors?.[0]?.id ?? null);
      router.push(`/(customer)/reserve/${encodeURIComponent(s.id)}`);
    } catch (e) {
      console.warn('[map] startRoute failed', e);
    }
  };

  const onRecenter = async () => {
    const next = await refresh();
    mapRef.current?.recenter({
      latitude: next.latitude,
      longitude: next.longitude,
      heading: location.heading,
      tilt: false,
    });
  };

  // Assim que o GPS real chega, centraliza (não fica na Sé)
  useEffect(() => {
    if (!hasFix) return;
    mapRef.current?.recenter({
      latitude: rawCoord.latitude,
      longitude: rawCoord.longitude,
      heading: location.heading,
      tilt: false,
    });
  }, [hasFix]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <MapCanvas
        ref={mapRef}
        stations={filtered}
        height="100%"
        showPrices
        dark={isDark}
        userCoord={hasFix ? rawCoord : undefined}
        userHeading={hasFix ? location.heading : null}
        focus={hasFix ? rawCoord : undefined}
        hideUserMarker={!hasFix}
        selectedStationId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none">
        <View style={[styles.topRow, desktop && { maxWidth: 560 }]}>
          <Pressable
            onPress={() => router.push('/(customer)/(tabs)/profile')}
            style={[styles.roundBtn, elevation.float, { backgroundColor: colors.surface }]}
          >
            <Icon name="menu" size={22} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <BatteryBadge
            percent={battery.percent}
            compact
            onPress={() => setBatteryPercent(battery.percent <= 30 ? 80 : Math.max(15, battery.percent - 20))}
          />
          <Pressable
            onPress={toggle}
            style={[styles.roundBtn, elevation.float, { backgroundColor: colors.surface }]}
          >
            <Icon name={isDark ? 'sunny' : 'moon'} size={20} color={colors.ink} />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Stack inferior: botão de recentrar fica ACIMA do sheet (sem sobrepor) */}
      <View
        style={[styles.bottomStack, desktop && styles.bottomStackDesktop]}
        pointerEvents="box-none"
      >
        <Pressable
          style={[styles.recenter, elevation.float, { backgroundColor: colors.surface }]}
          onPress={onRecenter}
        >
          <Icon name="locate" size={22} color={colors.blue} />
        </Pressable>

        <Animated.View
          entering={FadeInDown.duration(280)}
          style={[
            styles.sheet,
            elevation.sheet,
            desktop && styles.sheetDesktop,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <SafeAreaView edges={['bottom']}>
            <View style={[styles.handle, { backgroundColor: colors.line }]} />
            <Text style={[styles.greeting, { color: colors.ink, fontFamily: fontFamily.extrabold }]}>
              Para onde?
            </Text>
            <Text style={[styles.sub, { color: colors.muted, fontFamily: fontFamily.medium }]}>
              {!hasFix
                ? error ?? 'Obtendo GPS do dispositivo…'
                : isFallback
                  ? `${ops.label} · GPS bloqueado neste PC · ${filtered.length} carregadores`
                  : ops.stationsFar
                    ? `GPS ativo · alguns postos da região podem ficar longe (${filtered.length})`
                    : ready
                      ? `GPS ±${location.accuracy != null ? Math.round(location.accuracy) : '—'} m · ${filtered.length} carregadores`
                      : 'Obtendo localização…'}
            </Text>

            {!hasFix || isFallback ? (
              <Pressable
                onPress={() => void onRecenter()}
                style={{
                  marginTop: 10,
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.onPrimary, fontFamily: fontFamily.bold }}>
                  {isFallback ? 'Tentar GPS de novo' : 'Permitir minha localização'}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() =>
                router.push({ pathname: '/(customer)/(tabs)/search', params: { q: query } })
              }
              style={{ marginTop: 12, marginBottom: 8 }}
            >
              <FloatingSearchBar
                value={query}
                onChangeText={setQuery}
                variant="whereTo"
                placeholder="Buscar posto ou endereço"
                onFocusPress={() =>
                  router.push({ pathname: '/(customer)/(tabs)/search', params: { q: query } })
                }
              />
            </Pressable>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              {(
                [
                  ['all', 'Todos'],
                  ['fast', 'Rápido'],
                  ['compat', 'Compatível'],
                ] as const
              ).map(([value, label]) => {
                const active = filter === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setFilter(value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.ghost,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? colors.onPrimary : colors.ink,
                        fontFamily: fontFamily.bold,
                        fontSize: 13,
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {loading ? (
              <LoadingBlock label="Buscando carregadores…" />
            ) : (
            <ScrollView style={{ maxHeight: desktop ? 520 : 280 }} showsVerticalScrollIndicator={false}>
              {selected ? (
                <View style={[styles.selected, { backgroundColor: colors.soft, borderColor: colors.line }]}>
                  <View style={styles.selectedHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.ink, fontFamily: fontFamily.bold, fontSize: 16 }}>
                        {selected.name}
                      </Text>
                      <Text style={{ color: colors.muted, fontFamily: fontFamily.medium, marginTop: 4 }}>
                        {selected.distance_km?.toFixed(1)} km · {selected.eta_min} min
                      </Text>
                    </View>
                    <FavoriteButton stationId={selected.id} size={24} />
                  </View>
                  {energyHint ? (
                    <Text
                      style={{
                        marginTop: 8,
                        color: energyHint.viable ? colors.battery : colors.batteryLow,
                        fontFamily: fontFamily.bold,
                        fontSize: 12,
                      }}
                    >
                      Chegada estimada {energyHint.arrivalPercent}%
                      {energyHint.needsCharge ? ' · recarga no caminho' : ''}
                    </Text>
                  ) : null}
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                      onPress={() => startRoute(selected)}
                    >
                      <Text
                        style={{
                          color: colors.onPrimary,
                          fontFamily: fontFamily.bold,
                        }}
                      >
                        Ir agora
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.secondaryBtn, { borderColor: colors.line }]}
                      onPress={() => openStation(selected)}
                    >
                      <Text style={{ color: colors.ink, fontFamily: fontFamily.bold }}>Detalhes</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {filtered.slice(0, 5).map((s) => (
                <StationCard
                  key={s.id}
                  station={s}
                  onPress={() => {
                    setSelectedId(s.id);
                    startRoute(s);
                  }}
                />
              ))}
            </ScrollView>
          )}
          </SafeAreaView>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { position: 'absolute', left: 12, right: 12, top: 0, zIndex: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomStack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  bottomStackDesktop: {
    left: undefined,
    right: 20,
    bottom: 20,
    width: 400,
  },
  recenter: {
    alignSelf: 'flex-end',
    marginRight: 16,
    marginBottom: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    maxHeight: 420,
  },
  sheetDesktop: {
    borderRadius: radius.xl,
    maxHeight: 640,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  greeting: { fontSize: 28, letterSpacing: -0.8 },
  sub: { fontSize: 13, marginTop: 4 },
  filters: { gap: 8, paddingVertical: 10 },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selected: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 4,
  },
  selectedHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  primaryBtn: {
    flex: 1.2,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
