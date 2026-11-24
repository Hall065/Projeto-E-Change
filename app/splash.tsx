import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function SplashScreen() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/(auth)/welcome'), 1700);
    return () => clearTimeout(t);
  }, []);

  return <LoadingScreen label="Preparando sua rota elétrica…" dark />;
}
