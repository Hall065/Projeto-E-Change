import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Card, Chip, Screen, Subtitle, Title } from '../../../src/components/ui';
import { useAuth } from '../../../src/context/AuthContext';
import { useJourney } from '../../../src/context/JourneyContext';
import { formatBRL } from '../../../src/lib/format';
import { hasMercadoPago } from '../../../src/lib/config';
import { createPayment, markPaymentPaid } from '../../../src/services/journey';
import { createPixCharge } from '../../../src/services/pix';
import type { PaymentMethod } from '../../../src/types/database';
import { colors } from '../../../src/theme/colors';

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { session, payment, setPayment, resetJourney } = useJourney();
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);
  const [pixCode, setPixCode] = useState<string>('');
  const [provider, setProvider] = useState<'local' | 'mercadopago'>('local');
  const amount = Number(session?.final_cost ?? session?.estimated_cost ?? 60.13);

  useEffect(() => {
    const boot = async () => {
      const charge = await createPixCharge({
        amount,
        description: `Recarga E-Charge Map #${(session?.id ?? id).slice(0, 8)}`,
        sessionId: session?.id ?? String(id),
      });
      setPixCode(charge.qrValue);
      setProvider(charge.provider);

      if (!user || !session?.id || payment) return;
      try {
        const p = await createPayment({
          sessionId: session.id,
          userId: user.id,
          amount,
          method: 'pix',
          pixPayload: charge.payload,
        });
        setPayment(p);
      } catch (e) {
        console.warn(e);
      }
    };
    boot();
  }, [user, session?.id]);

  const copy = async () => {
    await Clipboard.setStringAsync(pixCode || payment?.pix_payload || '');
    Alert.alert('Pix', 'Código copia-e-cola copiado!');
  };

  const pay = async () => {
    try {
      setLoading(true);
      if (payment?.id) {
        const paid = await markPaymentPaid(payment.id);
        setPayment(paid);
      }
      Alert.alert('Pagamento confirmado', 'Obrigado! Sua recarga foi finalizada.', [
        {
          text: 'Voltar ao mapa',
          onPress: () => {
            resetJourney();
            router.replace('/(customer)/map');
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Pagamento', e.message ?? 'Falha no pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Title>Pay with Pix</Title>
          <Subtitle>
            {provider === 'mercadopago'
              ? 'Cobrança gerada via Mercado Pago'
              : hasMercadoPago
                ? 'Fallback local (MP indisponível)'
                : 'Pix local EMV — configure MP no .env para produção'}
          </Subtitle>
          <Animated.View entering={FadeInDown.duration(400)}>
            <Card style={{ alignItems: 'center' }}>
              <Text style={styles.label}>Total</Text>
              <Text style={styles.total}>{formatBRL(amount)}</Text>
            </Card>
          </Animated.View>
          <View style={styles.chips}>
            <Chip label="Pix" active={method === 'pix'} onPress={() => setMethod('pix')} />
            <Chip label="Credit card" active={method === 'card'} onPress={() => setMethod('card')} />
          </View>
          {method === 'pix' ? (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <Card style={{ alignItems: 'center' }}>
                <View style={styles.qrWrap}>
                  {!!pixCode && <QRCode value={pixCode} size={190} backgroundColor="#fff" color="#0B0D0A" />}
                </View>
                <Text style={styles.pix} numberOfLines={3}>{pixCode}</Text>
                <Button title="Copy Key" ghost onPress={copy} />
              </Card>
            </Animated.View>
          ) : (
            <Card>
              <Text style={styles.label}>Cartão tokenizado</Text>
              <Text style={styles.meta}>
                Em produção: Stripe Elements / Mercado Pago Card Form. Nunca armazenamos PAN/CVV.
              </Text>
            </Card>
          )}
          <Button title="I have paid" onPress={pay} loading={loading} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  label: { color: colors.muted, fontSize: 12 },
  total: { fontSize: 36, fontWeight: '900', color: colors.primary, marginTop: 4 },
  chips: { flexDirection: 'row', marginTop: 12 },
  qrWrap: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 4,
  },
  pix: { marginTop: 12, color: colors.muted, fontSize: 11, textAlign: 'center' },
  meta: { color: colors.muted, marginTop: 10, fontSize: 13, lineHeight: 20 },
});
