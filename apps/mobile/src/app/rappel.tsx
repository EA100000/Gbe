import { useLocalSearchParams } from 'expo-router';

import { ReminderScreen } from '../features/reminder/ReminderScreen';

/** `/rappel` depuis le Profil ; `/rappel?depart=lecon` après la première leçon. */
export default function ReminderRoute() {
  const { depart } = useLocalSearchParams<{ depart?: string }>();
  return <ReminderScreen origin={depart === 'lecon' ? 'lesson' : 'profile'} />;
}
