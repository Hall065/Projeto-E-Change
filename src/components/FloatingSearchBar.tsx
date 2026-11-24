import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily } from '../theme/fonts';
import { elevation, radius } from '../theme/tokens';

export function FloatingSearchBar({
  value,
  onChangeText,
  onSubmit,
  onFocusPress,
  placeholder = 'Para onde?',
  variant = 'pill',
}: {
  value: string;
  onChangeText: (t: string) => void;
  onSubmit?: () => void;
  onFocusPress?: () => void;
  placeholder?: string;
  variant?: 'pill' | 'whereTo';
}) {
  const { colors } = useTheme();
  const whereTo = variant === 'whereTo';

  return (
    <Pressable
      onPress={onFocusPress}
      style={[
        styles.bar,
        whereTo ? styles.whereTo : elevation.float,
        {
          backgroundColor: whereTo ? colors.whereTo : colors.searchBg,
          borderColor: colors.line,
        },
      ]}
    >
      <Icon name="search" size={20} color={colors.ink} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={onFocusPress}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          {
            color: whereTo ? colors.whereToText : colors.searchText,
            fontFamily: fontFamily.semibold,
          },
        ]}
        returnKeyType="search"
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <Icon name="close-circle" size={20} color={colors.muted} />
        </Pressable>
      ) : (
        <View style={[styles.square, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Icon name="time-outline" size={16} color={colors.ink} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  whereTo: {
    borderWidth: 0,
    borderRadius: radius.md,
    paddingVertical: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  square: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
