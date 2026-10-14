import { ChunkyButton, UiText, colors } from '@gbe/ui';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '../../core/i18n';
import { BuildSentenceView } from './components/BuildSentenceView';
import { ExerciseHeader } from './components/ExerciseHeader';
import { FeedbackPanel } from './components/FeedbackPanel';
import { ImageChoiceView } from './components/ImageChoiceView';
import { LessonTopBar } from './components/LessonTopBar';
import { MatchPairsView } from './components/MatchPairsView';
import { useLessonController } from './useLessonController';

/** Écrans 3, 4 et 5 de la maquette : un exercice à la fois, puis le panneau de correction. */
export function LessonScreen({ lessonId }: { lessonId: string }) {
  const { state, exercise, progress, canCheck, feedback, content, playClip, act, quit } =
    useLessonController(lessonId);

  if (state === null || exercise === undefined) return <SafeAreaView style={styles.screen} />;
  const { phase } = state.session;

  let body = null;
  if (exercise.type === 'image_choice') {
    body = (
      <ImageChoiceView
        exercise={exercise}
        items={content.itemsById}
        illustrations={content.illustrationsById}
        selected={state.selectedChoice}
        phase={phase}
        onSelect={(itemId) => {
          act({ type: 'select_choice', itemId });
          playClip(content.itemsById.get(itemId)?.audio?.normal);
        }}
      />
    );
  } else if (exercise.type === 'build_sentence' && state.sentence !== null) {
    body = (
      <BuildSentenceView
        exercise={exercise}
        board={state.sentence}
        phase={phase}
        onPlace={(tileId) => act({ type: 'place_tile', tileId })}
        onRemove={(tileId) => act({ type: 'remove_tile', tileId })}
        onListen={() => playClip(exercise.audio)}
      />
    );
  } else if (exercise.type === 'match_pairs' && state.pairs !== null) {
    body = (
      <MatchPairsView
        exercise={exercise}
        board={state.pairs}
        onTap={(side, pair) => {
          act({ type: 'tap_pair', side, pair });
          if (side === 'left') playClip(exercise.pairs[pair]?.audio);
        }}
      />
    );
  }

  let footer = null;
  if (feedback !== null) {
    const label =
      feedback.button === 'continue'
        ? t('common.continue')
        : feedback.button === 'retry'
          ? t('common.retry')
          : t('lesson.outOfHearts.back');
    footer = (
      <FeedbackPanel
        tone={feedback.tone}
        title={feedback.title}
        body={feedback.body}
        buttonLabel={label}
        onPress={() => {
          if (feedback.button === 'continue') act({ type: 'next' });
          else if (feedback.button === 'retry') act({ type: 'retry' });
          else quit();
        }}
      />
    );
  } else if (exercise.type === 'match_pairs' && state.pairs !== null) {
    footer = (
      <View style={styles.footer}>
        <View style={styles.pairsHelp}>
          <UiText size={14} weight="semibold" color={colors.inkMuted} style={styles.flex}>
            {t('lesson.pairs.help')}
          </UiText>
          <UiText size={14} weight="extrabold">
            {t('lesson.pairs.count', {
              n: state.pairs.matched.length,
              total: exercise.pairs.length,
            })}
          </UiText>
        </View>
        <ChunkyButton label={t('common.continue')} onPress={() => undefined} disabled />
      </View>
    );
  } else {
    footer = (
      <View style={styles.footer}>
        <ChunkyButton
          label={t('common.check')}
          onPress={() => act({ type: 'check' })}
          disabled={!canCheck}
          testID="check-button"
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <LessonTopBar progress={progress} hearts={state.session.hearts} onQuit={quit} />
      <ScrollView contentContainerStyle={styles.content}>
        <ExerciseHeader tag={exercise.tag} prompt={exercise.promptFr} />
        {body}
      </ScrollView>
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { paddingTop: 26, paddingHorizontal: 20, paddingBottom: 24, gap: 20 },
  footer: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderTopWidth: 2,
    borderTopColor: colors.borderSoft,
    gap: 12,
  },
  pairsHelp: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  flex: { flex: 1 },
});
