import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BatteryBadge } from '../../../src/components/BatteryBadge';
import { useAuth } from '../../../src/context/AuthContext';
import { useVehicle } from '../../../src/context/VehicleContext';
import { maskSensitive } from '../../../src/lib/format';
import { useTheme } from '../../../src/theme/ThemeContext';
import { elevation, radius } from '../../../src/theme/tokens';
import type { ConnectorType } from '../../../src/types/database';

const CONNECTORS: ConnectorType[] = ['CCS', 'CHAdeMO', 'Type2'];

export default function ProfileScreen() {
  const { colors, mode, setMode, isDark } = useTheme();
  const { profile, user, signOut } = useAuth();
  const { vehicle, battery, setBatteryPercent, updateVehicle } = useVehicle();
  const [batteryInput, setBatteryInput] = useState(String(battery.percent));

  const applyBattery = () => {
    const n = Number(batteryInput.replace(',', '.'));
    if (Number.isNaN(n)) {
      Alert.alert('Bateria', 'Informe um percentual válido (1–100).');
      return;
    }
    setBatteryPercent(n);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={[styles.title, { color: colors.ink }]}>Perfil</Text>

          <View style={[styles.card, elevation.soft, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  {(profile?.full_name ?? 'U').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.ink }]}>{profile?.full_name ?? 'Visitante'}</Text>
                <Text style={{ color: colors.muted, marginTop: 3, fontSize: 12 }}>
                  {profile?.email ?? user?.email ?? 'Não autenticado'}
                </Text>
                <Text style={{ color: colors.muted, marginTop: 3, fontSize: 12 }}>
                  {profile?.role ?? 'customer'} · CPF {maskSensitive(profile?.cpf_cnpj)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={[styles.section, { color: colors.ink }]}>Aparência</Text>
          <View style={styles.themeRow}>
            {(['system', 'light', 'dark'] as const).map((m) => {
              const active = mode === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.line,
                    },
                  ]}
                >
                  <Text style={{ color: active ? '#fff' : colors.ink, fontWeight: '800', fontSize: 12 }}>
                    {m === 'system' ? 'Sistema' : m === 'light' ? 'Claro' : 'Escuro'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>
            Atual: {isDark ? 'escuro' : 'claro'}
          </Text>

          <Text style={[styles.section, { color: colors.ink }]}>Veículo (cadastro manual)</Text>
          <View style={[styles.card, elevation.soft, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Field
              label="Fabricante"
              value={vehicle.make}
              onChange={(t) => updateVehicle({ make: t })}
              colors={colors}
            />
            <Field
              label="Modelo"
              value={vehicle.model}
              onChange={(t) => updateVehicle({ model: t })}
              colors={colors}
            />
            <Field
              label="Capacidade útil (kWh)"
              value={String(vehicle.usableBatteryKwh)}
              keyboardType="decimal-pad"
              onChange={(t) => updateVehicle({ usableBatteryKwh: Number(t.replace(',', '.')) || vehicle.usableBatteryKwh })}
              colors={colors}
            />
            <Field
              label="Consumo (kWh/100 km)"
              value={String(vehicle.consumptionKwhPer100km)}
              keyboardType="decimal-pad"
              onChange={(t) =>
                updateVehicle({
                  consumptionKwhPer100km: Number(t.replace(',', '.')) || vehicle.consumptionKwhPer100km,
                })
              }
              colors={colors}
            />
            <Field
              label="Potência máx. carga (kW)"
              value={String(vehicle.maxChargeKw)}
              keyboardType="decimal-pad"
              onChange={(t) => updateVehicle({ maxChargeKw: Number(t.replace(',', '.')) || vehicle.maxChargeKw })}
              colors={colors}
            />
            <Field
              label="Reserva mínima (%)"
              value={String(vehicle.reservePercent)}
              keyboardType="number-pad"
              onChange={(t) => updateVehicle({ reservePercent: Number(t) || vehicle.reservePercent })}
              colors={colors}
            />

            <Text style={{ color: colors.muted, marginTop: 10, marginBottom: 6, fontWeight: '700' }}>Conectores</Text>
            <View style={styles.themeRow}>
              {CONNECTORS.map((c) => {
                const active = vehicle.connectors.includes(c);
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      const next = active
                        ? vehicle.connectors.filter((x) => x !== c)
                        : [...vehicle.connectors, c];
                      updateVehicle({ connectors: next.length ? next : [c] });
                    }}
                    style={[
                      styles.themeChip,
                      {
                        backgroundColor: active ? colors.battery : colors.ghost,
                        borderColor: active ? colors.battery : colors.ghostBorder,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? '#fff' : colors.ink, fontWeight: '800', fontSize: 12 }}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text style={[styles.section, { color: colors.ink }]}>Estado de carga (manual)</Text>
          <View style={[styles.card, elevation.soft, { backgroundColor: colors.surface, borderColor: colors.line, gap: 10 }]}>
            <BatteryBadge percent={battery.percent} />
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              Fonte: {battery.source} — não é telemetria do veículo. Atualizado em{' '}
              {new Date(battery.updatedAt).toLocaleString('pt-BR')}
            </Text>
            <View style={styles.row}>
              <TextInput
                value={batteryInput}
                onChangeText={setBatteryInput}
                keyboardType="decimal-pad"
                placeholder="%"
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.bg, flex: 1 }]}
              />
              <Pressable onPress={applyBattery} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Salvar</Text>
              </Pressable>
            </View>
          </View>

          {user ? (
            <Pressable
              style={[styles.dangerBtn, { backgroundColor: colors.danger }]}
              onPress={async () => {
                await signOut();
                router.replace('/(auth)/welcome');
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Sair</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.dangerBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Entrar</Text>
            </Pressable>
          )}

          {profile?.role === 'admin' ? (
            <Pressable onPress={() => router.push('/(admin)')} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.primary, fontWeight: '800' }}>Abrir painel Admin</Text>
            </Pressable>
          ) : null}
          {profile?.role === 'owner' ? (
            <Pressable onPress={() => router.push('/(owner)')} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.primary, fontWeight: '800' }}>Abrir portal Owner</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  colors,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.bg }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.6, marginBottom: 12 },
  section: { fontSize: 16, fontWeight: '900', marginTop: 18, marginBottom: 8 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 18, fontWeight: '800' },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontWeight: '600',
  },
  saveBtn: {
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dangerBtn: {
    marginTop: 20,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
