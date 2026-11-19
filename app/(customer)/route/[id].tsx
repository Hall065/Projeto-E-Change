import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { MapCanvas } from '../../../src/components/MapCanvas';
import { Button, Screen } from '../../../src/components/ui';
import { useJourney } from '../../../src/context/JourneyContext';
import { useDeviceLocation } from '../../../src/hooks/useDeviceLocation';
import { formatPriceKwh } from '../../../src/lib/format';
import { describeStep, fetchDrivingRoute, type NavRoute } from '../../../src/services/routing';
import { colors } from '../../../src/theme/colors';

export default function RoutePreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { station, reservation, setNavRoute } = useJourney();
  const { coord, location, ready } = useDeviceLocation({ watch: true });
  const [route, setRoute] = useState<NavRoute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!station || !ready) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const r = await fetchDrivingRoute(
        { latitude: coord.latitude, longitude: coord.longitude },
        { latitude: station.latitude, longitude: station.longitude },
      );
      if (cancelled) return;
      setRoute(r);
      setNavRoute(r);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // Rota calculada uma vez ao abrir (GPS atual); navegação ao vivo fica na tela seguinte
  }, [station?.id, ready]);

  const first = route?.steps?.[0];
  const preview = first ? describeStep(first) : null;

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <MapCanvas
          stations={station ? [station] : []}
          height="100%"
          showRoute
          routeCoordinates={route?.coordinates}
          userCoord={coord}
          userHeading={location.heading}
          focus={coord}
          style={{ flex: 1 }}
        />

        <Animated.View entering={FadeInUp.duration(400)} style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.handle} />
            <Text style={styles.title}>Sua rota</Text>
            <Text style={styles.meta}>{station?.name}</Text>

            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.meta}>Calculando rota pelo GPS…</Text>
              </View>
            ) : (
              <>
                <View style={styles.row}>
                  <View>
                    <Text style={styles.metric}>{route?.distanceKm ?? '—'} km</Text>
                    <Text style={styles.label}>distância</Text>
                  </View>
                  <View>
                    <Text style={styles.metric}>{route?.durationMin ?? '—'} min</Text>
                    <Text style={styles.label}>tempo</Text>
                  </View>
                  <View>
                    <Text style={styles.metric}>{route?.provider === 'osrm' ? 'GPS' : 'EST'}</Text>
                    <Text style={styles.label}>rota</Text>
                  </View>
                </View>
                {preview ? (
                  <View style={styles.stepBox}>
                    <Text style={styles.stepDist}>{preview.banner}</Text>
                    <Text style={styles.stepTitle}>{preview.title}</Text>
                    <Text style={styles.meta}>{preview.road}</Text>
                  </View>
                ) : null}
              </>
            )}

            <Text style={styles.meta}>
              {reservation ? 'Reserva solicitada' : 'Sem reserva'} · Est. {station ? formatPriceKwh(station.min_price) : '—'}
            </Text>
            <Button
              title="Iniciar navegação"
              onPress={() => router.push(`/(customer)/navigation/${id}`)}
              disabled={loading || !route}
            />
          </SafeAreaView>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.line,
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '900', color: colors.ink },
  meta: { color: colors.muted, marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  metric: { fontSize: 20, fontWeight: '900', color: colors.ink },
  label: { color: colors.muted, fontSize: 12, marginTop: 2 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  stepBox: {
    backgroundColor: colors.dark,
    borderRadius: 16,
    padding: 14,
    marginVertical: 10,
  },
  stepDist: { color: colors.accent, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  stepTitle: { color: colors.white, fontSize: 18, fontWeight: '900', marginTop: 4 },
});
