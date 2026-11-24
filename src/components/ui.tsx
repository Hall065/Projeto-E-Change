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
import { useTheme } from '../theme/ThemeContext';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';

export function Screen({ children, style, dark }: { children: React.ReactNode; style?: ViewStyle; dark?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: dark ? colors.dark : colors.bg }, style]}>
      {children}
    </View>
  );
}

export function BrandMark({ light }: { light?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        { fontSize: 12, letterSpacing: 2, color: colors.ink, marginBottom: 12, fontFamily: fontFamily.extrabold },
        light && { color: '#FFFFFF' },
      ]}
    >
      E-CHARGE <Text style={{ color: light ? colors.accent : colors.secondary }}>MAP</Text>
    </Text>
  );
}

export function LeafLogo({ size = 56 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="flash" size={size * 0.42} color={colors.onPrimary} />
    </View>
  );
}

export function Title({ children, light }: { children: React.ReactNode; light?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        { fontSize: 28, color: colors.ink, letterSpacing: -0.8, fontFamily: fontFamily.extrabold },
        light && { color: '#FFFFFF' },
      ]}
    >
      {children}
    </Text>
  );
}

export function Subtitle({ children, light }: { children: React.ReactNode; light?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        { fontSize: 14, color: colors.muted, marginTop: 6, lineHeight: 20, fontFamily: fontFamily.medium },
        light && { color: '#C6D0BE' },
      ]}
    >
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
  const { colors } = useTheme();
  const solidFg = danger ? '#FFFFFF' : colors.onPrimary;
  const solidBg = danger ? colors.danger : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: solidBg,
          borderRadius: radius.md,
          paddingVertical: 16,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 8,
        },
        ghost && {
          backgroundColor: colors.ghost,
          borderWidth: 1,
          borderColor: colors.ghostBorder,
        },
        (disabled || loading) && { opacity: 0.55 },
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ghost ? colors.ink : solidFg} />
      ) : (
        <Text
          style={[
            { color: solidFg, fontSize: 15, fontFamily: fontFamily.bold },
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
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      {...props}
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingHorizontal: 16,
          paddingVertical: 15,
          fontSize: 15,
          color: colors.ink,
          marginTop: 10,
          fontFamily: fontFamily.medium,
        },
        props.style,
      ]}
    />
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          backgroundColor: colors.ghost,
          paddingHorizontal: 13,
          paddingVertical: 9,
          borderRadius: 20,
          marginRight: 8,
          marginBottom: 8,
        },
        active && { backgroundColor: colors.primary },
      ]}
    >
      <Text
        style={[
          { color: colors.ink, fontSize: 13, fontFamily: fontFamily.bold },
          active && { color: colors.onPrimary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 16,
          marginTop: 10,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.line,
        padding: 12,
        minWidth: '30%',
      }}
    >
      <Text style={{ fontSize: 11, color: colors.muted, fontFamily: fontFamily.semibold }}>{label}</Text>
      <Text style={{ fontSize: 16, color: colors.ink, marginTop: 4, fontFamily: fontFamily.extrabold }}>
        {value}
      </Text>
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 24, alignItems: 'center' }}>
      <Text style={{ fontSize: 16, color: colors.ink, fontFamily: fontFamily.bold }}>{title}</Text>
      {!!subtitle && (
        <Text style={{ fontSize: 14, color: colors.muted, marginTop: 6, lineHeight: 20, fontFamily: fontFamily.medium }}>
          {subtitle}
        </Text>
      )}
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
