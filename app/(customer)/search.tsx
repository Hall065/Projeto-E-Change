import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapCanvas } from '../../src/components/MapCanvas';
import { StationCard } from '../../src/components/StationCard';
import { Chip, Input, Screen, Subtitle, Title } from '../../src/components/ui';
import { useJourney } from '../../src/context/JourneyContext';
import { useDeviceLocation } from '../../src/hooks/useDeviceLocation';
import { fetchStations } from '../../src/services/stations';
import type { StationWithMetrics } from '../../src/types/database';
import { colors } from '../../src/theme/colors';

type Filter = 'all' | 'fast' | 'medium' | 'slow';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { setStation } = useJourney();
  const { coord, location, ready } = useDeviceLocation({ watch: true, distanceInterval: 20 });
  const [stations, setStations] = useState<StationWithMetrics[]>([]);
  const [query, setQuery] = useState(params.q ?? '');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!ready) return;
    fetchStations(coord).then(setStations).catch(console.error);
  }, [ready, coord.latitude, coord.longitude]);

  const filtered = useMemo(() => {
    let list = [...stations];
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((s) => `${s.name} ${s.address} ${s.city}`.toLowerCase().includes(q));
    if (filter === 'fast') list = list.filter((s) => s.max_power_kw >= 100);
    if (filter === 'medium') list = list.filter((s) => s.max_power_kw >= 40 && s.max_power_kw < 100);
    if (filter === 'slow') list = list.filter((s) => s.max_power_kw < 40);
    return list.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
  }, [stations, query, filter]);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Title>Encontrar carregador</Title>
          <Subtitle>Compare preço, distância e disponibilidade perto do seu GPS.</Subtitle>
          <Input placeholder="Buscar endereço ou destino" value={query} onChangeText={setQuery} />
          <View style={styles.chips}>
            {([
              ['all', 'Todos'],
              ['fast', 'Rápido'],
              ['medium', 'Médio'],
              ['slow', 'Lento'],
            ] as const).map(([value, label]) => (
              <Chip key={value} label={label} active={filter === value} onPress={() => setFilter(value)} />
            ))}
          </View>
          <MapCanvas
            stations={filtered}
            height={220}
            showPrices
            userCoord={coord}
            userHeading={location.heading}
            focus={coord}
            onSelect={(id) => {
              const s = filtered.find((x) => x.id === id);
              if (!s) return;
              setStation(s);
              router.push(`/(customer)/station/${s.id}`);
            }}
          />
          <Text style={styles.count}>{filtered.length} postos próximos</Text>
          {filtered.map((s) => (
            <StationCard
              key={s.id}
              station={s}
              onPress={() => {
                setStation(s);
                router.push(`/(customer)/station/${s.id}`);
              }}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  count: { color: colors.muted, marginVertical: 10, fontWeight: '600' },
});
