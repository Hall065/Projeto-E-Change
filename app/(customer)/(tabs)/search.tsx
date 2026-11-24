import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FloatingSearchBar } from '../../../src/components/FloatingSearchBar';
import { Icon } from '../../../src/components/Icon';
import { MapCanvas } from '../../../src/components/MapCanvas';
import { StationCard } from '../../../src/components/StationCard';
import { useJourney } from '../../../src/context/JourneyContext';
import { useVehicle } from '../../../src/context/VehicleContext';
import { useDeviceLocation } from '../../../src/hooks/useDeviceLocation';
import { resolveOpsOrigin } from '../../../src/lib/opsOrigin';
import { registerCustomDestination } from '../../../src/services/customDestination';
import { parseCoordinateQuery, searchPlaces, type PlaceSuggestion } from '../../../src/services/geocode';
import { fetchStations } from '../../../src/services/stations';
import type { StationWithMetrics } from '../../../src/types/database';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily } from '../../../src/theme/fonts';
import { elevation, radius } from '../../../src/theme/tokens';

type Filter = 'all' | 'fast' | 'medium' | 'slow' | 'compat';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { colors, isDark } = useTheme();
  const { setStation } = useJourney();
  const { vehicle } = useVehicle();
  const { coord: rawCoord, location, ready, hasFix, isFallback } = useDeviceLocation({ watch: true, distanceInterval: 20 });
  const ops = useMemo(
    () => resolveOpsOrigin(rawCoord, { hasFix, isFallback }),
    [rawCoord.latitude, rawCoord.longitude, hasFix, isFallback],
  );
  const coord = ops.coord;

  const [stations, setStations] = useState<StationWithMetrics[]>([]);
  const [query, setQuery] = useState(params.q ?? '');
  const [filter, setFilter] = useState<Filter>('all');
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [focus, setFocus] = useState(coord);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ready) return;
    fetchStations(coord).then(setStations).catch(console.error);
  }, [ready, coord.latitude, coord.longitude]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    const coords = parseCoordinateQuery(q);
    if (coords) {
      setPlaces([
        {
          id: 'coord',
          label: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
          subtitle: 'Coordenadas',
          coord: coords,
          kind: 'address',
        },
      ]);
      setFocus(coords);
      setSearchError(null);
      return;
    }

    if (q.length < 2) {
      setPlaces([]);
      setSearchError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        setSearchError(null);
        const results = await searchPlaces(q, coord, 'search-screen');
        setPlaces(results);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setSearchError(e?.message ?? 'Falha na busca');
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, coord.latitude, coord.longitude]);

  const filtered = useMemo(() => {
    let list = [...stations];
    const q = query.trim().toLowerCase();
    if (q && !parseCoordinateQuery(q)) {
      list = list.filter((s) => `${s.name} ${s.address} ${s.city}`.toLowerCase().includes(q));
    }
    if (filter === 'fast') list = list.filter((s) => s.max_power_kw >= 100);
    if (filter === 'medium') list = list.filter((s) => s.max_power_kw >= 40 && s.max_power_kw < 100);
    if (filter === 'slow') list = list.filter((s) => s.max_power_kw < 40);
    if (filter === 'compat') {
      list = list.filter((s) => (s.connectors ?? []).some((c) => vehicle.connectors.includes(c.connector_type)));
    }
    return list.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
  }, [stations, query, filter, vehicle.connectors]);

  const nearestToPlace = (place: PlaceSuggestion) => {
    if (!stations.length) return null;
    return [...stations].sort((a, b) => {
      const da = Math.hypot(a.latitude - place.coord.latitude, a.longitude - place.coord.longitude);
      const db = Math.hypot(b.latitude - place.coord.latitude, b.longitude - place.coord.longitude);
      return da - db;
    })[0];
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Icon name="arrow-back" size={20} color={colors.ink} />
            </Pressable>
            <Text style={[styles.title, { color: colors.ink, fontFamily: fontFamily.extrabold }]}>Busca</Text>
          </View>
          <Text style={{ color: colors.muted, marginBottom: 12, fontFamily: fontFamily.medium }}>
            Digite um endereço, coordenadas ou busque um posto
          </Text>
          <FloatingSearchBar
            value={query}
            onChangeText={setQuery}
            variant="whereTo"
            placeholder="Endereço, rua, bairro ou posto…"
          />

          <View style={styles.chips}>
            {(
              [
                ['all', 'Todos'],
                ['compat', 'Compatível'],
                ['fast', 'Rápido'],
                ['medium', 'Médio'],
                ['slow', 'Lento'],
              ] as const
            ).map(([value, label]) => {
              const active = filter === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setFilter(value)}
                  style={[styles.chip, { backgroundColor: active ? colors.ink : colors.ghost }]}
                >
                  <Text
                    style={{
                      color: active ? (isDark ? '#000' : '#fff') : colors.ink,
                      fontFamily: fontFamily.bold,
                      fontSize: 13,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {searching ? <ActivityIndicator color={colors.ink} style={{ marginVertical: 8 }} /> : null}
          {searchError ? (
            <Text style={{ color: colors.danger, marginBottom: 8, fontFamily: fontFamily.medium }}>{searchError}</Text>
          ) : null}

          {places.length ? (
            <View style={[styles.suggestBox, elevation.soft, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Text style={[styles.suggestTitle, { color: colors.muted }]}>Endereços</Text>
              {places.map((p) => {
                const nearest = nearestToPlace(p);
                return (
                  <View key={p.id} style={[styles.suggestBlock, { borderBottomColor: colors.line }]}>
                    <View style={styles.suggestRow}>
                      <Icon name="location-outline" size={18} color={colors.ink} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.ink, fontFamily: fontFamily.bold }}>{p.label}</Text>
                        <Text
                          style={{
                            color: colors.muted,
                            fontSize: 12,
                            marginTop: 2,
                            fontFamily: fontFamily.medium,
                          }}
                        >
                          {p.subtitle}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.suggestActions}>
                      <Pressable
                        onPress={() => {
                          try {
                            setFocus(p.coord);
                            const dest = registerCustomDestination(p, coord);
                            setStation(dest);
                            router.push(`/(customer)/route/${encodeURIComponent(dest.id)}`);
                          } catch (e) {
                            console.warn('[search] custom destination failed', e);
                          }
                        }}
                        style={[styles.suggestBtn, { backgroundColor: colors.primary }]}
                      >
                        <Icon name="navigate" size={14} color={colors.onPrimary} />
                        <Text
                          style={{
                            color: colors.onPrimary,
                            fontFamily: fontFamily.bold,
                            fontSize: 12,
                          }}
                        >
                          Ir para cá
                        </Text>
                      </Pressable>
                      {nearest ? (
                        <Pressable
                          onPress={() => {
                            setFocus(p.coord);
                            setStation(nearest);
                            router.push(`/(customer)/route/${encodeURIComponent(nearest.id)}`);
                          }}
                          style={[styles.suggestBtn, { borderColor: colors.line, borderWidth: 1 }]}
                        >
                          <Icon name="flash" size={14} color={colors.ink} />
                          <Text style={{ color: colors.ink, fontFamily: fontFamily.bold, fontSize: 12 }}>
                            Posto perto
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          <MapCanvas
            stations={filtered}
            height={220}
            showPrices
            dark={isDark}
            userCoord={coord}
            userHeading={location.heading}
            focus={focus}
            onSelect={(id) => {
              const s = filtered.find((x) => x.id === id);
              if (!s) return;
              setStation(s);
              router.push(`/(customer)/station/${s.id}`);
            }}
          />
          <Text style={{ color: colors.muted, marginVertical: 10, fontFamily: fontFamily.semibold }}>
            {filtered.length} postos
          </Text>
          {filtered.map((s) => (
            <StationCard
              key={s.id}
              station={s}
              onPress={() => {
                try {
                  setStation(s);
                  router.push(`/(customer)/route/${encodeURIComponent(s.id)}`);
                } catch (e) {
                  console.warn('[search] select station failed', e);
                }
              }}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28, letterSpacing: -0.6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  suggestBox: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    overflow: 'hidden',
  },
  suggestTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  suggestBlock: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestActions: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 28,
  },
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
