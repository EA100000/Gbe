import { useLocalSearchParams } from 'expo-router';

import { StoryScreen } from '../../features/story/StoryScreen';

export default function StoryRoute() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  return <StoryScreen key={lessonId} lessonId={lessonId} />;
}
