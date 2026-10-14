import type { MatchPairsExercise } from '@gbe/content-schema';
import type { PairSide, PairsBoard } from '@gbe/domain';
import { FonText, Tile, UiText, tileForeground, type TileState } from '@gbe/ui';
import { StyleSheet, View } from 'react-native';

import { t } from '../../../core/i18n';

export interface MatchPairsViewProps {
  exercise: MatchPairsExercise;
  board: PairsBoard;
  onTap: (side: PairSide, pair: number) => void;
}

function stateOf(board: PairsBoard, side: PairSide, pair: number): TileState {
  if (board.matched.includes(pair)) return 'done';
  if (board.wrong !== null && board.wrong[side] === pair) return 'wrong';
  if (board.selected?.side === side && board.selected.pair === pair) return 'selected';
  return 'idle';
}

/** Écran 5 de la maquette : associer chaque mot fon à sa traduction. */
export function MatchPairsView({ exercise, board, onTap }: MatchPairsViewProps) {
  const column = (side: PairSide) =>
    (side === 'left' ? board.left : board.right).map((pair) => {
      const entry = exercise.pairs[pair];
      if (entry === undefined) return null;
      const state = stateOf(board, side, pair);
      const text = side === 'left' ? entry.fon : entry.fr;
      const done = state === 'done';
      return (
        <Tile
          key={`${side}-${pair}`}
          state={state}
          disabled={done}
          onPress={() => onTap(side, pair)}
          accessibilityLabel={done ? t('lesson.pairs.found', { word: text }) : text}
          accessibilityState={{ selected: state === 'selected', disabled: done }}
          radius={14}
          style={styles.tile}
          testID={`pair-${side}-${pair}`}>
          {side === 'left' ? (
            <FonText size={21} color={tileForeground(state)}>
              {text}
            </FonText>
          ) : (
            <UiText size={18} weight="bold" color={tileForeground(state)}>
              {text}
            </UiText>
          )}
        </Tile>
      );
    });

  return (
    <View style={styles.columns}>
      <View style={styles.column}>{column('left')}</View>
      <View style={styles.column}>{column('right')}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: 14 },
  column: { flex: 1, gap: 12 },
  tile: { minHeight: 58, paddingHorizontal: 8 },
});
