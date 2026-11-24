import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function Index() {
  const { profile, session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen label="Abrindo sua sessão…" dark />;
  }

  // Sem login → mapa cliente (explorar). Com login → área do role.
  if (!session || !profile) {
    return <Redirect href="/(customer)/(tabs)/map" />;
  }
  if (profile.role === 'admin') return <Redirect href="/(admin)" />;
  if (profile.role === 'owner') return <Redirect href="/(owner)" />;
  return <Redirect href="/(customer)/(tabs)/map" />;
}
