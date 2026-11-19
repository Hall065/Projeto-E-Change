import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StationCard } from '../../src/components/StationCard';
import { EmptyState, Screen, Subtitle, Title } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useJourney } from '../../src/context/JourneyContext';
import { fetchFavorites } from '../../src/services/journey';
import { fetchStations } from '../../src/services/stations';
import type { StationWithMetrics } from '../../src/types/database';
import { colors } from '../../src/theme/colors';

export default function FavoritesScreen() {
  const { user } = useAuth();
  const { setStation } = useJourney();
  const [stations, setStations] = useState<StationWithMetrics[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!user) {
        setStations([]);
        return;
      }
      const favs = await fetchFavorites(user.id);
      if (!favs.length) {
        setStations([]);
        return;
      }
      const all = await fetchStations();
      const ids = new Set(favs.map((f: any) => f.station_id));
      setStations(all.filter((s) => ids.has(s.id)));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.pad}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        >
          <Title>Favorites</Title>
          <Subtitle>Stations you saved for quick access.</Subtitle>
          {!user && <EmptyState title="Faça login" subtitle="Salve postos favoritos na sua conta." />}
          {user && !stations.length && <EmptyState title="Nenhum favorito" subtitle="Favorite postos na tela de detalhes (próxima iteração rápida: use Search)." />}
          {stations.map((s) => (
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
});
