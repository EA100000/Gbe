import type { LearningReason } from '@gbe/domain';
import {
  ChunkyButton,
  FonText,
  Galet,
  Icon,
  MIN_TOUCH,
  Tile,
  UiText,
  colors,
  type IconName,
} from '@gbe/ui';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SpeechBubble } from '../../components/SpeechBubble';
import { useContent } from '../../core/content/contentStore';
import { t } from '../../core/i18n';
import { OnboardingHeader } from './OnboardingHeader';
import { useReasonController } from './useOnboardingControllers';

const REASON_ICONS: Record<LearningReason, IconName> = {
  famille: 'family',
  racines: 'roots',
  voyage: 'pin',
  couple: 'heartLine',
  travail: 'briefcase',
  curiosite: 'bulb',
  autre: 'dots',
};

/** Écran 1a (proposition validée) : le Galet se présente et demande pourquoi apprendre le fon. */
export function ReasonScreen() {
  const { pack } = useContent();
  const c = useReasonController();

  return (
    <SafeAreaView style={styles.screen}>
      <OnboardingHeader step={1} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.greeting}>
          <Galet pose="parle" size={96} />
          <SpeechBubble style={styles.bubble}>
            <UiText size={16} weight="semibold">
              {pack.uiFon?.greeting !== undefined ? (
                <FonText size={16} color={colors.blue}>
                  {`${pack.uiFon.greeting} `}
                </FonText>
              ) : null}
              {t('reason.intro')}
            </UiText>
          </SpeechBubble>
        </View>
        <UiText size={22} weight="extrabold" accessibilityRole="header">
          {t('reason.title')}
        </UiText>
        <View style={styles.list} accessibilityRole="radiogroup">
          {c.reasons.map((reason) => (
            <Tile
              key={reason.id}
              state={reason.selected ? 'selected' : 'idle'}
              onPress={reason.choose}
              accessibilityLabel={t(`reason.${reason.id}`)}
              accessibilityState={{ checked: reason.selected }}
              style={styles.reason}
              testID={`reason-${reason.id}`}>
              <Icon
                name={REASON_ICONS[reason.id]}
                color={reason.selected ? colors.blueShadow : colors.yellowText}
              />
              <UiText size={16} weight="extrabold" style={styles.label}>
                {t(`reason.${reason.id}`)}
              </UiText>
            </Tile>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <ChunkyButton
          label={t('onboarding.continue')}
          onPress={c.next}
          disabled={!c.canContinue}
          highlight
          testID="reason-continue"
        />
        {c.canRecover ? (
          <Pressable
            accessibilityRole="link"
            onPress={c.recover}
            style={styles.recover}
            testID="welcome-recover">
            <UiText size={15} weight="bold" color={colors.blue}>
              {t('recover.link')}
            </UiText>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  greeting: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingTop: 8 },
  bubble: { flex: 1, marginBottom: 10 },
  list: { gap: 8 },
  reason: {
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 14,
    paddingHorizontal: 16,
  },
  label: { flex: 1 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 4 },
  recover: { minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
