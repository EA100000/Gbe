import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '../../components/TabBar';
import { useProgressStore } from '../../core/progress/progressStore';

/** Onglets du MVP : Apprendre et Sons (Ligue en V2, Profil sans écran dans la maquette). */
export default function TabsLayout() {
  const onboarded = useProgressStore((s) => s.settings.onboarded);
  if (!onboarded) return <Redirect href="/bienvenue" />;
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sons" />
    </Tabs>
  );
}
