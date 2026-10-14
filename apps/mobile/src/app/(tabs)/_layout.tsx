import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '../../components/TabBar';
import { useProgressStore } from '../../core/progress/progressStore';

/** Onglets de la maquette : Apprendre, Sons, Profil (la Ligue arrive avec son écran). */
export default function TabsLayout() {
  const onboarded = useProgressStore((s) => s.settings.onboarded);
  if (!onboarded) return <Redirect href="/bienvenue" />;
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sons" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
