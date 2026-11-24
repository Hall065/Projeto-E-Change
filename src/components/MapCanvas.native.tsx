import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { colors } from '../theme/colors';
import { cellDegForLatitudeDelta, clusterStations } from '../lib/clusterStations';
import { hasGoogleMaps, hasMapbox, mapConfig } from '../lib/config';
import type { StationWithMetrics } from '../types/database';
import type { LatLng } from '../services/routing';
import { PERSPECTIVE_PRESETS, type MapPerspective } from '../maps/types';

export type MapCanvasHandle = {
  recenter: (opts?: {
    latitude: number;
    longitude: number;
    heading?: number | null;
    tilt?: boolean;
    perspective?: MapPerspective;
    cameraLat?: number;
    cameraLng?: number;
  }) => void;
  setPerspective: (perspective: MapPerspective) => void;
  getProvider: () => 'google' | 'apple' | 'default';
};

/** No-op no native — prefetch só existe no web (CDN MapLibre). */
export function prefetchMapLibre() {}

type Props = {
  stations: StationWithMetrics[];
  height?: number | string;
  /** @deprecated use perspective */
  tilt?: boolean;
  perspective?: MapPerspective;
  followUser?: boolean;
  focus?: LatLng;
  /** Centro da câmera (look-ahead) — puck fica no terço inferior no 3D */
  cameraTarget?: LatLng;
  showPrices?: boolean;
  showRoute?: boolean;
  routeCoordinates?: LatLng[];
  traveledCoordinates?: LatLng[];
  alternativeRoutes?: LatLng[][];
  userCoord?: LatLng;
  userHeading?: number | null;
  onSelect?: (id: string) => void;
  onMapPress?: (coord: LatLng) => void;
  style?: object;
  hideUserMarker?: boolean;
  selectedStationId?: string | null;
  dark?: boolean;
  navigationMode?: boolean;
};

export const MapCanvas = forwardRef<MapCanvasHandle, Props>(function MapCanvas(
  {
    stations,
    height = 340,
    tilt,
    perspective: perspectiveProp,
    followUser,
    focus,
    cameraTarget,
    showPrices,
    showRoute,
    routeCoordinates,
    traveledCoordinates,
    alternativeRoutes,
    userCoord,
    userHeading,
    onSelect,
    onMapPress,
    style,
    hideUserMarker,
    selectedStationId,
    navigationMode,
  },
  ref,
) {
  const mapRef = useRef<MapView>(null);
  const perspectiveRef = useRef<MapPerspective>(perspectiveProp ?? (tilt ? 'nav3d' : 'top'));
  const origin = userCoord ?? mapConfig.defaultCenter;
  const destination = stations[0]
    ? { latitude: stations[0].latitude, longitude: stations[0].longitude }
    : null;

  const perspective = perspectiveProp ?? (tilt ? 'nav3d' : 'top');
  perspectiveRef.current = perspective;

  const camLat = cameraTarget?.latitude ?? focus?.latitude ?? origin.latitude;
  const camLng = cameraTarget?.longitude ?? focus?.longitude ?? origin.longitude;

  const [latDelta, setLatDelta] = useState(perspective === 'nav3d' ? 0.008 : 0.04);

  const region: Region = {
    latitude: camLat,
    longitude: camLng,
    latitudeDelta: perspective === 'nav3d' ? 0.008 : latDelta,
    longitudeDelta: perspective === 'nav3d' ? 0.008 : latDelta,
  };

  const clustered = useMemo(
    () => clusterStations(stations, cellDegForLatitudeDelta(latDelta)),
    [stations, latDelta],
  );

  const applyCamera = (opts: {
    latitude: number;
    longitude: number;
    heading?: number | null;
    perspective: MapPerspective;
    /** Troca Topo↔3D — mesma duração nos dois sentidos */
    perspectiveTransition?: boolean;
  }) => {
    if (!mapRef.current) return;
    const preset = PERSPECTIVE_PRESETS[opts.perspective];
    // Só a perspectiva escolhida — não forçar 3D por navigationMode
    const nav3d = opts.perspective === 'nav3d';
    const duration = opts.perspectiveTransition ? 650 : followUser && nav3d ? 280 : 520;
    mapRef.current.animateCamera(
      {
        center: { latitude: opts.latitude, longitude: opts.longitude },
        pitch: nav3d ? Math.max(preset.pitch, 68) : 0,
        heading: nav3d ? opts.heading ?? userHeading ?? 0 : 0,
        zoom: nav3d ? Math.max(preset.zoom, 17.5) : preset.zoom,
        altitude: nav3d ? 320 : 1400,
      },
      { duration },
    );
  };

  useImperativeHandle(ref, () => ({
    recenter: (opts) => {
      const nextPerspective = opts?.perspective ?? perspectiveRef.current;
      perspectiveRef.current = nextPerspective;
      applyCamera({
        latitude: opts?.cameraLat ?? opts?.latitude ?? camLat,
        longitude: opts?.cameraLng ?? opts?.longitude ?? camLng,
        heading: opts?.heading,
        perspective: nextPerspective,
      });
    },
    setPerspective: (p) => {
      perspectiveRef.current = p;
      applyCamera({
        latitude: camLat,
        longitude: camLng,
        heading: userHeading,
        perspective: p,
        perspectiveTransition: true,
      });
    },
    getProvider: () =>
      hasGoogleMaps && Platform.OS === 'android' ? 'google' : Platform.OS === 'ios' ? 'apple' : 'default',
  }));

  useEffect(() => {
    if (!followUser) return;
    applyCamera({
      latitude: camLat,
      longitude: camLng,
      heading: userHeading,
      perspective: perspectiveRef.current,
    });
  }, [
    followUser,
    camLat,
    camLng,
    origin.latitude,
    origin.longitude,
    userHeading,
    navigationMode,
  ]);

  useEffect(() => {
    perspectiveRef.current = perspective;
    applyCamera({
      latitude: camLat,
      longitude: camLng,
      heading: userHeading,
      perspective,
      perspectiveTransition: true,
    });
  }, [perspective]);

  const remain = routeCoordinates?.length
    ? routeCoordinates
    : showRoute && destination
      ? [origin, destination]
      : [];
  const traveled = traveledCoordinates ?? [];

  const providerHint = hasGoogleMaps ? 'google' : hasMapbox ? 'mapbox-ready' : 'system';

  return (
    <View
      style={[
        {
          height: typeof height === 'number' ? height : undefined,
          flex: typeof height === 'number' ? undefined : 1,
          width: '100%',
          overflow: 'hidden',
        },
        style,
      ]}
      accessibilityHint={`map-provider:${providerHint}`}
    >
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={hasGoogleMaps && Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic
        pitchEnabled
        rotateEnabled
        scrollEnabled={!followUser}
        zoomEnabled
        toolbarEnabled={false}
        onRegionChangeComplete={(r) => {
          if (r?.latitudeDelta) setLatDelta(r.latitudeDelta);
        }}
        onPress={(e) => {
          const c = e.nativeEvent.coordinate;
          if (c) onMapPress?.({ latitude: c.latitude, longitude: c.longitude });
        }}
      >
        {(alternativeRoutes ?? []).map((coords, idx) =>
          coords.length > 1 ? (
            <Polyline key={`alt-${idx}`} coordinates={coords} strokeColor={colors.routeAlt} strokeWidth={4} />
          ) : null,
        )}

        {traveled.length > 1 && showRoute ? (
          <Polyline coordinates={traveled} strokeColor="#9CA3AF" strokeWidth={5} />
        ) : null}

        {remain.length > 1 && showRoute ? (
          <>
            <Polyline coordinates={remain} strokeColor="rgba(15,18,14,0.28)" strokeWidth={12} />
            <Polyline coordinates={remain} strokeColor={colors.route} strokeWidth={6} />
          </>
        ) : null}

        {!hideUserMarker && (
          <Marker
            coordinate={origin}
            anchor={{ x: 0.5, y: perspective === 'nav3d' ? 0.62 : 0.55 }}
            flat
            rotation={userHeading ?? 0}
            tracksViewChanges={perspective === 'nav3d'}
            zIndex={999}
          >
            {perspective === 'nav3d' ? (
              <View style={styles.userWrap3d}>
                <View style={styles.userHalo3d} />
                <View style={styles.shadow3d} />
                <View style={styles.wazeOuter}>
                  <View style={styles.wazeInner} />
                </View>
              </View>
            ) : (
              <View style={styles.userWrap}>
                <View style={styles.userHalo} />
                <View style={styles.wazeOuterFlat}>
                  <View style={styles.wazeInnerFlat} />
                </View>
              </View>
            )}
          </Marker>
        )}

        {clustered.map((item) => {
          if (item.type === 'cluster') {
            return (
              <Marker
                key={item.id}
                coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                onPress={() => {
                  mapRef.current?.animateToRegion(
                    {
                      latitude: item.latitude,
                      longitude: item.longitude,
                      latitudeDelta: Math.max(latDelta / 2.4, 0.02),
                      longitudeDelta: Math.max(latDelta / 2.4, 0.02),
                    },
                    280,
                  );
                }}
                tracksViewChanges={false}
              >
                <View style={styles.clusterPin}>
                  <Text style={styles.clusterText}>{item.count}</Text>
                </View>
              </Marker>
            );
          }
          const s = item.station;
          return (
            <Marker
              key={s.id}
              coordinate={{ latitude: s.latitude, longitude: s.longitude }}
              title={s.name}
              onPress={() => onSelect?.(s.id)}
              tracksViewChanges={false}
            >
              {showPrices ? (
                <View style={[styles.pricePin, selectedStationId === s.id && styles.pricePinSelected]}>
                  <Text style={styles.priceText}>R$ {Number(s.min_price).toFixed(2).replace('.', ',')}</Text>
                </View>
              ) : (
                <View style={[styles.boltPin, selectedStationId === s.id && { backgroundColor: colors.blue }]}>
                  <View style={styles.boltDot} />
                </View>
              )}
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  userWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  userHalo: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(51,204,255,0.2)',
  },
  /** Seta Waze 2D (Topo) — ciano #33CCFF + contorno branco */
  wazeOuterFlat: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 32,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-end',
    transform: [{ translateY: -2 }],
  },
  wazeInnerFlat: {
    position: 'absolute',
    bottom: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#33CCFF',
  },
  /** Seta Waze 3D (navegação) */
  userWrap3d: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  userHalo3d: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(51,204,255,0.22)',
  },
  shadow3d: {
    position: 'absolute',
    bottom: 12,
    width: 28,
    height: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  wazeOuter: {
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderRightWidth: 18,
    borderBottomWidth: 40,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-end',
    transform: [{ translateY: -4 }],
  },
  wazeInner: {
    position: 'absolute',
    bottom: 5,
    width: 0,
    height: 0,
    borderLeftWidth: 13,
    borderRightWidth: 13,
    borderBottomWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#33CCFF',
  },

  boltPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  boltDot: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
  },
  pricePin: {
    backgroundColor: '#000',
    borderColor: '#000',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pricePinSelected: {
    borderColor: colors.blue,
    borderWidth: 2,
  },
  priceText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  clusterPin: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 10,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  clusterText: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
