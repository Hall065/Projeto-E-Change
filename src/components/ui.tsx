import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { colors } from '../theme/colors';

export function Screen({ children, style, dark }: { children: React.ReactNode; style?: ViewStyle; dark?: boolean }) {
  return <View style={[styles.screen, dark && { backgroundColor: colors.dark }, style]}>{children}</View>;
}

export function BrandMark({ light }: { light?: boolean }) {
  return (
    <Text style={[styles.brand, light && { color: colors.white }]}>
      E-CHARGE <Text style={{ color: light ? colors.accent : colors.secondary }}>MAP</Text>
    </Text>
  );
}

export function LeafLogo({ size = 56 }: { size?: number }) {
  return (
    <View style={[styles.leaf, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ fontSize: size * 0.45 }}>🌿</Text>
    </View>
  );
}

export function Title({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return <Text style={[styles.title, light && { color: colors.white }]}>{children}</Text>;
}

export function Subtitle({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return <Text style={[styles.subtitle, light && { color: '#C6D0BE' }]}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  ghost,
  danger,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  ghost?: boolean;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        ghost && styles.btnGhost,
        danger && { backgroundColor: colors.danger },
        (disabled || loading) && { opacity: 0.55 },
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ghost ? colors.primary : colors.white} />
      ) : (
        <Text style={[styles.btnText, ghost && { color: colors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />;
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

export function FadeBlock({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).springify()}>
      {children}
    </Animated.View>
  );
}

export function DarkHero({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={[colors.dark, '#161C14', '#1E2918']} style={{ flex: 1 }}>
      {children}
    </LinearGradient>
  );
}

export function FadeInCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return <Animated.View entering={FadeInDown.delay(delay).duration(450)}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  brand: { fontSize: 12, fontWeight: '900', letterSpacing: 2, color: colors.ink, marginBottom: 12 },
  leaf: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.8 },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 6, lineHeight: 20 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  btnGhost: {
    backgroundColor: colors.ghost,
    borderWidth: 1,
    borderColor: colors.ghostBorder,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    color: colors.ink,
    marginTop: 10,
  },
  chip: {
    backgroundColor: colors.ghost,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    minWidth: '30%',
  },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  statValue: { fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: 4 },
  empty: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
});
