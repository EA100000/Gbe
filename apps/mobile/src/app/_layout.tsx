import { Andika_400Regular } from '@expo-google-fonts/andika/400Regular';
import { Andika_700Bold } from '@expo-google-fonts/andika/700Bold';
import { BricolageGrotesque_400Regular } from '@expo-google-fonts/bricolage-grotesque/400Regular';
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBootstrap } from '../core/AppBootstrap';
import { PersistenceProvider } from '../core/db/PersistenceProvider';
import { queryClient } from '../core/query/queryClient';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Andika_400Regular,
    Andika_700Bold,
    BricolageGrotesque_400Regular,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });
  // Si une police manque, l'appli reste utilisable avec la police du système.
  if (!fontsLoaded && fontError === null) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PersistenceProvider>
          <AppBootstrap>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="bienvenue" />
              <Stack.Screen name="lecon/[lessonId]" options={{ gestureEnabled: false }} />
              <Stack.Screen name="histoire/[lessonId]" />
              <Stack.Screen name="fin" options={{ gestureEnabled: false }} />
            </Stack>
          </AppBootstrap>
        </PersistenceProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
