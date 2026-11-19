/** Paleta oficial da documentação + acentos do mockup */
export const colors = {
  ink: '#0B0D0A',
  muted: '#6B7265',
  primary: '#63783D',
  secondary: '#7FA653',
  accent: '#4ADE80',
  light: '#99CD85',
  bg: '#F4F6F1',
  white: '#FFFFFF',
  line: '#E2E7DC',
  dark: '#0F120E',
  darkCard: '#1A1F18',
  map: '#E8EDE3',
  blue: '#2F6FED',
  route: '#3B82F6',
  danger: '#C04545',
  ghost: '#EAF0E3',
  ghostBorder: '#DCE6D1',
  soft: '#EEF3E8',
  star: '#F5B942',
} as const;

export type ColorKey = keyof typeof colors;
