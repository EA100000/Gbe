import type { LexiconItem } from '@gbe/content-schema';
import type { SessionPhase } from '@gbe/domain';
import { FonText, Icon, Tile, UiText, colors, tileForeground, type TileState } from '@gbe/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '../../../core/i18n';
import type { ListenChoiceExercise } from '../lessonMachine';

/**
 * Écran 25 (proposition validée) : un grand bouton pour écouter, un pour écouter lentement,
 * puis quatre mots en fon. Toucher un mot ne le fait pas entendre : ce serait donner la réponse.
 */
export function ListenChoiceView({
  exercise,
  items,
  selected,
  phase,
  onSelect,
  onPlay,
  onPlaySlow,
}: {
  exercise: ListenChoiceExercise;
  items: ReadonlyMap<string, LexiconItem>;
  selected: string | null;
  phase: SessionPhase;
  onSelect: (itemId: string) => void;
  onPlay: () => void;
  onPlaySlow: () => void;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.players}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('listen.play')}
          onPress={onPlay}
          style={styles.play}
          testID="listen-play">
          <Icon name="speaker" size={52} color={colors.white} />
        </Pressable>
        {exercise.slowAudio === undefined ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('listen.playSlow')}
            onPress={onPlaySlow}
            style={styles.slow}
            testID="listen-slow">
            <Icon name="speaker" size={28} color={colors.blueShadow} />
            <UiText size={14} weight="extrabold" color={colors.blueShadow}>
              {t('listen.slow')}
            </UiText>
          </Pressable>
        )}
      </View>
      <View style={styles.grid}>
        {exercise.choices.map((itemId) => {
          const item = items.get(itemId);
          if (item === undefined) return null;
          const isSelected = selected === itemId;
          let state: TileState = 'idle';
          if (isSelected) state = phase === 'wrong' ? 'wrong' : 'selected';
          return (
            <View key={itemId} style={styles.cell}>
              <Tile
                state={state}
                disabled={phase !== 'answering'}
                onPress={() => onSelect(itemId)}
                accessibilityLabel={item.fon}
                accessibilityState={{ selected: isSelected }}
                testID={`listen-choice-${itemId}`}
                style={styles.tile}>
                <FonText size={24} color={tileForeground(state)}>
                  {item.fon}
                </FonText>
              </Tile>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 22 },
  players: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  play: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.blue,
    borderBottomWidth: 6,
    borderBottomColor: colors.blueShadow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slow: {
    minWidth: 76,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 4,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell: { width: '50%', padding: 6 },
  tile: { minHeight: 76, justifyContent: 'center', alignItems: 'center' },
});
