import { Icon, UiText, colors } from '@gbe/ui';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatBadge } from '../../components/StatBadge';
import { TestContentBanner } from '../../components/TestContentBanner';
import { t, tPlural } from '../../core/i18n';
import { UnitSectionView } from './UnitSectionView';
import { UpcomingUnitSheet } from './UpcomingUnitSheet';
import { UpcomingUnitsView } from './UpcomingUnitsView';
import { usePathController } from './usePathController';

/**
 * Écran 2 de la maquette : en-tête, puis chaque unité (bannière et chemin des leçons),
 * puis la suite du programme (écran 23).
 */
export function PathScreen() {
  const {
    sections,
    stats,
    open,
    openGuide,
    programme,
    upcomingSheet,
    openUpcoming,
    closeUpcoming,
  } = usePathController();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View accessible accessibilityLabel={t('path.course')} style={styles.course}>
          <Icon name="courseFon" size={28} />
          <UiText size={16} weight="extrabold">
            {t('path.courseName')}
          </UiText>
        </View>
        <StatBadge
          icon="flame"
          value={stats.streak}
          color={colors.redDark}
          label={tPlural(stats.streak, 'path.streak.one', 'path.streak.other')}
          testID="stat-streak"
        />
        <StatBadge
          icon="cauris"
          value={stats.cauris}
          color={colors.yellowText}
          label={t('path.cauris', { n: stats.cauris })}
          testID="stat-cauris"
        />
        <StatBadge
          icon="heart"
          value={stats.hearts}
          color={colors.redDark}
          label={tPlural(stats.hearts, 'path.hearts.one', 'path.hearts.other')}
          testID="stat-hearts"
        />
      </View>
      <TestContentBanner />

      <ScrollView contentContainerStyle={styles.scroll}>
        {sections.map((section) => (
          <UnitSectionView
            key={section.unit.id}
            section={section}
            onOpen={open}
            onOpenGuide={openGuide}
          />
        ))}
        <UpcomingUnitsView programme={programme} onOpen={openUpcoming} />
      </ScrollView>
      <UpcomingUnitSheet unit={upcomingSheet} onClose={closeUpcoming} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderSoft,
  },
  course: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  scroll: { paddingBottom: 32 },
});
