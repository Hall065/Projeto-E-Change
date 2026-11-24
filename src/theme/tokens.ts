export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const elevation = {
  float: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  sheet: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;

export type ThemeColors = {
  ink: string;
  muted: string;
  primary: string;
  /** Texto/ícone em cima de primary/ink (botão sólido) */
  onPrimary: string;
  secondary: string;
  accent: string;
  light: string;
  bg: string;
  white: string;
  surface: string;
  line: string;
  dark: string;
  darkCard: string;
  map: string;
  blue: string;
  route: string;
  routeAlt: string;
  danger: string;
  warning: string;
  ghost: string;
  ghostBorder: string;
  soft: string;
  star: string;
  battery: string;
  batteryLow: string;
  overlay: string;
  tabBar: string;
  searchBg: string;
  searchText: string;
  whereTo: string;
  whereToText: string;
};

/** Uber-like: preto, branco, cinza, accent verde só para energia EV */
export const lightColors: ThemeColors = {
  ink: '#000000',
  muted: '#6B6B6B',
  primary: '#000000',
  onPrimary: '#FFFFFF',
  secondary: '#276EF1',
  accent: '#06C167',
  light: '#EEEEEE',
  bg: '#F6F6F6',
  white: '#FFFFFF',
  surface: '#FFFFFF',
  line: '#E2E2E2',
  dark: '#000000',
  darkCard: '#1F1F1F',
  map: '#E8E8E8',
  blue: '#276EF1',
  route: '#276EF1',
  routeAlt: '#AFAFAF',
  danger: '#E11900',
  warning: '#FFC043',
  ghost: '#F3F3F3',
  ghostBorder: '#E2E2E2',
  soft: '#F6F6F6',
  star: '#FFC043',
  battery: '#06C167',
  batteryLow: '#E11900',
  overlay: 'rgba(0,0,0,0.45)',
  tabBar: '#FFFFFF',
  searchBg: '#FFFFFF',
  searchText: '#000000',
  whereTo: '#EEEEEE',
  whereToText: '#000000',
};

export const darkColors: ThemeColors = {
  ink: '#F5F5F5',
  muted: '#A0A0A0',
  /** Botão sólido claro no tema preto — texto usa onPrimary */
  primary: '#FFFFFF',
  onPrimary: '#000000',
  secondary: '#276EF1',
  accent: '#06C167',
  light: '#2B2B2B',
  bg: '#0A0A0A',
  white: '#FFFFFF',
  surface: '#1A1A1A',
  line: '#2E2E2E',
  dark: '#000000',
  darkCard: '#141414',
  map: '#121212',
  blue: '#4B8BFF',
  route: '#4B8BFF',
  routeAlt: '#666666',
  danger: '#FF695F',
  warning: '#FFC043',
  ghost: '#1F1F1F',
  ghostBorder: '#3A3A3A',
  soft: '#222222',
  star: '#FFC043',
  battery: '#06C167',
  batteryLow: '#FF695F',
  overlay: 'rgba(0,0,0,0.65)',
  tabBar: '#111111',
  searchBg: '#1A1A1A',
  searchText: '#F5F5F5',
  whereTo: '#222222',
  whereToText: '#F5F5F5',
};

/** Legacy admin/owner screens (sempre claro) */
export const colors = {
  ...lightColors,
} as const;
