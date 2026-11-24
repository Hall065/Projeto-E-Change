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
import { Icon } from './Icon';
import { colors } from '../theme/colors';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';

export function Screen({ children, style, dark }: { children: React.ReactNode; style?: ViewStyle; dark?: boolean }) {
  return <View style={[styles.screen, dark && { backgroundColor: colors.dark }, style]}>{children}</View>;
}

export function BrandMark({ light }: { light?: boolean }) {
  return (
    <Text style={[styles.brand, { fontFamily: fontFamily.extrabold }, light && { color: colors.white }]}>
      E-CHARGE <Text style={{ color: light ? colors.accent : colors.secondary }}>MAP</Text>
    </Text>
  );
}

export function LeafLogo({ size = 56 }: { size?: number }) {
  return (
    <View style={[styles.leaf, { width: size, height: size, borderRadius: size / 2 }]}>
      <Icon name="flash" size={size * 0.42} color="#fff" />
    </View>
  );
}

export function Title({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <Text style={[styles.title, { fontFamily: fontFamily.extrabold }, light && { color: colors.white }]}>
      {children}
    </Text>
  );
}

export function Subtitle({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <Text style={[styles.subtitle, { fontFamily: fontFamily.medium }, light && { color: '#C6D0BE' }]}>
      {children}
    </Text>
  );
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
        <ActivityIndicator color={ghost ? colors.ink : '#fff'} />
      ) : (
        <Text
          style={[
            styles.btnText,
            { fontFamily: fontFamily.bold },
            ghost && { color: colors.ink },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      {...props}
      style={[styles.input, { fontFamily: fontFamily.medium }, props.style]}
    />
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text
        style={[
          styles.chipText,
          { fontFamily: fontFamily.bold },
          active && { color: '#fff' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { fontFamily: fontFamily.semibold }]}>{label}</Text>
      <Text style={[styles.statValue, { fontFamily: fontFamily.extrabold }]}>{value}</Text>
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { fontFamily: fontFamily.bold }]}>{title}</Text>
      {!!subtitle && <Text style={[styles.subtitle, { fontFamily: fontFamily.medium }]}>{subtitle}</Text>}
    </View>
  );
}

export function FadeBlock({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return <Animated.View entering={FadeInUp.delay(delay).springify()}>{children}</Animated.View>;
}

export function DarkHero({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={['#000000', '#121212', '#1F1F1F']} style={{ flex: 1 }}>
      {children}
    </LinearGradient>
  );
}

export function FadeInCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return <Animated.View entering={FadeInDown.delay(delay).duration(450)}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  brand: { fontSize: 12, letterSpacing: 2, color: colors.ink, marginBottom: 12 },
  leaf: {
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 28, color: colors.ink, letterSpacing: -0.8 },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 6, lineHeight: 20 },
  btn: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnGhost: {
    backgroundColor: colors.ghost,
    borderWidth: 1,
    borderColor: colors.ghostBorder,
  },
  btnText: { color: '#fff', fontSize: 15 },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
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
  chipActive: { backgroundColor: colors.ink },
  chipText: { color: colors.ink, fontSize: 13 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginTop: 10,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    minWidth: '30%',
  },
  statLabel: { fontSize: 11, color: colors.muted },
  statValue: { fontSize: 16, color: colors.ink, marginTop: 4 },
  empty: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, color: colors.ink },
});
