import type { ImageChoiceExercise, Illustration, LexiconItem } from '@gbe/content-schema';
import { FonText, Tile, tileForeground, type TileState } from '@gbe/ui';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type { SessionPhase } from '@gbe/domain';

export interface ImageChoiceViewProps {
  exercise: ImageChoiceExercise;
  items: ReadonlyMap<string, LexiconItem>;
  illustrations: ReadonlyMap<string, Illustration>;
  selected: string | null;
  phase: SessionPhase;
  onSelect: (itemId: string) => void;
}

/** Écran 3 de la maquette : quatre images, chacune avec son mot en fon. */
export function ImageChoiceView({
  exercise,
  items,
  illustrations,
  selected,
  phase,
  onSelect,
}: ImageChoiceViewProps) {
  return (
    <View style={styles.grid}>
      {exercise.choices.map((itemId) => {
        const item = items.get(itemId);
        if (item === undefined) return null;
        const svg =
          item.illustration === undefined ? undefined : illustrations.get(item.illustration)?.svg;
        const isSelected = selected === itemId;
        let state: TileState = 'idle';
        if (isSelected)
          state = phase === 'wrong' || phase === 'out_of_hearts' ? 'wrong' : 'selected';
        return (
          <View key={itemId} style={styles.cell}>
            <Tile
              state={state}
              disabled={phase !== 'answering'}
              onPress={() => onSelect(itemId)}
              accessibilityLabel={item.fon}
              accessibilityState={{ selected: isSelected }}
              testID={`choice-${itemId}`}
              style={styles.tile}>
              {svg !== undefined ? <SvgXml xml={svg} width={88} height={88} /> : null}
              <FonText size={21} color={tileForeground(state)}>
                {item.fon}
              </FonText>
            </Tile>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -7 },
  cell: { width: '50%', padding: 7 },
  tile: { minHeight: 172, gap: 10, paddingVertical: 12 },
});
