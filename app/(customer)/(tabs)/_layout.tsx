import { Tabs } from 'expo-router';
import { Icon, type IconName } from '../../../src/components/Icon';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily } from '../../../src/theme/fonts';

function TabGlyph({
  name,
  focused,
  active,
  muted,
}: {
  name: IconName;
  focused: boolean;
  active: string;
  muted: string;
}) {
  return <Icon name={name} size={22} color={focused ? active : muted} />;
}

export default function CustomerTabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.line,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.semibold,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused }) => (
            <TabGlyph name="home" focused={focused} active={colors.ink} muted={colors.muted} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Busca',
          tabBarIcon: ({ focused }) => (
            <TabGlyph name="search" focused={focused} active={colors.ink} muted={colors.muted} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Salvos',
          tabBarIcon: ({ focused }) => (
            <TabGlyph name="bookmark" focused={focused} active={colors.ink} muted={colors.muted} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Atividade',
          tabBarIcon: ({ focused }) => (
            <TabGlyph name="receipt-outline" focused={focused} active={colors.ink} muted={colors.muted} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Conta',
          tabBarIcon: ({ focused }) => (
            <TabGlyph name="person" focused={focused} active={colors.ink} muted={colors.muted} />
          ),
        }}
      />
    </Tabs>
  );
}
