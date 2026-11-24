import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapCanvas, type MapCanvasHandle } from '../../../src/components/MapCanvas';
import { NavInstructionBanner } from '../../../src/components/navigation/NavInstructionBanner';
import { NavBottomDock } from '../../../src/components/navigation/NavBottomDock';
import { NavSpeedometer } from '../../../src/components/navigation/NavSpeedometer';
import { Icon } from '../../../src/components/Icon';
import { useJourney } from '../../../src/context/JourneyContext';
import { useVehicle } from '../../../src/context/VehicleContext';
import { useDeviceLocation } from '../../../src/hooks/useDeviceLocation';
import { SIM_SPEED_PRESETS, useRouteSimulation, type SimSpeed } from '../../../src/hooks/useRouteSimulation';
import { haversineKm } from '../../../src/lib/format';
import { estimateRouteEnergy } from '../../../src/services/energy';
import { computeNavProgress } from '../../../src/services/navigationEngine';
import { fetchDrivingRoute, liveManeuverGuide, type NavRoute } from '../../../src/services/routing';
import { fetchStationById } from '../../../src/services/stations';
import type { MapPerspective } from '../../../src/maps/types';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily } from '../../../src/theme/fonts';
import { elevation, radius } from '../../../src/theme/tokens';

export default function NavigationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { station, setStation, navRoute, setNavRoute } = useJourney();
  const { vehicle, battery } = useVehicle();
  const mapRef = useRef<MapCanvasHandle>(null);
  const { coord, location, speedKmh, ready, hasFix, error, refresh } = useDeviceLocation({
    watch: true,
    distanceInterval: 2,
  });

  const [route, setRoute] = useState<NavRoute | null>(navRoute);
  const [follow, setFollow] = useState(true);
  const [perspective, setPerspective] = useState<MapPerspective>('nav3d');
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null);
  const [simPanelOpen, setSimPanelOpen] = useState(false);
  const recalcLock = useRef(false);

  const sim = useRouteSimulation(route?.coordinates);

  useEffect(() => {
    if (station?.id === id || !id) return;
    fetchStationById(id, coord).then((s) => {
      if (s) setStation(s);
    });
  }, [id]);

  useEffect(() => {
    if (!station || !ready || !hasFix) return;
    let cancelled = false;
    (async () => {
      // Mantém a alternativa escolhida no preview (não sobrescreve com a rota [0])
      const end = navRoute?.coordinates?.[navRoute.coordinates.length - 1];
      const matchesDestination =
        !!navRoute &&
        !!end &&
        navRoute.coordinates.length > 1 &&
        haversineKm(end.latitude, end.longitude, station.latitude, station.longitude) < 0.8;

      if (matchesDestination) {
        setRoute(navRoute);
        return;
      }

      const r = await fetchDrivingRoute(
        { latitude: coord.latitude, longitude: coord.longitude },
        { latitude: station.latitude, longitude: station.longitude },
      );
      if (cancelled) return;
      setRoute(r);
      setNavRoute(r);
    })();
    return () => {
      cancelled = true;
    };
  }, [station?.id, ready, hasFix]);

  const navCoord = sim.active || sim.arrived ? (sim.position ?? coord) : coord;
  const navHeading =
    sim.active || sim.arrived ? sim.heading : location.heading ?? null;
  const navSpeedKmh = sim.active ? sim.displayKmh : speedKmh;
  const navHasFix = hasFix || sim.active || sim.arrived;

  const lookAheadM = useMemo(() => {
    const speed = typeof navSpeedKmh === 'number' ? navSpeedKmh : 0;
    if (speed > 80) return 140;
    if (speed > 50) return 110;
    if (speed > 25) return 85;
    return 65;
  }, [navSpeedKmh]);

  const progress = useMemo(
    () =>
      computeNavProgress({
        route,
        user: navCoord,
        deviceHeading: navHeading,
        lookAheadM,
      }),
    [route, navCoord.latitude, navCoord.longitude, navHeading, lookAheadM],
  );

  // Chegada da simulação → mantém câmera no destino
  useEffect(() => {
    if (!sim.arrived) return;
    setFollow(true);
    setSimPanelOpen(false);
  }, [sim.arrived]);

  /**
   * Próximos passos = ângulos reais da polyline azul à frente do usuário.
   * Recalcula a cada update de GPS — setas esquerda/direita batem com o caminho.
   */
  const bannerStep = useMemo(() => {
    type Upcoming = { step: NonNullable<typeof progress.step>; distanceM?: number };
    const coords = route?.coordinates ?? [];
    if (coords.length < 3) {
      return {
        step: progress.step,
        index: progress.stepIndex,
        upcoming: [] as Upcoming[],
        distanceM: progress.distanceToManeuverM,
      };
    }

    const guide = liveManeuverGuide(coords, progress.snappedCoord ?? navCoord, {
      osrmSteps: route?.steps,
      minTurnDeg: 38,
      max: 8,
    });

    const upcoming: Upcoming[] = guide.upcoming.map((m) => ({
      step: m.step,
      distanceM: Math.max(15, m.distanceM),
    }));

    // Na chegada da simulação, força banner de destino
    if (sim.arrived || progress.arrived) {
      return {
        step: {
          instruction: 'Chegue ao destino',
          distanceM: 0,
          durationS: 0,
          name: station?.name || 'Destino',
          location: progress.snappedCoord,
          turnSide: 'straight' as const,
          turnDeg: 0,
          modifier: 'arrive',
        },
        index: progress.stepIndex,
        upcoming: [] as Upcoming[],
        distanceM: 10,
      };
    }

    return {
      step: guide.current?.step ?? progress.step,
      index: progress.stepIndex,
      upcoming,
      distanceM: guide.distanceToCurrentM || progress.distanceToManeuverM,
    };
  }, [
    route?.coordinates,
    route?.steps,
    progress.snappedCoord?.latitude,
    progress.snappedCoord?.longitude,
    progress.step,
    progress.stepIndex,
    progress.distanceToManeuverM,
    progress.arrived,
    navCoord.latitude,
    navCoord.longitude,
    sim.arrived,
    station?.name,
  ]);

  const bannerDistanceM = bannerStep.distanceM ?? progress.distanceToManeuverM;

  useEffect(() => {
    if (sim.active || sim.arrived) return;
    if (!hasFix || !station || !route || progress.offRouteKm < 0.12 || recalcLock.current) return;
    recalcLock.current = true;
    setRecalcMsg('Recalculando rota…');
    (async () => {
      try {
        const r = await fetchDrivingRoute(coord, {
          latitude: station.latitude,
          longitude: station.longitude,
        });
        setRoute(r);
        setNavRoute(r);
        setRecalcMsg('Rota atualizada');
        setTimeout(() => setRecalcMsg(null), 1400);
      } catch {
        setRecalcMsg('Falha ao recalcular');
        setTimeout(() => setRecalcMsg(null), 1800);
      } finally {
        setTimeout(() => {
          recalcLock.current = false;
        }, 4000);
      }
    })();
  }, [progress.offRouteKm, station?.id, hasFix]);

  const energy = useMemo(
    () => estimateRouteEnergy(vehicle, battery, progress.remainingKm),
    [vehicle, battery, progress.remainingKm],
  );

  const applyPerspective = (p: MapPerspective) => {
    setPerspective(p);
  };

  const onRecenter = () => {
    setFollow(true);
    if (!sim.active) void refresh();
    mapRef.current?.recenter({
      latitude: progress.snappedCoord.latitude,
      longitude: progress.snappedCoord.longitude,
      cameraLat: progress.cameraTarget.latitude,
      cameraLng: progress.cameraTarget.longitude,
      heading: progress.heading,
      perspective,
    });
  };

  const onStartSim = (preset: SimSpeed) => {
    if (!route?.coordinates || route.coordinates.length < 2) return;
    setFollow(true);
    setPerspective('nav3d');
    setSimPanelOpen(false);
    sim.start(preset);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0B1220' }}>
      <MapCanvas
        ref={mapRef}
        stations={station ? [station] : []}
        height="100%"
        perspective={perspective}
        dark={isDark}
        followUser={follow && navHasFix}
        navigationMode
        showRoute
        routeCoordinates={progress.remainingLine.length ? progress.remainingLine : route?.coordinates}
        traveledCoordinates={progress.traveledLine}
        userCoord={navHasFix ? progress.snappedCoord : undefined}
        userHeading={navHasFix ? progress.heading : null}
        cameraTarget={navHasFix ? progress.cameraTarget : undefined}
        focus={navHasFix ? progress.snappedCoord : undefined}
        hideUserMarker={!navHasFix}
        style={{ flex: 1 }}
      />

      {/* Topo: card flutuante, afastado das bordas */}
      <View
        pointerEvents="box-none"
        style={[styles.topOverlay, { paddingTop: Math.max(insets.top, 12) + 8 }]}
      >
        <View style={styles.bannerWrap}>
          <NavInstructionBanner
            step={bannerStep.step}
            distanceM={bannerDistanceM}
            streetFallback={station?.name}
            upcoming={bannerStep.upcoming}
          />
        </View>

        <View style={styles.rightCol}>
          <View style={[styles.perspGroup, elevation.float, { backgroundColor: colors.surface }]}>
            <Pressable
              onPress={() => applyPerspective('top')}
              style={[styles.perspBtn, perspective === 'top' && styles.perspActive]}
            >
              <Icon name="map-outline" size={18} color={perspective === 'top' ? '#fff' : colors.ink} />
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: fontFamily.bold,
                  color: perspective === 'top' ? '#fff' : colors.ink,
                  marginTop: 2,
                }}
              >
                Topo
              </Text>
            </Pressable>
            <Pressable
              onPress={() => applyPerspective('nav3d')}
              style={[styles.perspBtn, perspective === 'nav3d' && styles.perspActive]}
            >
              <Icon name="navigate" size={18} color={perspective === 'nav3d' ? '#fff' : colors.ink} />
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: fontFamily.bold,
                  color: perspective === 'nav3d' ? '#fff' : colors.ink,
                  marginTop: 2,
                }}
              >
                3D
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.iconFab, elevation.float, { backgroundColor: colors.surface }]}
            onPress={onRecenter}
          >
            <Icon name="locate" size={22} color={colors.blue} />
          </Pressable>

          <Pressable
            style={[styles.iconFab, elevation.float, { backgroundColor: colors.surface }]}
            onPress={() => setFollow((f) => !f)}
          >
            <Icon name={follow ? 'lock-closed' : 'lock-open'} size={18} color={colors.ink} />
          </Pressable>

          <View style={styles.simAnchor}>
            {simPanelOpen && !sim.active ? (
              <View
                style={[
                  styles.simPanel,
                  elevation.float,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text style={[styles.simTitle, { color: colors.ink }]}>Simular trajeto</Text>
                <Text style={[styles.simSub, { color: colors.muted }]}>
                  A seta percorre a rota até o destino
                </Text>
                {(Object.keys(SIM_SPEED_PRESETS) as SimSpeed[]).map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => onStartSim(key)}
                    style={[
                      styles.simSpeedBtn,
                      { backgroundColor: sim.speed === key ? '#000' : colors.soft },
                    ]}
                  >
                    <Text
                      style={{
                        color: sim.speed === key ? '#fff' : colors.ink,
                        fontFamily: fontFamily.bold,
                        fontSize: 14,
                      }}
                    >
                      {SIM_SPEED_PRESETS[key].label}
                    </Text>
                    <Text
                      style={{
                        color: sim.speed === key ? 'rgba(255,255,255,0.65)' : colors.muted,
                        fontFamily: fontFamily.medium,
                        fontSize: 11,
                      }}
                    >
                      ~{SIM_SPEED_PRESETS[key].displayKmh} km/h
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Pressable
              style={[
                styles.iconFab,
                elevation.float,
                { backgroundColor: sim.active || simPanelOpen ? '#276EF1' : colors.surface },
              ]}
              onPress={() => {
                if (sim.active) {
                  sim.stop();
                  return;
                }
                setSimPanelOpen((o) => !o);
              }}
            >
              <Icon
                name={sim.active ? 'pause' : 'play'}
                size={20}
                color={sim.active || simPanelOpen ? '#fff' : colors.ink}
              />
            </Pressable>
          </View>
        </View>
      </View>

      {sim.active ? (
        <View style={[styles.simLive, { top: Math.max(insets.top, 12) + 150 }]}>
          <Text style={{ color: '#fff', fontFamily: fontFamily.bold, fontSize: 12 }}>
            Simulação · {sim.speedLabel}
          </Text>
          <Pressable onPress={sim.cycleSpeed} style={styles.simLiveBtn}>
            <Text style={{ color: '#fff', fontFamily: fontFamily.bold, fontSize: 11 }}>Velocidade</Text>
          </Pressable>
          <Pressable onPress={sim.stop} style={styles.simLiveBtn}>
            <Text style={{ color: '#FFC043', fontFamily: fontFamily.bold, fontSize: 11 }}>Parar</Text>
          </Pressable>
        </View>
      ) : null}

      {sim.arrived ? (
        <View style={[styles.arrivedBanner, { top: Math.max(insets.top, 12) + 150 }]}>
          <Icon name="checkmark-circle" size={18} color="#06C167" />
          <Text style={{ color: '#fff', fontFamily: fontFamily.bold, flex: 1 }}>
            Destino alcançado
          </Text>
          <Pressable onPress={() => router.push(`/(customer)/arrival/${id}`)}>
            <Text style={{ color: '#06C167', fontFamily: fontFamily.bold }}>Continuar</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              sim.reset();
              setSimPanelOpen(true);
            }}
            style={{ marginLeft: 10 }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: fontFamily.bold }}>Replay</Text>
          </Pressable>
        </View>
      ) : null}

      {recalcMsg ? (
        <View style={[styles.toast, { top: Math.max(insets.top, 12) + 150, backgroundColor: colors.overlay }]}>
          <Text style={{ color: '#fff', fontFamily: fontFamily.bold, fontSize: 12 }}>{recalcMsg}</Text>
        </View>
      ) : null}

      {!hasFix && !sim.active && !sim.arrived ? (
        <Pressable
          style={[styles.gpsBanner, { top: Math.max(insets.top, 12) + 150, backgroundColor: '#000' }]}
          onPress={() => void refresh()}
        >
          <Icon name="warning-outline" size={16} color="#FFC043" />
          <Text style={{ color: '#fff', fontFamily: fontFamily.bold, flex: 1 }}>
            {error ?? 'Ative a localização do dispositivo'}
          </Text>
          <Text style={{ color: colors.accent, fontFamily: fontFamily.bold }}>Tentar</Text>
        </Pressable>
      ) : null}

      {progress.offRouteKm >= 0.08 && hasFix && !sim.active && !recalcMsg ? (
        <View style={[styles.offRoute, { top: Math.max(insets.top, 12) + 150 }]}>
          <Icon name="warning-outline" size={14} color="#FFC043" />
          <Text style={{ color: '#fff', fontFamily: fontFamily.semibold, fontSize: 12 }}>Fora da rota</Text>
        </View>
      ) : null}

      {/* Velocímetro — posição padrão Waze: baixo-esquerda, acima do dock */}
      <View
        pointerEvents="none"
        style={[styles.speedAnchor, { bottom: Math.max(insets.bottom, 10) + 168 }]}
      >
        <NavSpeedometer speedKmh={navSpeedKmh} />
      </View>

      <NavBottomDock
        remainingKm={progress.remainingKm}
        remainingMin={progress.remainingMin}
        batteryPercent={energy.arrivalPercent}
        batteryOk={energy.viable}
        destination={station?.name}
        onArrive={() => router.push(`/(customer)/arrival/${id}`)}
        onEnd={() => {
          sim.stop();
          router.replace('/(customer)/(tabs)/map');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 0,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bannerWrap: {
    flex: 1,
    minWidth: 0,
  },
  rightCol: {
    gap: 8,
    alignItems: 'center',
    paddingTop: 2,
  },
  perspGroup: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E2E2',
  },
  perspBtn: {
    width: 56,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  perspActive: { backgroundColor: '#000' },
  iconFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedAnchor: {
    position: 'absolute',
    left: 18,
  },
  gpsBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  offRoute: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.82)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  simAnchor: {
    position: 'relative',
    alignItems: 'center',
    zIndex: 30,
  },
  /** Abre à esquerda do play — não cobre o botão que abre o painel */
  simPanel: {
    position: 'absolute',
    right: 52,
    bottom: 0,
    width: 200,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    zIndex: 40,
  },
  simTitle: {
    fontFamily: fontFamily.extrabold,
    fontSize: 14,
  },
  simSub: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    marginBottom: 2,
  },
  simSpeedBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  simLive: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(39,110,241,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  simLiveBtn: {
    paddingHorizontal: 6,
  },
  arrivedBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(11,18,32,0.94)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(6,193,103,0.45)',
  },
});
