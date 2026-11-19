import React, { forwardRef, useImperativeHandle, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { mapConfig, hasMapbox, hasGoogleMaps } from '../lib/config';
import type { StationWithMetrics } from '../types/database';
import type { LatLng } from '../services/routing';

export type MapCanvasHandle = {
  recenter: (opts?: { latitude: number; longitude: number; heading?: number | null; tilt?: boolean }) => void;
};

function buildOsmEmbed(lat: number, lng: number, delta = 0.04) {
  const minLon = lng - delta;
  const minLat = lat - delta;
  const maxLon = lng + delta;
  const maxLat = lat + delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function buildGoogleEmbed(lat: number, lng: number) {
  const key = mapConfig.googleMapsApiKey;
  return `https://www.google.com/maps/embed/v1/view?key=${key}&center=${lat},${lng}&zoom=14&maptype=roadmap`;
}

function buildMapboxEmbed(lat: number, lng: number) {
  const token = mapConfig.mapboxToken;
  return `https://api.mapbox.com/styles/v1/mapbox/navigation-day-v1.html?title=false&access_token=${token}#14/${lat}/${lng}`;
}

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
    focus,
    showPrices,
    showRoute,
    userCoord,
    onSelect,
    style,
  },
  ref,
) {
  const center = focus ?? userCoord ?? mapConfig.defaultCenter;
  const resolvedHeight = typeof height === 'number' ? height : 560;

  const src = useMemo(() => {
    if (hasGoogleMaps) return buildGoogleEmbed(center.latitude, center.longitude);
    if (hasMapbox) return buildMapboxEmbed(center.latitude, center.longitude);
    return buildOsmEmbed(center.latitude, center.longitude, tilt ? 0.018 : 0.04);
  }, [center.latitude, center.longitude, tilt]);

  useImperativeHandle(ref, () => ({
    recenter: () => undefined,
  }));

  return (
    <View style={[{ height: resolvedHeight, width: '100%', overflow: 'hidden', backgroundColor: colors.map }, style]}>
      {React.createElement('iframe', {
        title: 'E-Charge Map',
        src,
        style: { border: 0, width: '100%', height: '100%' },
        loading: 'lazy',
        referrerPolicy: 'no-referrer-when-downgrade',
      })}
      <View style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.badge}>
          {tilt ? 'GPS NAV' : hasGoogleMaps ? 'GOOGLE MAPS' : hasMapbox ? 'MAPBOX' : 'OPENSTREETMAP'}
        </Text>
        {showRoute && <Text style={styles.routeHint}>Rota ativa</Text>}
        <View style={styles.pins} pointerEvents="box-none">
          {stations.slice(0, 5).map((s, i) => (
            <Text key={s.id} style={[styles.chip, { top: 48 + i * 36 }]} onPress={() => onSelect?.(s.id)}>
              ⚡ {showPrices ? `R$ ${Number(s.min_price).toFixed(2).replace('.', ',')}` : s.name.slice(0, 16)}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill },
  badge: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: 'rgba(15,18,14,0.82)',
    color: colors.light,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  routeHint: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: colors.route,
    color: '#fff',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: '800',
  },
  pins: { position: 'absolute', right: 10, top: 48 },
  chip: {
    position: 'absolute',
    right: 0,
    backgroundColor: colors.white,
    borderColor: colors.ink,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: '800',
    color: colors.ink,
    overflow: 'hidden',
  },
});
