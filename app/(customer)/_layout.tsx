import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';

export default function CustomerLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="station/[id]" />
      <Stack.Screen name="reserve/[id]" />
      <Stack.Screen name="route/[id]" />
      <Stack.Screen name="navigation/[id]" options={{ animation: 'fade' }} />
      <Stack.Screen name="arrival/[id]" />
      <Stack.Screen name="session/[id]" />
      <Stack.Screen name="bill/[id]" />
      <Stack.Screen name="payment/[id]" />
    </Stack>
  );
}
