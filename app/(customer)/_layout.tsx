import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../src/theme/colors';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontSize: 16, color: focused ? colors.primary : colors.muted }}>{label}</Text>;
}

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
      }}
    >
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: ({ focused }) => <TabIcon label="⌖" focused={focused} /> }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: ({ focused }) => <TabIcon label="⌕" focused={focused} /> }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites', tabBarIcon: ({ focused }) => <TabIcon label="★" focused={focused} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ focused }) => <TabIcon label="◷" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon label="○" focused={focused} /> }} />
      <Tabs.Screen name="station/[id]" options={{ href: null }} />
      <Tabs.Screen name="reserve/[id]" options={{ href: null }} />
      <Tabs.Screen name="route/[id]" options={{ href: null }} />
      <Tabs.Screen name="navigation/[id]" options={{ href: null }} />
      <Tabs.Screen name="arrival/[id]" options={{ href: null }} />
      <Tabs.Screen name="session/[id]" options={{ href: null }} />
      <Tabs.Screen name="bill/[id]" options={{ href: null }} />
      <Tabs.Screen name="payment/[id]" options={{ href: null }} />
    </Tabs>
  );
}
