import { ChunkyButton, Galet, Tile, UiText, colors } from '@gbe/ui';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalBars } from '../../components/GoalPicker';
import { SpeechBubble } from '../../components/SpeechBubble';
import { t } from '../../core/i18n';
import { OnboardingHeader } from './OnboardingHeader';
import { useLevelController } from './useOnboardingControllers';

/** Écran 1b (proposition validée) : le niveau que l'apprenant pense avoir. */
export function LevelScreen() {
  const c = useLevelController();

  return (
    <SafeAreaView style={styles.screen}>
      <OnboardingHeader step={2} onBack={c.back} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.greeting}>
          <Galet pose="parle" size={96} />
          <SpeechBubble style={styles.bubble}>
            <UiText size={16} weight="semibold">
              {t('level.intro')}
            </UiText>
          </SpeechBubble>
        </View>
        <UiText size={22} weight="extrabold" accessibilityRole="header">
          {t('level.title')}
        </UiText>
        <View style={styles.list} accessibilityRole="radiogroup">
          {c.levels.map((level) => (
            <Tile
              key={level.id}
              state={level.selected ? 'selected' : 'idle'}
              onPress={level.choose}
              accessibilityLabel={`${t(`level.${level.id}`)}. ${t(`level.${level.id}.hint`)}`}
              accessibilityState={{ checked: level.selected }}
              style={styles.level}
              testID={`level-${level.id}`}>
              <GoalBars level={level.bars} active={level.selected} />
              <View style={styles.texts}>
                <UiText size={17} weight="extrabold">
                  {t(`level.${level.id}`)}
                </UiText>
                <UiText size={14} weight="semibold" color={colors.inkMuted}>
                  {t(`level.${level.id}.hint`)}
                </UiText>
              </View>
            </Tile>
          ))}
        </View>
        {c.showPlacementNote ? (
          <View style={styles.note} accessibilityLiveRegion="polite" testID="level-placement">
            <UiText size={14} weight="bold" color={colors.blueShadow}>
              {t('level.placement')}
            </UiText>
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <ChunkyButton
          label={t('onboarding.continue')}
          onPress={c.next}
          disabled={!c.canContinue}
          highlight
          testID="level-continue"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  greeting: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingTop: 8 },
  bubble: { flex: 1, marginBottom: 10 },
  list: { gap: 10 },
  level: {
    minHeight: 66,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  texts: { flex: 1, gap: 2 },
  note: { padding: 14, borderRadius: 14, backgroundColor: colors.blueLight },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
});
