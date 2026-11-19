import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MapCanvas, type MapCanvasHandle } from '../../src/components/MapCanvas';
import { StationCard } from '../../src/components/StationCard';
import { Button, Input, Screen } from '../../src/components/ui';
import { useJourney } from '../../src/context/JourneyContext';
import { useDeviceLocation } from '../../src/hooks/useDeviceLocation';
import { fetchStations } from '../../src/services/stations';
import type { StationWithMetrics } from '../../src/types/database';
import { colors } from '../../src/theme/colors';

export default function MapScreen() {
  const { setStation } = useJourney();
  const mapRef = useRef<MapCanvasHandle>(null);
  const { coord, ready, error, refresh, location } = useDeviceLocation({ watch: true, distanceInterval: 12 });
  const [stations, setStations] = useState<StationWithMetrics[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const origin = await refresh();
      setStations(await fetchStations({ latitude: origin.latitude, longitude: origin.longitude }));
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const selected = useMemo(
    () => stations.find((s) => s.id === selectedId) ?? null,
    [stations, selectedId],
  );

  const openStation = (s: StationWithMetrics) => {
    setStation(s);
    router.push(`/(customer)/station/${s.id}`);
  };

  const onRecenter = () => {
    mapRef.current?.recenter({
      latitude: coord.latitude,
      longitude: coord.longitude,
      heading: location.heading,
      tilt: false,
    });
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <MapCanvas
          ref={mapRef}
          stations={stations}
          height="62%"
          showPrices
          userCoord={coord}
          userHeading={location.heading}
          focus={coord}
          onSelect={(id) => {
            setSelectedId(id);
            const s = stations.find((x) => x.id === id);
            if (s) openStation(s);
          }}
          style={{ flex: 1 }}
        />

        <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
          <Pressable
            style={styles.searchTap}
            onPress={() => router.push({ pathname: '/(customer)/search', params: { q: query } })}
          >
            <Text style={styles.searchIcon}>⌕</Text>
            <Input
              placeholder="Para onde você quer carregar?"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => router.push({ pathname: '/(customer)/search', params: { q: query } })}
              style={styles.search}
            />
          </Pressable>
          {error ? <Text style={styles.gpsWarn}>{error}</Text> : null}
          {ready && !error ? (
            <Text style={styles.gpsOk}>GPS ativo · postos perto de você</Text>
          ) : null}
        </SafeAreaView>

        <Pressable style={styles.recenter} onPress={onRecenter}>
          <Text style={styles.recenterText}>⌖</Text>
        </Pressable>

        <Animated.View entering={FadeInDown.duration(380)} style={styles.sheet}>
          <ScrollView
            contentContainerStyle={{ padding: 18, paddingBottom: 28 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.handle} />
            <View style={styles.row}>
              <View>
                <Text style={styles.h2}>Perto de você</Text>
                <Text style={styles.sub}>
                  {stations.length} postos · estilo Waze/Uber
                </Text>
              </View>
              <Text style={styles.link} onPress={() => router.push('/(customer)/search')}>
                Ver todos
              </Text>
            </View>

            {selected ? (
              <View style={styles.quick}>
                <Text style={styles.quickTitle}>{selected.name}</Text>
                <Text style={styles.sub}>
                  {selected.distance_km?.toFixed(1)} km · {selected.eta_min} min
                </Text>
                <Button title="Ver posto" onPress={() => openStation(selected)} />
              </View>
            ) : null}

            {stations.slice(0, 4).map((s) => (
              <StationCard key={s.id} station={s} onPress={() => openStation(s)} />
            ))}
            <Button title="Buscar carregador" onPress={() => router.push('/(customer)/search')} />
          </ScrollView>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topOverlay: { position: 'absolute', left: 14, right: 14, top: 0 },
  searchTap: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  searchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
    top: 22,
    fontSize: 18,
    color: colors.muted,
  },
  search: {
    flex: 1,
    marginTop: 8,
    borderRadius: 22,
    paddingLeft: 36,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 5,
  },
  gpsOk: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(15,18,14,0.78)',
    color: colors.light,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
  },
  gpsWarn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.danger,
    color: '#fff',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
  },
  recenter: {
    position: 'absolute',
    right: 16,
    top: 118,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  recenterText: { fontSize: 20, color: colors.blue, fontWeight: '800' },
  sheet: {
    flex: 1,
    marginTop: -32,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.line,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  h2: { fontSize: 20, fontWeight: '900', color: colors.ink },
  sub: { color: colors.muted, marginTop: 2, fontSize: 13 },
  link: { color: colors.primary, fontWeight: '800', marginTop: 4 },
  quick: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  quickTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
});
