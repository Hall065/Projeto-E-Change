import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ChargingRing } from '../../../src/components/ChargingRing';
import { Button, Screen } from '../../../src/components/ui';
import { useJourney } from '../../../src/context/JourneyContext';
import { useVehicle } from '../../../src/context/VehicleContext';
import { formatBRL } from '../../../src/lib/format';
import {
  CHARGE_SPEED_PRESETS,
  getDemoSession,
  isDemoSessionId,
  type ChargeSimSpeed,
} from '../../../src/services/demoSession';
import { endSession, tickSession } from '../../../src/services/journey';
import { colors } from '../../../src/theme/colors';
import { fontFamily } from '../../../src/theme/fonts';

export default function SessionScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = rawId ? decodeURIComponent(rawId) : rawId;
  const { station, session, setSession, connectorId } = useJourney();
  const { setBatteryPercent } = useVehicle();
  const [loading, setLoading] = useState(false);
  const [tickError, setTickError] = useState<string | null>(null);
  const [speed, setSpeed] = useState<ChargeSimSpeed>('normal');
  const [paused, setPaused] = useState(false);
  const finishingRef = useRef(false);
  const speedRef = useRef(speed);
  const lastTickRef = useRef(Date.now());
  speedRef.current = speed;

  useEffect(() => {
    if (session?.id === id) return;
    if (!id) return;
    if (isDemoSessionId(id)) {
      const local = getDemoSession(id);
      if (local) setSession(local);
    }
  }, [id, session?.id, setSession]);

  const price = useMemo(() => {
    const c = (station?.connectors ?? []).find((x) => x.id === (connectorId ?? session?.connector_id));
    return Number(c?.price_per_kwh ?? station?.min_price ?? 1.75);
  }, [station, connectorId, session]);

  const connectorLabel = useMemo(() => {
    const c = (station?.connectors ?? []).find((x) => x.id === (connectorId ?? session?.connector_id));
    return c ? `${c.label} · ${c.connector_type}` : 'Conector';
  }, [station, connectorId, session]);

  const finish = async (sessionId?: string, connId?: string | null) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    try {
      setLoading(true);
      const sid = sessionId ?? session?.id;
      const cid = connId ?? connectorId ?? session?.connector_id;
      if (sid && cid) {
        const ended = await endSession(sid, cid, price);
        setSession(ended);
        setBatteryPercent(Number(ended.battery_percent));
        router.push(`/(customer)/bill/${ended.id}`);
      } else if (id) {
        router.push(`/(customer)/bill/${id}`);
      }
    } catch (e: any) {
      setTickError(e?.message ?? 'Não foi possível encerrar');
      finishingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  // Loop contínuo (~150 ms): a % sobe com batteryPerSec da velocidade atual
  useEffect(() => {
    if (!session?.id || session.status !== 'charging' || paused) return;
    const sessionId = session.id;
    const connId = connectorId ?? session.connector_id;
    let cancelled = false;
    let busy = false;
    lastTickRef.current = Date.now();

    const tick = async () => {
      if (cancelled || finishingRef.current || busy) return;
      busy = true;
      const now = Date.now();
      const dt = Math.min(0.5, Math.max(0.05, (now - lastTickRef.current) / 1000));
      lastTickRef.current = now;
      const currentSpeed = speedRef.current;
      try {
        const next = await tickSession(sessionId, price, currentSpeed, dt);
        if (cancelled || finishingRef.current) return;
        setSession(next);
        setBatteryPercent(Number(next.battery_percent));
        setTickError(null);
        if (Number(next.battery_percent) >= 99.5) {
          await finish(sessionId, connId);
        }
      } catch (e: any) {
        if (!cancelled) setTickError(e?.message ?? 'Falha ao atualizar sessão');
      } finally {
        busy = false;
      }
    };

    const timer = setInterval(() => {
      void tick();
    }, 150);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session?.id, session?.status, session?.connector_id, connectorId, price, setSession, paused, setBatteryPercent]);

  const local = session ?? {
    id: id ?? 'pending',
    battery_percent: 28,
    energy_kwh: 0,
    power_kw: 0,
    elapsed_minutes: 0,
    estimated_cost: 0,
    status: 'charging' as const,
  };

  const charging = session?.status === 'charging' && !paused;
  const rate = CHARGE_SPEED_PRESETS[speed].batteryPerSec;

  return (
    <Screen dark style={{ backgroundColor: colors.dark }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center' }}>
            <Text style={styles.kicker}>SESSÃO AO VIVO</Text>
            <Text style={styles.title}>{paused ? 'Pausado' : 'Carregando…'}</Text>
            <Text style={styles.sub}>
              {station?.name ?? 'Posto'} · {connectorLabel}
            </Text>
            <ChargingRing
              percent={Number(local.battery_percent)}
              dark
              animMs={speed === 'veryFast' ? 180 : speed === 'fast' ? 320 : 550}
            />
            <Text style={styles.rateHint}>
              Bateria +{rate.toFixed(1).replace('.', ',')}%/s · {CHARGE_SPEED_PRESETS[speed].label}
            </Text>
          </Animated.View>

          <Text style={styles.speedTitle}>Velocidade da simulação</Text>
          <View style={styles.speedRow}>
            {(Object.keys(CHARGE_SPEED_PRESETS) as ChargeSimSpeed[]).map((key) => {
              const active = speed === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setSpeed(key)}
                  style={[styles.speedBtn, active && styles.speedBtnActive]}
                >
                  <Text style={[styles.speedLabel, active && styles.speedLabelActive]}>
                    {CHARGE_SPEED_PRESETS[key].label}
                  </Text>
                  <Text style={[styles.speedMeta, active && styles.speedMetaActive]}>
                    +{CHARGE_SPEED_PRESETS[key].batteryPerSec.toFixed(0)}%/s
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.simBar}>
            <Text style={styles.simText}>
              {charging
                ? `Simulando · ${CHARGE_SPEED_PRESETS[speed].label}`
                : paused
                  ? 'Simulação pausada'
                  : 'Sessão'}
            </Text>
            <Pressable onPress={() => setPaused((p) => !p)} style={styles.simAction}>
              <Text style={styles.simActionText}>{paused ? 'Retomar' : 'Pausar'}</Text>
            </Pressable>
          </View>

          <View style={styles.grid}>
            <View style={styles.statDark}>
              <Text style={styles.statLabel}>Energia</Text>
              <Text style={styles.statValue}>{Number(local.energy_kwh).toFixed(1)} kWh</Text>
            </View>
            <View style={styles.statDark}>
              <Text style={styles.statLabel}>Potência</Text>
              <Text style={styles.statValue}>{Number(local.power_kw).toFixed(0)} kW</Text>
            </View>
            <View style={styles.statDark}>
              <Text style={styles.statLabel}>Tempo</Text>
              <Text style={styles.statValue}>{local.elapsed_minutes} min</Text>
            </View>
            <View style={styles.statDark}>
              <Text style={styles.statLabel}>Custo est.</Text>
              <Text style={styles.statValue}>{formatBRL(Number(local.estimated_cost))}</Text>
            </View>
          </View>

          {tickError ? <Text style={styles.err}>{tickError}</Text> : null}

          <Button title="Encerrar carregamento" onPress={() => void finish()} loading={loading} />
          <Text style={styles.hint}>
            Troque a velocidade a qualquer momento — a % sobe mais rápido ou mais devagar na hora.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  kicker: {
    color: colors.accent,
    fontFamily: fontFamily.extrabold,
    letterSpacing: 1.2,
    fontSize: 11,
  },
  title: {
    fontSize: 26,
    fontFamily: fontFamily.extrabold,
    color: colors.white,
    marginTop: 8,
  },
  sub: { color: '#A7B39A', marginTop: 6, marginBottom: 4, fontFamily: fontFamily.medium },
  rateHint: {
    color: '#9EC1FF',
    fontFamily: fontFamily.bold,
    fontSize: 12,
    marginBottom: 4,
  },
  speedTitle: {
    color: '#8B9580',
    fontFamily: fontFamily.bold,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  speedRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  speedBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.darkCard,
    borderWidth: 1,
    borderColor: '#2A3328',
    gap: 2,
  },
  speedBtnActive: {
    backgroundColor: '#276EF1',
    borderColor: '#276EF1',
  },
  speedLabel: {
    color: '#C6D0BE',
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  speedLabelActive: { color: '#fff' },
  speedMeta: {
    color: '#6B7568',
    fontFamily: fontFamily.medium,
    fontSize: 10,
  },
  speedMetaActive: { color: 'rgba(255,255,255,0.75)' },
  simBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(39,110,241,0.22)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(39,110,241,0.35)',
  },
  simText: { color: '#fff', fontFamily: fontFamily.bold, fontSize: 12 },
  simAction: { paddingHorizontal: 6 },
  simActionText: { color: '#9EC1FF', fontFamily: fontFamily.bold, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%', marginBottom: 8 },
  statDark: {
    width: '48%',
    backgroundColor: colors.darkCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A3328',
  },
  statLabel: { color: '#8B9580', fontSize: 12, fontFamily: fontFamily.semibold },
  statValue: { color: colors.white, fontSize: 18, fontFamily: fontFamily.extrabold, marginTop: 4 },
  err: { color: '#FF8A80', marginBottom: 8, fontFamily: fontFamily.medium },
  hint: { color: '#8B9580', fontSize: 12, marginTop: 10, textAlign: 'center' },
});
