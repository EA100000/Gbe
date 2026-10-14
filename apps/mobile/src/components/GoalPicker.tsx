import { DAILY_GOALS, type DailyGoalId } from '@gbe/domain';
import { Tile, UiText, colors } from '@gbe/ui';
import { StyleSheet, View } from 'react-native';

import { t } from '../core/i18n';

/** Petites barres de niveau de l'objectif (maquette, écran 1). */
export function GoalBars({ level, active }: { level: number; active: boolean }) {
  const fill = active ? colors.blue : colors.yellow;
  return (
    <View style={styles.bars} importantForAccessibility="no-hide-descendants">
      {[8, 12, 16, 20].map((height, i) => (
        <View
          key={height}
          style={[styles.bar, { height, backgroundColor: i < level ? fill : colors.border }]}
        />
      ))}
    </View>
  );
}

/** Liste des 4 objectifs quotidiens : accueil et profil. */
export function GoalPicker({
  value,
  onChange,
}: {
  value: DailyGoalId;
  onChange: (goal: DailyGoalId) => void;
}) {
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {DAILY_GOALS.map((g) => {
        const active = value === g.id;
        return (
          <Tile
            key={g.id}
            state={active ? 'selected' : 'idle'}
            onPress={() => onChange(g.id)}
            accessibilityLabel={`${t(`welcome.goal.${g.id}`)}, ${t('welcome.goal.minutes', { n: g.minutes })}`}
            accessibilityState={{ checked: active }}
            style={styles.goal}
            testID={`goal-${g.id}`}>
            <GoalBars level={g.level} active={active} />
            <UiText size={17} weight="extrabold" style={styles.label}>
              {t(`welcome.goal.${g.id}`)}
            </UiText>
            <UiText size={15} weight="semibold" color={colors.inkMuted}>
              {t('welcome.goal.minutes', { n: g.minutes })}
            </UiText>
          </Tile>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  goal: {
    minHeight: 58,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 14,
    paddingHorizontal: 18,
  },
  label: { flex: 1 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 20 },
  bar: { width: 5, borderRadius: 2 },
});
