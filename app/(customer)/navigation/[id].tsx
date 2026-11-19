import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { MapCanvas, type MapCanvasHandle } from '../../../src/components/MapCanvas';
import { Button, Screen } from '../../../src/components/ui';
import { useJourney } from '../../../src/context/JourneyContext';
import { useDeviceLocation } from '../../../src/hooks/useDeviceLocation';
import {
  describeStep,
  fetchDrivingRoute,
  nearestPointOnRoute,
  nextStepForProgress,
  remainingDistanceKm,
  type NavRoute,
} from '../../../src/services/routing';
import { colors } from '../../../src/theme/colors';

function etaClock(minutes: number) {
  const d = new Date(Date.now() + minutes * 60_000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function NavigationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { station, navRoute, setNavRoute } = useJourney();
  const mapRef = useRef<MapCanvasHandle>(null);
  const { coord, location, speedKmh, ready } = useDeviceLocation({ watch: true, distanceInterval: 4 });
  const [route, setRoute] = useState<NavRoute | null>(navRoute);
  const [follow, setFollow] = useState(true);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);

  useEffect(() => {
    if (!station || !ready) return;
    if (route?.coordinates?.length) return;
    let cancelled = false;
    (async () => {
      const r = await fetchDrivingRoute(coord, {
        latitude: station.latitude,
        longitude: station.longitude,
      });
      if (cancelled) return;
      setRoute(r);
      setNavRoute(r);
    })();
    return () => {
      cancelled = true;
    };
  }, [station?.id, ready]);

  const progress = useMemo(() => {
    if (!route?.coordinates?.length) {
      return {
        heading: location.heading ?? 0,
        remainingKm: route?.distanceKm ?? station?.distance_km ?? 0,
        remainingMin: route?.durationMin ?? station?.eta_min ?? 0,
        line: route?.coordinates ?? [],
        step: route?.steps?.[0] ?? null,
      };
    }
    const near = nearestPointOnRoute(route.coordinates, coord);
    const remKm = remainingDistanceKm(route.coordinates, near.index);
    const ratio = route.distanceKm > 0 ? remKm / route.distanceKm : 1;
    const remMin = Math.max(1, Math.round((route.durationMin || 1) * ratio));
    const step = nextStepForProgress(route.steps, coord);
    return {
      heading: location.heading ?? near.heading,
      remainingKm: remKm,
      remainingMin: remMin,
      line: near.remainingCoordinates,
      step,
    };
  }, [route, coord, location.heading, station]);

  const stepUi = progress.step ? describeStep(progress.step) : null;
  const speedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const onRecenter = () => {
    setFollow(true);
    mapRef.current?.recenter({
      latitude: coord.latitude,
      longitude: coord.longitude,
      heading: progress.heading,
      tilt: true,
    });
  };

  return (
    <Screen>
      <View style={{ flex: 1, backgroundColor: colors.dark }}>
        <MapCanvas
          ref={mapRef}
          stations={station ? [station] : []}
          height="100%"
          tilt
          followUser={follow}
          showRoute
          routeCoordinates={progress.line.length ? progress.line : route?.coordinates}
          userCoord={coord}
          userHeading={progress.heading}
          focus={coord}
          style={{ flex: 1 }}
        />

        <View style={styles.navCard}>
          <Text style={styles.navSmall}>{stepUi?.banner ?? 'SIGA'}</Text>
          <Text style={styles.navBig}>{stepUi?.title ?? 'Em direção ao posto'}</Text>
          <Text style={styles.navRoad}>{stepUi?.road ?? station?.name}</Text>
        </View>

        <Animated.View style={[styles.speed, speedStyle]}>
          <Text style={styles.speedValue}>{speedKmh || '—'}</Text>
          <Text style={styles.speedUnit}>km/h</Text>
        </Animated.View>

        {!follow ? (
          <Pressable style={styles.followBtn} onPress={onRecenter}>
            <Text style={styles.followText}>Recentralizar GPS</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.unfollow} onPress={() => setFollow(false)}>
            <Text style={styles.unfollowText}>◎</Text>
          </Pressable>
        )}

        <SafeAreaView edges={['bottom']} style={styles.bottom}>
          <View style={styles.row}>
            <View>
              <Text style={styles.metric}>{progress.remainingKm.toFixed(1)} km</Text>
              <Text style={styles.label}>restante</Text>
            </View>
            <View>
              <Text style={styles.metric}>{progress.remainingMin} min</Text>
              <Text style={styles.label}>tempo</Text>
            </View>
            <View>
              <Text style={styles.metric}>{etaClock(progress.remainingMin)}</Text>
              <Text style={styles.label}>ETA</Text>
            </View>
          </View>
          <Text style={styles.meta}>{station?.name}</Text>
          <Button title="Cheguei" onPress={() => router.push(`/(customer)/arrival/${id}`)} />
        </SafeAreaView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  navCard: {
    position: 'absolute',
    left: 14,
    top: 54,
    right: 110,
    backgroundColor: colors.dark,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  navSmall: { color: colors.accent, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  navBig: { color: colors.white, fontSize: 24, fontWeight: '900', marginTop: 4 },
  navRoad: { color: 'rgba(255,255,255,0.65)', marginTop: 4, fontSize: 13 },
  speed: {
    position: 'absolute',
    right: 16,
    top: 54,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.blue,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  speedValue: { fontSize: 22, fontWeight: '900', color: colors.ink },
  speedUnit: { fontSize: 10, color: colors.muted, fontWeight: '700' },
  followBtn: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 168,
    backgroundColor: colors.blue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  followText: { color: '#fff', fontWeight: '800' },
  unfollow: {
    position: 'absolute',
    right: 16,
    bottom: 168,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unfollowText: { fontSize: 18, color: colors.blue, fontWeight: '800' },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    padding: 16,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  metric: { fontSize: 18, fontWeight: '900', color: colors.ink },
  label: { color: colors.muted, fontSize: 11, marginTop: 2 },
  meta: { color: colors.muted, marginTop: 6, marginBottom: 8 },
});
