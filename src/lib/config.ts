export const mapConfig = {
  /** Opcional: ativa Google Maps nativo (Android) / JS no futuro */
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  /** Opcional: Mapbox GL 3D real no web — ver src/maps/README.md */
  mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '',
  /**
   * Parque do mapa (Praça da Sé) — NÃO é a posição do usuário.
   * Só usado para centralizar o mapa antes do GPS; o puck só aparece com hasFix.
   */
  defaultCenter: { latitude: -23.5505, longitude: -46.6333 },
  /** Estilo vetorial gratuito com prédios 3D (MapLibre) */
  openFreeMapStyle: 'https://tiles.openfreemap.org/styles/liberty',
  openFreeMapStyleDark: 'https://tiles.openfreemap.org/styles/dark',
};

export const paymentConfig = {
  /** Se definido, tenta criar cobrança Pix via Mercado Pago */
  mercadoPagoAccessToken: process.env.EXPO_PUBLIC_MERCADOPAGO_ACCESS_TOKEN ?? '',
  mercadoPagoPublicKey: process.env.EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? '',
  pixMerchantName: 'E-CHARGE MAP',
  pixMerchantCity: 'SAO PAULO',
  /** Chave Pix demo (e-mail) — troque pela chave real do recebedor */
  pixKey: process.env.EXPO_PUBLIC_PIX_KEY ?? 'pagamentos@echargemap.app',
};

export const hasGoogleMaps = Boolean(mapConfig.googleMapsApiKey);
export const hasMapbox = Boolean(mapConfig.mapboxToken);
export const hasMercadoPago = Boolean(paymentConfig.mercadoPagoAccessToken);
