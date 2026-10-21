import type { ProgrammeOverview } from '@gbe/domain';
import { Icon, ProgressBar, UiText, colors } from '@gbe/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { t, tPlural } from '../../core/i18n';

/** Écran 23 (proposition validée) : les unités prévues dont le contenu n'est pas encore prêt. */
export function UpcomingUnitsView({
  programme,
  onOpen,
}: {
  programme: ProgrammeOverview;
  onOpen: (unitId: string) => void;
}) {
  const { section, ready, total, upcoming } = programme;
  if (upcoming.length === 0) return null;
  return (
    <View style={styles.root} testID="upcoming-units">
      <View style={styles.intro}>
        <UiText size={20} weight="extrabold" accessibilityRole="header">
          {t('path.upcoming.title')}
        </UiText>
        <UiText size={15} color={colors.inkMuted} style={styles.summary}>
          {tPlural(ready, 'path.upcoming.summary.one', 'path.upcoming.summary.other', {
            section,
            total,
          })}
        </UiText>
        <View style={styles.progress}>
          <ProgressBar
            value={total === 0 ? 0 : ready / total}
            accessibilityLabel={tPlural(
              ready,
              'path.upcoming.progress.one',
              'path.upcoming.progress.other',
              { total },
            )}
          />
        </View>
      </View>
      {upcoming.map((unit) => (
        <Pressable
          key={unit.id}
          accessibilityRole="button"
          accessibilityLabel={t('path.upcoming.label', { n: unit.order, title: unit.title })}
          onPress={() => onOpen(unit.id)}
          style={styles.card}
          testID={`upcoming-${unit.id}`}>
          <View style={styles.cardText}>
            <UiText size={13} weight="extrabold" color={colors.inkMuted} style={styles.kicker}>
              {t('path.unit', { n: unit.order, title: unit.title }).toLocaleUpperCase('fr-FR')}
            </UiText>
            <UiText size={16} weight="bold">
              {unit.subtitle}
            </UiText>
          </View>
          <View style={styles.badge}>
            <Icon name="pencil" size={14} color={colors.inkMuted} />
            <UiText size={13} weight="extrabold" color={colors.inkMuted}>
              {t('path.upcoming.badge')}
            </UiText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 24, marginHorizontal: 16, gap: 10 },
  intro: { gap: 6, marginBottom: 2 },
  summary: { lineHeight: 21 },
  progress: { flexDirection: 'row' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.lockedShadow,
    backgroundColor: colors.surfaceMuted,
  },
  cardText: { flex: 1, gap: 3 },
  kicker: { letterSpacing: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
});
