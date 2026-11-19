import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Card, Screen, Stat } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { fetchAllStationsAdmin } from '../../src/services/stations';
import { colors } from '../../src/theme/colors';

const NAV = [
  { href: '/(admin)/stations', label: 'Stations' },
  { href: '/(admin)/users', label: 'Users' },
  { href: '/(admin)/reservations', label: 'Reservations' },
  { href: '/(admin)/sessions', label: 'Sessions' },
  { href: '/(admin)/payments', label: 'Payments' },
  { href: '/(admin)/approvals', label: 'Approvals' },
];

export default function AdminDashboard() {
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= 960;
  const [stats, setStats] = useState({ stations: 0, pending: 0, sessions: 0, revenue: 0, users: 0 });

  useEffect(() => {
    (async () => {
      const stations = await fetchAllStationsAdmin();
      const [{ count: users }, { data: sessions }, { data: payments }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('charging_sessions').select('id'),
        supabase.from('payments').select('amount,status'),
      ]);
      const revenue = (payments ?? []).filter((p) => p.status === 'paid').reduce((acc, p) => acc + Number(p.amount), 0);
      setStats({
        stations: stations.length,
        pending: stations.filter((s: any) => s.status === 'pending').length,
        sessions: sessions?.length ?? 0,
        revenue,
        users: users ?? 0,
      });
    })().catch(console.error);
  }, []);

  const content = (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Admin Dashboard</Text>
      <Text style={styles.sub}>Gestão global da plataforma E-Charge Map</Text>
      <View style={styles.stats}>
        <Stat label="Stations" value={String(stats.stations)} />
        <Stat label="Pending" value={String(stats.pending)} />
        <Stat label="Sessions" value={String(stats.sessions)} />
        <Stat label="Users" value={String(stats.users)} />
      </View>
      <Card>
        <Text style={styles.cardTitle}>Revenue (paid)</Text>
        <Text style={styles.revenue}>R$ {stats.revenue.toFixed(2)}</Text>
      </Card>
      <View style={styles.navGrid}>
        {NAV.map((item) => (
          <Link key={item.href} href={item.href as any} style={styles.navItem}>{item.label}</Link>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: 'E-Charge Admin' }} />
      {wide ? (
        <View style={styles.shell}>
          <View style={styles.sidebar}>
            <Text style={styles.brand}>E-CHARGE ADMIN</Text>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href as any} style={styles.sideLink}>{item.label}</Link>
            ))}
            <Link href="/(customer)/map" style={[styles.sideLink, { marginTop: 24 }]}>← App mobile</Link>
          </View>
          <View style={{ flex: 1 }}>{content}</View>
        </View>
      ) : content}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 24, paddingBottom: 48 },
  h1: { fontSize: 28, fontWeight: '900', color: colors.ink },
  sub: { color: colors.muted, marginTop: 6, marginBottom: 16 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardTitle: { color: colors.muted, fontWeight: '600' },
  revenue: { fontSize: 32, fontWeight: '900', color: colors.primary, marginTop: 6 },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  navItem: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontWeight: '700',
    color: colors.ink,
    overflow: 'hidden',
  },
  shell: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 240, backgroundColor: colors.dark, padding: 24 },
  brand: { color: colors.light, fontWeight: '900', letterSpacing: 1, marginBottom: 24 },
  sideLink: { color: colors.white, fontWeight: '700', marginBottom: 14 },
});
