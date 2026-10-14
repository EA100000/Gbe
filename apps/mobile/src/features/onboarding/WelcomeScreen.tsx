import { DAILY_GOALS, type DailyGoalId } from '@gbe/domain';
import { ChunkyButton, FonText, Galet, Illustration, Tile, UiText, colors } from '@gbe/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SpeechBubble } from '../../components/SpeechBubble';
import { useContent } from '../../core/content/contentStore';
import { t } from '../../core/i18n';
import { useProgressStore } from '../../core/progress/progressStore';

function GoalBars({ level, active }: { level: number; active: boolean }) {
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

/** Écran 1 de la maquette : accueil du Galet et choix de l'objectif quotidien. */
export function WelcomeScreen() {
  const { pack } = useContent();
  const settings = useProgressStore((s) => s.settings);
  const saveSettings = useProgressStore((s) => s.saveSettings);
  const [goal, setGoal] = useState<DailyGoalId>(settings.dailyGoal);

  const start = async () => {
    await saveSettings({ onboarded: true, dailyGoal: goal });
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Emplacement de la photo du Bénin (marché, lagune, famille) : à fournir. */}
        <View style={styles.photo}>
          <View style={styles.kente}>
            <Illustration name="kente" width={400} height={14} />
          </View>
        </View>

        <View style={styles.greeting}>
          <Galet pose="parle" size={132} />
          <SpeechBubble style={styles.bubble}>
            <UiText size={16} weight="semibold">
              {pack.uiFon?.greeting !== undefined ? (
                <FonText size={16} color={colors.blue}>
                  {`${pack.uiFon.greeting} `}
                </FonText>
              ) : null}
              {t('welcome.intro')}
            </UiText>
          </SpeechBubble>
        </View>

        <View style={styles.goals}>
          <UiText size={22} weight="extrabold" accessibilityRole="header">
            {t('welcome.title')}
          </UiText>
          <View style={styles.list} accessibilityRole="radiogroup">
            {DAILY_GOALS.map((g) => {
              const active = goal === g.id;
              return (
                <Tile
                  key={g.id}
                  state={active ? 'selected' : 'idle'}
                  onPress={() => setGoal(g.id)}
                  accessibilityLabel={`${t(`welcome.goal.${g.id}`)}, ${t('welcome.goal.minutes', { n: g.minutes })}`}
                  accessibilityState={{ checked: active }}
                  style={styles.goal}
                  testID={`goal-${g.id}`}>
                  <GoalBars level={g.level} active={active} />
                  <UiText size={17} weight="extrabold" style={styles.goalLabel}>
                    {t(`welcome.goal.${g.id}`)}
                  </UiText>
                  <UiText size={15} weight="semibold" color={colors.inkMuted}>
                    {t('welcome.goal.minutes', { n: g.minutes })}
                  </UiText>
                </Tile>
              );
            })}
          </View>
          <UiText size={14} color={colors.inkSoft}>
            {t('welcome.changeLater')}
          </UiText>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <ChunkyButton label={t('welcome.start')} onPress={start} highlight testID="welcome-start" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { paddingBottom: 16 },
  photo: {
    height: 196,
    backgroundColor: colors.photo,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  kente: { height: 14 },
  greeting: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: -58,
    paddingLeft: 12,
    paddingRight: 20,
  },
  bubble: { flex: 1, marginBottom: 14 },
  goals: { paddingTop: 18, paddingHorizontal: 20, gap: 12 },
  list: { gap: 10 },
  goal: {
    minHeight: 58,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 14,
    paddingHorizontal: 18,
  },
  goalLabel: { flex: 1 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 20 },
  bar: { width: 5, borderRadius: 2 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
});
