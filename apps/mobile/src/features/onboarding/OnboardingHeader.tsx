import { MIN_TOUCH, ProgressBar } from '@gbe/ui';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '../../components/IconButton';
import { t } from '../../core/i18n';
import { ONBOARDING_STEPS } from './useOnboardingControllers';

/** Haut des écrans du démarrage : retour (sauf à la première étape) et avancement. */
export function OnboardingHeader({ step, onBack }: { step: number; onBack?: () => void }) {
  return (
    <View style={styles.row}>
      {onBack === undefined ? (
        <View style={styles.spacer} />
      ) : (
        <IconButton
          icon="chevronLeft"
          label={t('onboarding.back')}
          onPress={onBack}
          testID="onboarding-back"
        />
      )}
      <ProgressBar
        value={step / ONBOARDING_STEPS}
        accessibilityLabel={t('onboarding.step', { n: step, total: ONBOARDING_STEPS })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    paddingLeft: 8,
    paddingRight: 20,
  },
  spacer: { width: MIN_TOUCH, height: MIN_TOUCH },
});
