import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';
import { hasGoogleMaps, hasMapbox, mapConfig } from '../lib/config';
import type { StationWithMetrics } from '../types/database';
import type { LatLng } from '../services/routing';
import { PERSPECTIVE_PRESETS, type MapPerspective } from '../maps/types';
import { createWazeArrow3dLayer } from '../maps/wazeArrow3dLayer';

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
  getProvider: () => 'maplibre' | 'leaflet' | 'google' | 'mapbox';
};

type Props = {
  stations: StationWithMetrics[];
  height?: number | string;
  tilt?: boolean;
  perspective?: MapPerspective;
  followUser?: boolean;
  focus?: LatLng;
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

const ML_VERSION = '5.6.2';
const ML_CSS = `https://unpkg.com/maplibre-gl@${ML_VERSION}/dist/maplibre-gl.css`;
const ML_JS = `https://unpkg.com/maplibre-gl@${ML_VERSION}/dist/maplibre-gl.js`;

declare global {
  interface Window {
    maplibregl?: any;
  }
}

function ensureCss() {
  if (typeof document === 'undefined') return;
  const id = 'echarge-maplibre-css';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = ML_CSS;
  document.head.appendChild(link);
}

function loadMapLibre(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  ensureCss();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('echarge-maplibre-js') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(window.maplibregl));
      existing.addEventListener('error', () => reject(new Error('maplibre script failed')));
      if (window.maplibregl) resolve(window.maplibregl);
      return;
    }
    const script = document.createElement('script');
    script.id = 'echarge-maplibre-js';
    script.src = ML_JS;
    script.async = true;
    script.onload = () => resolve(window.maplibregl);
    script.onerror = () => reject(new Error('maplibre script failed'));
    document.head.appendChild(script);
  });
}

function emptyLine() {
  return {
    type: 'Feature' as const,
    geometry: { type: 'LineString' as const, coordinates: [] as [number, number][] },
    properties: {},
  };
}

/**
 * Web navigation map — MapLibre GL via CDN (pitch + bearing = Waze/Uber).
 * CDN avoids Metro ESM resolution of the npm package.
 */
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
    dark,
    navigationMode,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const mlRef = useRef<any>(null);
  const stationMarkersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const arrow3dRef = useRef<any>(null);
  const arrowPoseRef = useRef({ longitude: 0, latitude: 0, headingDeg: 0, visible: false });
  const [mapReady, setMapReady] = useState(false);
  const [arrow3dReady, setArrow3dReady] = useState(false);
  const perspectiveRef = useRef<MapPerspective>(perspectiveProp ?? (tilt ? 'nav3d' : 'top'));
  const onSelectRef = useRef(onSelect);
  const onMapPressRef = useRef(onMapPress);
  const followRef = useRef(followUser);
  const navigationModeRef = useRef(navigationMode);
  const fittedRef = useRef(false);
  onSelectRef.current = onSelect;
  onMapPressRef.current = onMapPress;
  followRef.current = followUser;
  navigationModeRef.current = navigationMode;

  const perspective = perspectiveProp ?? (tilt ? 'nav3d' : 'top');
  perspectiveRef.current = perspective;
  const resolvedHeight = typeof height === 'number' ? height : undefined;

  const easeTo = (opts: {
    lat: number;
    lng: number;
    heading?: number;
    perspective: MapPerspective;
    /** Transição animada (Troca Topo↔3D) */
    animate?: boolean;
  }) => {
    const map = mapRef.current;
    if (!map) return;
    const preset = PERSPECTIVE_PRESETS[opts.perspective];
    // Só a perspectiva escolhida controla pitch — NÃO forçar 3D por navigationMode
    const nav3d = opts.perspective === 'nav3d';
    const cam = {
      center: [opts.lng, opts.lat] as [number, number],
      zoom: nav3d ? Math.max(preset.zoom, 17.4) : Math.min(preset.zoom, 16),
      pitch: nav3d ? Math.max(preset.pitch, 68) : 0,
      bearing: nav3d ? opts.heading ?? 0 : 0,
      essential: true as const,
      padding: nav3d
        ? { top: 40, bottom: 260, left: 28, right: 28 }
        : { top: 80, bottom: 160, left: 24, right: 24 },
    };
    // Troca Topo↔3D: sempre suave. GPS follow em 3D: curto (sem jump).
    const animate = opts.animate ?? true;
    const duration = opts.animate ? 650 : followRef.current && nav3d ? 280 : 550;
    if (!animate) {
      map.jumpTo({
        center: cam.center,
        zoom: cam.zoom,
        pitch: cam.pitch,
        bearing: cam.bearing,
      });
    } else {
      map.easeTo({ ...cam, duration });
    }
  };

  useImperativeHandle(ref, () => ({
    recenter: (opts) => {
      const p = opts?.perspective ?? perspectiveRef.current;
      perspectiveRef.current = p;
      const lat = opts?.cameraLat ?? opts?.latitude ?? userCoord?.latitude ?? mapConfig.defaultCenter.latitude;
      const lng = opts?.cameraLng ?? opts?.longitude ?? userCoord?.longitude ?? mapConfig.defaultCenter.longitude;
      easeTo({ lat, lng, heading: opts?.heading ?? userHeading ?? 0, perspective: p });
    },
    setPerspective: (p) => {
      perspectiveRef.current = p;
      const target = cameraTarget ?? userCoord ?? mapConfig.defaultCenter;
      easeTo({
        lat: target.latitude,
        lng: target.longitude,
        heading: userHeading ?? 0,
        perspective: p,
        animate: true,
      });
    },
    getProvider: () => (hasMapbox ? 'mapbox' : hasGoogleMaps ? 'google' : 'maplibre'),
  }));

  useEffect(() => {
    let cancelled = false;
    let map: any;

    (async () => {
      try {
        const ML = await loadMapLibre();
        if (cancelled || !containerRef.current || !ML) return;
        mlRef.current = ML;

        const center = focus ?? userCoord ?? mapConfig.defaultCenter;
        // Vetorial OpenFreeMap (prédios 3D) — raster OSM é sempre “plano inclinado”
        const styleUrl = hasMapbox
          ? `https://api.mapbox.com/styles/v1/mapbox/${dark ? 'navigation-night-v1' : 'navigation-day-v1'}?access_token=${mapConfig.mapboxToken}`
          : dark
            ? 'https://tiles.openfreemap.org/styles/dark'
            : 'https://tiles.openfreemap.org/styles/liberty';

        map = new ML.Map({
          container: containerRef.current,
          style: styleUrl,
          center: [center.longitude, center.latitude],
          zoom: perspectiveRef.current === 'nav3d' ? 17.2 : 14,
          pitch: perspectiveRef.current === 'nav3d' ? 68 : 0,
          bearing: 0,
          maxPitch: 85,
          attributionControl: true,
          // Precisa antialias no contexto WebGL compartilhado com Three.js
          canvasContextAttributes: { antialias: true },
        });

        map.addControl(new ML.NavigationControl({ visualizePitch: true }), 'bottom-right');

        const ensure3dBuildings = () => {
          if (map.getLayer('building-3d') || map.getLayer('echarge-3d-buildings')) return;
          const style = map.getStyle();
          const sourceId = style?.sources?.openmaptiles
            ? 'openmaptiles'
            : style?.sources?.composite
              ? 'composite'
              : null;
          if (!sourceId) return;

          let beforeId: string | undefined;
          for (const layer of style.layers ?? []) {
            if (layer.type === 'symbol' && layer.layout?.['text-field']) {
              beforeId = layer.id;
              break;
            }
          }

          // Esconde fill 2D de prédios para não “achatar” sob a extrusão
          if (map.getLayer('building')) {
            try {
              map.setLayoutProperty('building', 'visibility', 'none');
            } catch {
              /* ok */
            }
          }

          map.addLayer(
            {
              id: 'echarge-3d-buildings',
              source: sourceId,
              'source-layer': 'building',
              type: 'fill-extrusion',
              minzoom: 14,
              filter: ['!=', ['get', 'hide_3d'], true],
              paint: {
                'fill-extrusion-color': dark ? '#3a3a3a' : '#d6cfc4',
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  14,
                  0,
                  15.5,
                  ['coalesce', ['get', 'render_height'], ['get', 'height'], 10],
                ],
                'fill-extrusion-base': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  14,
                  0,
                  15.5,
                  ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
                ],
                'fill-extrusion-opacity': 0.88,
              },
            },
            beforeId,
          );
        };

        map.on('load', () => {
          if (cancelled) return;
          ensure3dBuildings();
          map.addSource('route-alts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          map.addSource('route-remain', { type: 'geojson', data: emptyLine() });
          map.addSource('route-traveled', { type: 'geojson', data: emptyLine() });
          map.addLayer({
            id: 'route-alts-line',
            type: 'line',
            source: 'route-alts',
            paint: { 'line-color': '#94A3B8', 'line-width': 5, 'line-opacity': 0.55 },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          });
          map.addLayer({
            id: 'route-traveled-line',
            type: 'line',
            source: 'route-traveled',
            paint: { 'line-color': '#9CA3AF', 'line-width': 6, 'line-opacity': 0.75 },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          });
          map.addLayer({
            id: 'route-remain-casing',
            type: 'line',
            source: 'route-remain',
            paint: { 'line-color': '#0B1220', 'line-width': 12, 'line-opacity': 0.28 },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          });
          map.addLayer({
            id: 'route-remain-line',
            type: 'line',
            source: 'route-remain',
            paint: { 'line-color': '#276EF1', 'line-width': 7 },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          });

          // Style load pode resetar a câmera — reaplica 3D imediatamente
          const p = perspectiveRef.current;
          const preset = PERSPECTIVE_PRESETS[p];
          const nav3d = p === 'nav3d';
          map.jumpTo({
            pitch: nav3d ? Math.max(preset.pitch, 68) : 0,
            zoom: nav3d ? Math.max(preset.zoom, 17.4) : 15,
            bearing: 0,
          });

          if (typeof window !== 'undefined') {
            (window as any).__echargeMap = map;
          }

          // Seta 3D real (Three.js) — camada WebGL no mapa
          createWazeArrow3dLayer(ML)
            .then((layer) => {
              if (cancelled || !mapRef.current) return;
              arrow3dRef.current = layer;
              if (!map.getLayer(layer.id)) {
                map.addLayer(layer);
              }
              layer.setPose(arrowPoseRef.current);
              map.triggerRepaint();
              setArrow3dReady(true);
            })
            .catch((err) => console.warn('[MapCanvas.web] 3D arrow failed', err));

          setMapReady(true);
        });

        map.on('click', (e: any) => {
          onMapPressRef.current?.({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
        });

        mapRef.current = map;
      } catch (e) {
        console.warn('[MapCanvas.web] MapLibre failed', e);
      }
    })();

    return () => {
      cancelled = true;
      setMapReady(false);
      setArrow3dReady(false);
      stationMarkersRef.current.forEach((m) => m.remove());
      stationMarkersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      try {
        if (map && arrow3dRef.current && map.getLayer?.(arrow3dRef.current.id)) {
          map.removeLayer(arrow3dRef.current.id);
        }
      } catch {
        /* ok */
      }
      arrow3dRef.current = null;
      map?.remove();
      mapRef.current = null;
    };
  }, [dark]);

  useEffect(() => {
    const map = mapRef.current;
    const ML = mlRef.current;
    if (!mapReady || !map || !ML) return;

    stationMarkersRef.current.forEach((m) => m.remove());
    stationMarkersRef.current = [];

    stations.forEach((s) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.style.border = 'none';
      el.style.cursor = 'pointer';
      el.style.padding = '0';
      el.style.background = 'transparent';
      const selected = selectedStationId === s.id;
      el.innerHTML = showPrices
        ? `<div style="background:#000;color:#fff;border-radius:16px;padding:6px 10px;font:700 11px/1.2 'Plus Jakarta Sans',system-ui,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.25);border:2px solid ${selected ? '#276EF1' : '#000'};white-space:nowrap">R$ ${Number(s.min_price).toFixed(2).replace('.', ',')}</div>`
        : `<div style="width:28px;height:28px;border-radius:14px;background:${selected ? '#276EF1' : '#000'};border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.3)"></div>`;
      el.onclick = (ev) => {
        ev.stopPropagation();
        onSelectRef.current?.(s.id);
      };
      const marker = new ML.Marker({ element: el }).setLngLat([s.longitude, s.latitude]).addTo(map);
      stationMarkersRef.current.push(marker);
    });
  }, [stations, showPrices, selectedStationId, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const remain = (routeCoordinates ?? []).map((c) => [c.longitude, c.latitude] as [number, number]);
    const traveled = (traveledCoordinates ?? []).map((c) => [c.longitude, c.latitude] as [number, number]);
    const altFeatures =
      showRoute && alternativeRoutes?.length
        ? alternativeRoutes
            .filter((line) => line.length > 1)
            .map((line, i) => ({
              type: 'Feature' as const,
              properties: { i },
              geometry: {
                type: 'LineString' as const,
                coordinates: line.map((c) => [c.longitude, c.latitude] as [number, number]),
              },
            }))
        : [];
    try {
      map.getSource('route-alts')?.setData({
        type: 'FeatureCollection',
        features: altFeatures,
      });
      map.getSource('route-remain')?.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: showRoute && remain.length > 1 ? remain : [] },
        properties: {},
      });
      map.getSource('route-traveled')?.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: showRoute && traveled.length > 1 ? traveled : [] },
        properties: {},
      });
    } catch {
      // style loading
    }
  }, [showRoute, routeCoordinates, traveledCoordinates, alternativeRoutes, mapReady]);

  // Puck: mesh Three.js no 3D | SVG no Topo (câmera de perspectiva fica no effect abaixo)
  useEffect(() => {
    const map = mapRef.current;
    const ML = mlRef.current;
    if (!mapReady || !map || !ML) return;

    const heading = userHeading ?? 0;
    const nav3d = perspective === 'nav3d';
    const show = !hideUserMarker && !!userCoord;
    const useMesh3d = nav3d && arrow3dReady && !!arrow3dRef.current;

    arrowPoseRef.current = {
      longitude: userCoord?.longitude ?? 0,
      latitude: userCoord?.latitude ?? 0,
      headingDeg: heading,
      visible: !!(show && useMesh3d),
    };
    arrow3dRef.current?.setPose?.(arrowPoseRef.current);

    if (!show || useMesh3d) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
    } else if (userCoord) {
      const html = `<div style="width:56px;height:56px;display:flex;align-items:center;justify-content:center;pointer-events:none">
            <div style="position:absolute;width:44px;height:44px;border-radius:22px;background:rgba(51,204,255,0.22)"></div>
            <svg width="36" height="42" viewBox="0 0 44 52" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,.35));display:block">
              <path d="M22 2 L40 46 L22 36 L4 46 Z" fill="#fff"/>
              <path d="M22 7 L35.5 42 L22 33.5 L8.5 42 Z" fill="#00C8F0"/>
            </svg>
          </div>`;
      if (!userMarkerRef.current) {
        const el = document.createElement('div');
        el.innerHTML = html;
        const marker = new ML.Marker({
          element: el,
          rotationAlignment: 'map',
          pitchAlignment: 'map',
          rotation: heading,
          anchor: 'center',
        });
        marker.setLngLat([userCoord.longitude, userCoord.latitude]);
        if (typeof marker.setRotation === 'function') marker.setRotation(heading);
        marker.addTo(map);
        userMarkerRef.current = marker;
      } else {
        const el = userMarkerRef.current.getElement?.();
        if (el) el.innerHTML = html;
        userMarkerRef.current.setLngLat([userCoord.longitude, userCoord.latitude]);
        userMarkerRef.current.setRotation(heading);
      }
    }
  }, [
    userCoord?.latitude,
    userCoord?.longitude,
    userHeading,
    hideUserMarker,
    perspective,
    mapReady,
    arrow3dReady,
  ]);

  // Follow GPS — sem `perspective` nas deps (evita jump Topo→3D)
  useEffect(() => {
    if (!mapReady || !followUser || !userCoord) return;
    const target = cameraTarget ?? userCoord;
    easeTo({
      lat: target.latitude,
      lng: target.longitude,
      heading: userHeading ?? 0,
      perspective: perspectiveRef.current,
    });
  }, [
    userCoord?.latitude,
    userCoord?.longitude,
    userHeading,
    followUser,
    cameraTarget?.latitude,
    cameraTarget?.longitude,
    mapReady,
  ]);



  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || followUser || !focus) return;
    map.easeTo({ center: [focus.longitude, focus.latitude], duration: 500 });
  }, [focus?.latitude, focus?.longitude, followUser, mapReady]);

  // Quando o GPS real chega (ou muda muito), voa até a posição — não fica preso na Sé
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !userCoord || followUser || showRoute || navigationMode) return;
    const lat = userCoord.latitude;
    const lng = userCoord.longitude;
    const jumped =
      !fittedRef.current ||
      Math.abs(lat - mapConfig.defaultCenter.latitude) > 0.02 ||
      Math.abs(lng - mapConfig.defaultCenter.longitude) > 0.02;
    // Só auto-fit na primeira vez OU se saiu do hub SP padrão
    if (!fittedRef.current) {
      map.easeTo({ center: [lng, lat], zoom: 15, duration: 700 });
      fittedRef.current = true;
      return;
    }
    if (jumped && hideUserMarker === false) {
      map.easeTo({ center: [lng, lat], zoom: 15, duration: 700 });
    }
  }, [
    userCoord?.latitude,
    userCoord?.longitude,
    followUser,
    showRoute,
    navigationMode,
    mapReady,
    hideUserMarker,
  ]);

  useEffect(() => {
    if (!mapReady) return;
    perspectiveRef.current = perspective;
    const target = cameraTarget ?? userCoord ?? mapConfig.defaultCenter;
    easeTo({
      lat: target.latitude,
      lng: target.longitude,
      heading: userHeading ?? 0,
      perspective,
      animate: true,
    });
  }, [perspective, mapReady]);

  return (
    <View
      style={[
        {
          height: resolvedHeight,
          flex: resolvedHeight ? undefined : 1,
          width: '100%',
          overflow: 'hidden',
          backgroundColor: dark ? '#111' : '#E8E8E8',
        },
        style,
      ]}
    >
      {React.createElement('div', {
        ref: containerRef,
        style: { width: '100%', height: '100%' },
      })}
    </View>
  );
});
