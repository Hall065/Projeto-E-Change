import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { colors } from '../theme/colors';
import { hasGoogleMaps, mapConfig } from '../lib/config';
import type { StationWithMetrics } from '../types/database';
import type { LatLng } from '../services/routing';

export type MapCanvasHandle = {
  recenter: (opts?: { latitude: number; longitude: number; heading?: number | null; tilt?: boolean }) => void;
};

type Props = {
  stations: StationWithMetrics[];
  height?: number | string;
  tilt?: boolean;
  followUser?: boolean;
  focus?: LatLng;
  showPrices?: boolean;
  showRoute?: boolean;
  routeCoordinates?: LatLng[];
  userCoord?: LatLng;
  userHeading?: number | null;
  onSelect?: (id: string) => void;
  style?: object;
  hideUserMarker?: boolean;
};

export const MapCanvas = forwardRef<MapCanvasHandle, Props>(function MapCanvas(
  {
    stations,
    height = 340,
    tilt,
    followUser,
    focus,
    showPrices,
    showRoute,
    routeCoordinates,
    userCoord,
    userHeading,
    onSelect,
    style,
    hideUserMarker,
  },
  ref,
) {
  const mapRef = useRef<MapView>(null);
  const origin = userCoord ?? mapConfig.defaultCenter;
  const destination = stations[0]
    ? { latitude: stations[0].latitude, longitude: stations[0].longitude }
    : null;

  const region: Region = {
    latitude: focus?.latitude ?? origin.latitude,
    longitude: focus?.longitude ?? origin.longitude,
    latitudeDelta: tilt ? 0.012 : 0.04,
    longitudeDelta: tilt ? 0.012 : 0.04,
  };

  const recenter = (opts?: { latitude: number; longitude: number; heading?: number | null; tilt?: boolean }) => {
    const lat = opts?.latitude ?? origin.latitude;
    const lng = opts?.longitude ?? origin.longitude;
    const useTilt = opts?.tilt ?? tilt;
    if (!mapRef.current) return;
    if (useTilt) {
      mapRef.current.animateCamera(
        {
          center: { latitude: lat, longitude: lng },
          pitch: 62,
          heading: opts?.heading ?? userHeading ?? 0,
          zoom: 17,
          altitude: 520,
        },
        { duration: 450 },
      );
    } else {
      mapRef.current.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        },
        350,
      );
    }
  };

  useImperativeHandle(ref, () => ({ recenter }));

  useEffect(() => {
    if (!followUser) return;
    recenter({
      latitude: origin.latitude,
      longitude: origin.longitude,
      heading: userHeading,
      tilt: true,
    });
  }, [followUser, origin.latitude, origin.longitude, userHeading]);

  useEffect(() => {
    if (followUser || !tilt) return;
    recenter({
      latitude: focus?.latitude ?? origin.latitude,
      longitude: focus?.longitude ?? origin.longitude,
      heading: userHeading ?? 20,
      tilt: true,
    });
  }, [tilt]);

  const line = routeCoordinates?.length
    ? routeCoordinates
    : showRoute && destination
      ? [origin, destination]
      : [];

  return (
    <View style={[{ height: typeof height === 'number' ? height : undefined, flex: typeof height === 'number' ? undefined : 1, width: '100%', overflow: 'hidden' }, style]}>
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
      >
        {line.length > 1 && (
          <>
            <Polyline coordinates={line} strokeColor="rgba(15,18,14,0.25)" strokeWidth={10} />
            <Polyline coordinates={line} strokeColor={colors.route} strokeWidth={5} />
          </>
        )}

        {!hideUserMarker && (
          <Marker
            coordinate={origin}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            rotation={userHeading ?? 0}
            tracksViewChanges={false}
          >
            <View style={styles.userWrap}>
              <View style={styles.userHalo} />
              <View style={[styles.userArrow, tilt && styles.userArrowNav]} />
            </View>
          </Marker>
        )}

        {stations.map((s) => (
          <Marker
            key={s.id}
            coordinate={{ latitude: s.latitude, longitude: s.longitude }}
            title={s.name}
            onPress={() => onSelect?.(s.id)}
            tracksViewChanges={false}
          >
            {showPrices ? (
              <View style={styles.pricePin}>
                <Text style={styles.priceText}>R$ {Number(s.min_price).toFixed(2).replace('.', ',')}</Text>
              </View>
            ) : (
              <View style={styles.boltPin}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>⚡</Text>
              </View>
            )}
          </Marker>
        ))}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  userWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  userHalo: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(47,111,237,0.18)',
  },
  userArrow: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.blue,
    borderWidth: 3,
    borderColor: '#fff',
  },
  userArrowNav: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.blue,
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    transform: [{ translateY: -2 }],
  },
  boltPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  pricePin: {
    backgroundColor: '#fff',
    borderColor: colors.ink,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  priceText: { color: colors.ink, fontWeight: '900', fontSize: 12 },
});
