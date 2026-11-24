import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dark }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (profile?.role === 'admin') return <Redirect href="/(admin)" />;
  if (profile?.role === 'owner') return <Redirect href="/(owner)" />;
  // App utilizável sem login (mapa/rotas demo); auth só para reserva/pagamento
  return <Redirect href="/(customer)/(tabs)/map" />;
}
