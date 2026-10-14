import { isLessonNode } from '@gbe/domain';
import { Galet, Icon, Illustration, UiText, colors } from '@gbe/ui';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatBadge } from '../../components/StatBadge';
import { TestContentBanner } from '../../components/TestContentBanner';
import { t } from '../../core/i18n';
import { PathNodeView } from './PathNodeView';
import { usePathController } from './usePathController';

/** Écran 2 de la maquette : en-tête, bannière de l'unité, chemin des leçons. */
export function PathScreen() {
  const { unit, nodes, stats, open, openGuide } = usePathController();
  // Numéro affiché de chaque leçon (les histoires et récompenses ne comptent pas).
  const lessonNumbers = nodes.map(
    (_, i) => nodes.slice(0, i + 1).filter((n) => isLessonNode(n) && n.kind === 'lesson').length,
  );

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
          label={t('path.streak', { n: stats.streak })}
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
          label={t('path.hearts', { n: stats.hearts })}
          testID="stat-hearts"
        />
      </View>
      <TestContentBanner />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.banner}>
          <View style={styles.bannerArt}>
            <Illustration name="bannerDots" width={160} height={110} />
          </View>
          <View style={styles.bannerDash} />
          <View style={styles.bannerText}>
            <UiText size={13} weight="extrabold" color={colors.yellowDeep} style={styles.kicker}>
              {t('path.unit', { n: unit.order, title: unit.title }).toLocaleUpperCase('fr-FR')}
            </UiText>
            <UiText size={19} weight="extrabold" accessibilityRole="header">
              {unit.subtitle}
            </UiText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('path.unitGuide')}
            onPress={openGuide}
            style={styles.guide}>
            <Icon name="book" size={24} />
          </Pressable>
        </View>

        <View style={styles.path}>
          <View style={styles.decoGalet}>
            <Galet pose="parle" size={112} flip />
          </View>
          <View style={styles.decoHut}>
            <Illustration name="hut" width={84} height={84} />
          </View>
          <View style={styles.decoPalm}>
            <Illustration name="palm" width={86} height={104} />
          </View>
          {nodes.map((node, position) => {
            const key = isLessonNode(node) ? node.lessonId : node.id;
            return (
              <PathNodeView
                key={key}
                node={node}
                position={position}
                lessonNumber={lessonNumbers[position] ?? 0}
                onPress={() => {
                  if (isLessonNode(node)) open(node);
                }}
              />
            );
          })}
        </View>
      </ScrollView>
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
  banner: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    paddingLeft: 18,
    borderRadius: 16,
    backgroundColor: colors.yellow,
    borderBottomWidth: 4,
    borderBottomColor: colors.yellowShadow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  bannerArt: { position: 'absolute', right: 0, top: 0 },
  bannerDash: {
    position: 'absolute',
    left: 5,
    right: 5,
    top: 5,
    bottom: 5,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.yellowShadow,
    borderRadius: 12,
  },
  bannerText: { flex: 1, gap: 4 },
  kicker: { letterSpacing: 1 },
  guide: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.yellowShadow,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  path: { paddingTop: 28, alignItems: 'center', gap: 22, minHeight: 640 },
  decoGalet: { position: 'absolute', right: 20, top: 158 },
  decoHut: { position: 'absolute', right: 22, top: 318 },
  decoPalm: { position: 'absolute', left: 14, top: 372 },
});
