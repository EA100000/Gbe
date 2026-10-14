import type { BuildSentenceExercise } from '@gbe/content-schema';
import type { SentenceBoard, SessionPhase } from '@gbe/domain';
import { FonText, Galet, Tile, UiText, colors } from '@gbe/ui';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '../../../components/IconButton';
import { SpeechBubble } from '../../../components/SpeechBubble';
import { t } from '../../../core/i18n';

export interface BuildSentenceViewProps {
  exercise: BuildSentenceExercise;
  board: SentenceBoard;
  phase: SessionPhase;
  onPlace: (tileId: number) => void;
  onRemove: (tileId: number) => void;
  onListen: () => void;
}

const LINE_HEIGHT = 60;

/** Écran 4 de la maquette : remettre les mots dans l'ordre. */
export function BuildSentenceView({
  exercise,
  board,
  phase,
  onPlace,
  onRemove,
  onListen,
}: BuildSentenceViewProps) {
  const answering = phase === 'answering';
  const byId = new Map(board.bank.map((tile) => [tile.id, tile.text]));

  return (
    <View style={styles.container}>
      <View style={styles.prompt}>
        <Galet pose="parle" size={108} />
        <SpeechBubble style={styles.bubble}>
          <View style={styles.bubbleRow}>
            {exercise.audio !== undefined ? (
              <IconButton
                icon="speaker"
                label={t('lesson.build.listen')}
                onPress={onListen}
                color={colors.blue}
                size={22}
              />
            ) : null}
            <UiText size={18} weight="semibold" style={styles.sentence}>
              {exercise.sentenceFr}
            </UiText>
          </View>
        </SpeechBubble>
      </View>

      <View accessibilityLabel={t('lesson.build.answerZone')} style={styles.answer}>
        <View style={styles.lines} pointerEvents="none">
          <View style={styles.line} />
          <View style={styles.line} />
        </View>
        <View style={styles.wrap}>
          {board.answer.map((tileId) => {
            const word = byId.get(tileId) ?? '';
            return (
              <Tile
                key={tileId}
                onPress={() => onRemove(tileId)}
                disabled={!answering}
                accessibilityLabel={t('lesson.build.remove', { word })}
                radius={12}
                style={styles.word}
                testID={`answer-${tileId}`}>
                <FonText size={19}>{word}</FonText>
              </Tile>
            );
          })}
        </View>
      </View>

      <View style={[styles.wrap, styles.bank]}>
        {board.bank.map((tile) => {
          const used = board.answer.includes(tile.id);
          if (used) {
            return (
              <View
                key={tile.id}
                style={[styles.word, styles.placeholder]}
                importantForAccessibility="no-hide-descendants">
                <FonText size={19} color={colors.borderSoft}>
                  {tile.text}
                </FonText>
              </View>
            );
          }
          return (
            <Tile
              key={tile.id}
              onPress={() => onPlace(tile.id)}
              disabled={!answering}
              accessibilityLabel={t('lesson.build.add', { word: tile.text })}
              radius={12}
              style={styles.word}
              testID={`bank-${tile.id}`}>
              <FonText size={19}>{tile.text}</FonText>
            </Tile>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 18 },
  prompt: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  bubble: { flexShrink: 1, marginBottom: 30, paddingVertical: 6, paddingLeft: 6 },
  bubbleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sentence: { flexShrink: 1 },
  answer: { minHeight: LINE_HEIGHT * 2, paddingTop: 6 },
  lines: { position: 'absolute', top: 0, left: 0, right: 0 },
  line: { height: LINE_HEIGHT, borderBottomWidth: 2, borderBottomColor: colors.border },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, rowGap: 12 },
  bank: { justifyContent: 'center', marginTop: 10 },
  word: { minHeight: 48, paddingHorizontal: 14 },
  placeholder: {
    borderRadius: 12,
    backgroundColor: colors.borderSoft,
    borderWidth: 2,
    borderColor: colors.borderSoft,
    marginTop: 3,
    justifyContent: 'center',
  },
});
