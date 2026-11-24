import type { LatLng } from '../services/routing';

/** Perspectivas de navegação — nativo + MapLibre web com pitch/bearing reais. */
export type MapPerspective = 'top' | 'nav3d';

export type MapCameraState = {
  center: LatLng;
  /** 0 = norte para cima (top); heading do dispositivo/rota em 3D */
  heading: number;
  /** 0 = vista de cima; ~55–65 = navegação 3D */
  pitch: number;
  zoom: number;
  perspective: MapPerspective;
};

export const PERSPECTIVE_PRESETS: Record<
  MapPerspective,
  Pick<MapCameraState, 'pitch' | 'zoom'>
> = {
  top: { pitch: 0, zoom: 15 },
  /** Pitch alto + zoom ≥16 para prédios extrudados (OpenFreeMap building-3d) */
  nav3d: { pitch: 68, zoom: 17.6 },
};

export type MapProviderId = 'maplibre' | 'leaflet' | 'apple' | 'google' | 'mapbox';

/**
 * Contrato para trocar o provedor de mapa sem reescrever a navegação.
 * Implementações futuras: Google Maps JS / Mapbox GL / react-native-maps providers.
 */
export type MapCameraController = {
  provider: MapProviderId;
  supportsTrue3d: boolean;
  setPerspective: (perspective: MapPerspective) => void;
  recenter: (camera: Partial<MapCameraState> & { center?: LatLng }) => void;
};
