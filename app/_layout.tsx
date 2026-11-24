import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { AuthProvider } from '../src/context/AuthContext';
import { JourneyProvider } from '../src/context/JourneyContext';
import { VehicleProvider } from '../src/context/VehicleContext';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { fontAssets } from '../src/theme/fonts';

function RootNavigator() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts(fontAssets);

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <VehicleProvider>
          <JourneyProvider>
            <RootNavigator />
          </JourneyProvider>
        </VehicleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
