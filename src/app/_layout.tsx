import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import { initializeApp } from '@/store/hvacStore';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Safe wrapper for launch crash isolation
    (async () => {
      try {
        await initializeApp();
      } catch (e) {
        console.log('[Launch] initializeApp error (safe):', e);
      }
    })();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
