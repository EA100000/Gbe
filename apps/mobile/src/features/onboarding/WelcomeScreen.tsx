import type { DailyGoalId } from '@gbe/domain';
import { ChunkyButton, FonText, Galet, Illustration, UiText, colors } from '@gbe/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalPicker } from '../../components/GoalPicker';
import { SpeechBubble } from '../../components/SpeechBubble';
import { useContent } from '../../core/content/contentStore';
import { t } from '../../core/i18n';
import { useProgressStore } from '../../core/progress/progressStore';

/** Écran 1 de la maquette : accueil du Galet et choix de l'objectif quotidien. */
export function WelcomeScreen() {
  const { pack } = useContent();
  const initialGoal = useProgressStore((s) => s.settings.dailyGoal);
  const completeOnboarding = useProgressStore((s) => s.completeOnboarding);
  const [goal, setGoal] = useState<DailyGoalId>(initialGoal);

  const start = async () => {
    await completeOnboarding(goal);
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
          <GoalPicker value={goal} onChange={setGoal} />
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
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
});
