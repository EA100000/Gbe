import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '../../components/TabBar';
import { useProgressStore } from '../../core/progress/progressStore';

/** Onglets de la maquette : Apprendre, Sons, Ligue (si un serveur est configuré), Profil. */
export default function TabsLayout() {
  const onboarded = useProgressStore((s) => s.settings.onboarded);
  if (!onboarded) return <Redirect href="/bienvenue" />;
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sons" />
      <Tabs.Screen name="ligue" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
