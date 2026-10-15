import { ChunkyButton, Galet, Illustration, UiText, colors } from '@gbe/ui';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalPicker } from '../../components/GoalPicker';
import { SpeechBubble } from '../../components/SpeechBubble';
import { t } from '../../core/i18n';
import { useGoalController } from './useOnboardingControllers';

/**
 * Écran 1 de la maquette, dernière étape du démarrage : l'objectif quotidien.
 * Le Galet s'est déjà présenté à l'écran 1a ; sa bulle annonce ici la dernière question.
 */
export function WelcomeScreen() {
  const c = useGoalController();

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
              {t('welcome.intro')}
            </UiText>
          </SpeechBubble>
        </View>

        <View style={styles.goals}>
          <UiText size={22} weight="extrabold" accessibilityRole="header">
            {t('welcome.title')}
          </UiText>
          <GoalPicker value={c.goal} onChange={c.setGoal} />
          <UiText size={14} color={colors.inkSoft}>
            {t('welcome.changeLater')}
          </UiText>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <ChunkyButton
          label={t('welcome.start')}
          onPress={c.start}
          highlight
          testID="welcome-start"
        />
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
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 8 },
});
