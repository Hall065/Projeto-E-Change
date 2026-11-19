import { paymentConfig, hasMercadoPago } from '../lib/config';

/** CRC16-CCITT (0x1021) para payload Pix EMV */
function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(id: string, value: string) {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/** Gera BR Code Pix estático (copia-e-cola + QR) */
export function buildPixPayload(input: {
  amount: number;
  txid?: string;
  description?: string;
  key?: string;
}) {
  const key = input.key ?? paymentConfig.pixKey;
  const merchant = paymentConfig.pixMerchantName.slice(0, 25);
  const city = paymentConfig.pixMerchantCity.slice(0, 15);
  const txid = (input.txid ?? 'ECHARGEMAP').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || 'ECHARGEMAP';
  const amount = input.amount.toFixed(2);

  const gui = tlv('00', 'br.gov.bcb.pix') + tlv('01', key) + (input.description ? tlv('02', input.description.slice(0, 50)) : '');
  const merchantAccount = tlv('26', gui);

  const base =
    tlv('00', '01') +
    tlv('01', '12') +
    merchantAccount +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', amount) +
    tlv('58', 'BR') +
    tlv('59', merchant) +
    tlv('60', city) +
    tlv('62', tlv('05', txid)) +
    '6304';

  return base + crc16(base);
}

export type PixCharge = {
  payload: string;
  qrValue: string;
  amount: number;
  provider: 'local' | 'mercadopago';
  externalId?: string;
  ticketUrl?: string;
};

export async function createPixCharge(input: {
  amount: number;
  description: string;
  sessionId: string;
}): Promise<PixCharge> {
  if (hasMercadoPago) {
    try {
      const res = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paymentConfig.mercadoPagoAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': input.sessionId,
        },
        body: JSON.stringify({
          transaction_amount: Number(input.amount.toFixed(2)),
          description: input.description,
          payment_method_id: 'pix',
          payer: { email: 'cliente@echarge.demo' },
        }),
      });
      const json = await res.json();
      if (res.ok && json?.point_of_interaction?.transaction_data?.qr_code) {
        return {
          payload: json.point_of_interaction.transaction_data.qr_code,
          qrValue: json.point_of_interaction.transaction_data.qr_code,
          amount: input.amount,
          provider: 'mercadopago',
          externalId: String(json.id),
          ticketUrl: json.point_of_interaction.transaction_data.ticket_url,
        };
      }
      console.warn('Mercado Pago Pix fallback:', json?.message ?? json);
    } catch (e) {
      console.warn('Mercado Pago unavailable, using local Pix', e);
    }
  }

  const payload = buildPixPayload({
    amount: input.amount,
    txid: input.sessionId.replace(/-/g, '').slice(0, 25),
    description: input.description,
  });

  return {
    payload,
    qrValue: payload,
    amount: input.amount,
    provider: 'local',
  };
}
