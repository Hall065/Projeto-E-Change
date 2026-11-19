export function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPriceKwh(value: number) {
  return `${formatBRL(value)}/kWh`;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function etaMinutes(distanceKm: number, avgSpeedKmh = 28) {
  return Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60));
}

export function maskSensitive(value?: string | null) {
  if (!value) return '—';
  if (value.length < 5) return '***';
  return `${value.slice(0, 3)}.***.***-${value.slice(-2)}`;
}
