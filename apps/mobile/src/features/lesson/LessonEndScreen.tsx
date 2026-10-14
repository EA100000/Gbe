import { ChunkyButton, Galet, Icon, Illustration, UiText, colors, type IconName } from '@gbe/ui';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatDuration, formatPercent, t, tPlural } from '../../core/i18n';
import { useProgressStore } from '../../core/progress/progressStore';
import { useContinueAfterLesson } from '../reminder/useContinueAfterLesson';

function StatCard({
  title,
  value,
  icon,
  tone,
  ink,
  titleInk,
}: {
  title: string;
  value: string;
  icon: IconName;
  tone: string;
  ink: string;
  titleInk: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${title} : ${value}`}
      style={[styles.card, { backgroundColor: tone, borderColor: tone }]}>
      <UiText size={12} weight="extrabold" color={titleInk} style={styles.cardTitle}>
        {title.toLocaleUpperCase('fr-FR')}
      </UiText>
      <View style={styles.cardValue}>
        <Icon name={icon} size={20} />
        <UiText size={21} weight="extrabold" color={ink}>
          {value}
        </UiText>
      </View>
    </View>
  );
}

/** Écran 6 de la maquette : XP, précision, durée, série et histoire débloquée. */
export function LessonEndScreen() {
  const summary = useProgressStore((s) => s.lastSummary);
  const goHome = () => router.dismissTo('/');
  const continueAfterLesson = useContinueAfterLesson();

  if (summary === null) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.footer}>
          <ChunkyButton label={t('common.continue')} onPress={goHome} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.confetti}>
            <Illustration name="confetti" width={390} height={230} />
          </View>
          <View style={styles.halo} />
          <Galet pose="fete" size={190} accessibilityLabel={t('end.title')} />
        </View>

        <View style={styles.texts}>
          <UiText size={32} weight="extrabold" color={colors.yellowText} accessibilityRole="header">
            {t('end.title')}
          </UiText>
          {summary.summaryFr !== null ? (
            <UiText size={16} color={colors.inkMuted} style={styles.center}>
              {summary.summaryFr}
            </UiText>
          ) : null}
        </View>

        <View style={styles.stats}>
          <StatCard
            title={t('end.xp')}
            value={`+${summary.xp}`}
            icon="bolt"
            tone={colors.yellow}
            ink={colors.yellowText}
            titleInk={colors.ink}
          />
          <StatCard
            title={t('end.accuracy')}
            value={formatPercent(summary.accuracy)}
            icon="target"
            tone={colors.blue}
            ink={colors.blueShadow}
            titleInk={colors.white}
          />
          <StatCard
            title={t('end.duration')}
            value={formatDuration(summary.durationMs)}
            icon="clock"
            tone={colors.redDark}
            ink={colors.redText}
            titleInk={colors.white}
          />
        </View>

        <View style={styles.cards}>
          {summary.streak > 0 ? (
            <View style={styles.streak} accessible>
              <Icon name="flame" size={36} />
              <View style={styles.flex}>
                <UiText size={17} weight="extrabold" color={colors.redText}>
                  {tPlural(summary.streak, 'end.streak.one', 'end.streak.other')}
                </UiText>
                <UiText size={14} color={colors.redText}>
                  {t('end.streakBody')}
                </UiText>
              </View>
            </View>
          ) : null}

          {summary.unlockedStory !== null ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('end.storyUnlocked')} : ${summary.unlockedStory.title}`}
              onPress={() => router.replace(`/histoire/${summary.unlockedStory?.lessonId ?? ''}`)}
              style={styles.story}
              testID="end-story">
              <View style={styles.storyThumb}>
                <Icon name="book" size={26} color={colors.photoText} />
              </View>
              <View style={styles.flex}>
                <UiText size={13} weight="extrabold" color={colors.blue} style={styles.kicker}>
                  {t('end.storyUnlocked').toLocaleUpperCase('fr-FR')}
                </UiText>
                <UiText size={16} weight="bold">
                  {summary.unlockedStory.title}
                </UiText>
              </View>
              <Icon name="chevronRight" size={22} color={colors.inkSoft} />
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <ChunkyButton
          label={t('common.continue')}
          onPress={continueAfterLesson}
          testID="end-continue"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { paddingBottom: 16 },
  hero: { height: 230, marginTop: 30, alignItems: 'center', justifyContent: 'center' },
  confetti: { position: 'absolute', top: 0, alignSelf: 'center' },
  halo: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.cream,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.yellowLine,
    top: 16,
  },
  texts: { paddingTop: 10, paddingHorizontal: 24, alignItems: 'center', gap: 8 },
  center: { textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 10, paddingTop: 22, paddingHorizontal: 20 },
  card: { flex: 1, borderRadius: 14, borderWidth: 2, overflow: 'hidden' },
  cardTitle: { textAlign: 'center', paddingTop: 6, paddingBottom: 5, letterSpacing: 0.7 },
  cardValue: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cards: { paddingTop: 16, paddingHorizontal: 20, gap: 10 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.redLight,
  },
  story: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 10,
    paddingRight: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
  },
  storyThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.photo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { letterSpacing: 0.8 },
  flex: { flex: 1, gap: 2 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
});
