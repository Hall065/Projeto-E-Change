import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Icon } from './Icon';
import { useAuth } from '../context/AuthContext';
import { isFavorite, toggleFavorite } from '../services/journey';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  stationId: string;
  size?: number;
  /** Fundo circular (ex.: sobre hero). */
  chip?: boolean;
  /** Controle externo opcional (ex.: CTA textual na mesma tela). */
  favorite?: boolean;
  onChange?: (favorite: boolean) => void;
};

export function FavoriteButton({ stationId, size = 22, chip, favorite, onChange }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const controlled = favorite !== undefined;
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const fav = controlled ? Boolean(favorite) : internal;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const favRef = useRef(fav);
  favRef.current = fav;

  const sync = useCallback(async () => {
    if (!stationId) return;
    let value = false;
    if (user) {
      try {
        value = await isFavorite(user.id, stationId);
      } catch {
        value = false;
      }
    }
    if (!controlled) setInternal(value);
    if (favRef.current !== value) {
      onChangeRef.current?.(value);
    }
  }, [user?.id, stationId, controlled]);

  useFocusEffect(
    useCallback(() => {
      void sync();
    }, [sync]),
  );

  useEffect(() => {
    void sync();
  }, [sync]);

  const onPress = async () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    if (busy || !stationId) return;
    setBusy(true);
    const next = !fav;
    if (!controlled) setInternal(next);
    onChangeRef.current?.(next);
    try {
      await toggleFavorite(user.id, stationId, next);
    } catch {
      if (!controlled) setInternal(!next);
      onChangeRef.current?.(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={(e) => {
        (e as { stopPropagation?: () => void }).stopPropagation?.();
        void onPress();
      }}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      style={[
        chip && styles.chip,
        chip && { backgroundColor: fav ? colors.primary : 'rgba(15,18,14,0.55)' },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={chip ? colors.white : colors.primary} />
      ) : (
        <Icon
          name={fav ? 'star' : 'star-outline'}
          size={size}
          color={fav ? (chip ? colors.white : colors.primary) : chip ? colors.white : colors.muted}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
