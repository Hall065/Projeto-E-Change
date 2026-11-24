/** Escola SENAI "Luiz Varga" — Limeira/SP (fallback quando GPS está bloqueado, ex.: PCs do SENAI). */
export const SENAI_LUIZ_VARGA = {
  name: 'SENAI Luiz Varga',
  address: 'Praça Prof. Antonio de Queiroz, 72 — Jardim Mercedes, Limeira/SP',
  cep: '13480-251',
  latitude: -22.5710758,
  longitude: -47.4039549,
  label: 'SENAI Luiz Varga · Limeira',
} as const;

export const mapConfig = {
  /** Opcional: ativa Google Maps nativo (Android) / JS no futuro */
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  /** Opcional: Mapbox GL 3D real no web — ver src/maps/README.md */
  mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '',
  /**
   * Centro padrão = campus SENAI Luiz Varga (Limeira).
   * Usado antes do GPS e como fallback quando a localização do dispositivo é negada/bloqueada.
   */
  defaultCenter: {
    latitude: SENAI_LUIZ_VARGA.latitude,
    longitude: SENAI_LUIZ_VARGA.longitude,
  },
  fallbackCampus: SENAI_LUIZ_VARGA,
  /** Estilo vetorial gratuito com prédios 3D (MapLibre) */
  openFreeMapStyle: 'https://tiles.openfreemap.org/styles/liberty',
  openFreeMapStyleDark: 'https://tiles.openfreemap.org/styles/dark',
};

export const paymentConfig = {
  /** Se definido, tenta criar cobrança Pix via Mercado Pago */
  mercadoPagoAccessToken: process.env.EXPO_PUBLIC_MERCADOPAGO_ACCESS_TOKEN ?? '',
  mercadoPagoPublicKey: process.env.EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? '',
  pixMerchantName: 'E-CHARGE MAP',
  pixMerchantCity: 'LIMEIRA',
  /** Chave Pix demo (e-mail) — troque pela chave real do recebedor */
  pixKey: process.env.EXPO_PUBLIC_PIX_KEY ?? 'pagamentos@echargemap.app',
};

export const hasGoogleMaps = Boolean(mapConfig.googleMapsApiKey);
export const hasMapbox = Boolean(mapConfig.mapboxToken);
export const hasMercadoPago = Boolean(paymentConfig.mercadoPagoAccessToken);
