import { colors } from '@gbe/ui';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LessonLayout } from '../lesson/LessonScreen';
import {
  usePracticeController,
  type PracticeBuilder,
  type PracticeMode,
} from './usePracticeController';

/** Séance d'entraînement : même affichage qu'une leçon, sans vies (étiquette « Entraînement »). */
export function PracticeScreen({ mode, build }: { mode: PracticeMode; build: PracticeBuilder }) {
  const { content, ...controller } = usePracticeController(mode, build);
  if (content === null) return <SafeAreaView style={styles.screen} />;
  return <LessonLayout {...controller} content={content} />;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.white } });
