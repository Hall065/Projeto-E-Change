import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  return {
    ...config,
    name: 'E-Charge Map',
    slug: 'e-charge-map',
    scheme: 'echarge',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.echargemap.app',
      config: googleKey ? { googleMapsApiKey: googleKey } : undefined,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Usamos o GPS do dispositivo para mostrar postos próximos e navegar até o carregador.',
      },
    },
    android: {
      package: 'com.echargemap.app',
      config: googleKey ? { googleMaps: { apiKey: googleKey } } : undefined,
      adaptiveIcon: {
        backgroundColor: '#0F120E',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    },
    web: {
      bundler: 'metro',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-font',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Permitir GPS para encontrar postos próximos e navegar como no Waze/Uber.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  };
};
