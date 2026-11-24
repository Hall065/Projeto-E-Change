export {
  colors,
  lightColors,
  darkColors,
  spacing,
  radius,
  elevation,
  type ThemeColors,
} from './tokens';

export type ColorKey = keyof typeof import('./tokens').colors;
