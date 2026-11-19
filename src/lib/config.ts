export const mapConfig = {
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '',
  defaultCenter: { latitude: -23.5505, longitude: -46.6333 },
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
