import { useLocalSearchParams } from 'expo-router';

import { LessonScreen } from '../../features/lesson/LessonScreen';

export default function LessonRoute() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  return <LessonScreen key={lessonId} lessonId={lessonId} />;
}
