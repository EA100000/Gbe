import { Icon, UiText, colors } from '@gbe/ui';
import { StyleSheet, View } from 'react-native';

import { useContent } from '../core/content/contentStore';
import { t } from '../core/i18n';

/** Rappelle que le contenu n'est pas encore validé par les deux experts en fon. */
export function TestContentBanner() {
  const { pack } = useContent();
  if (pack.validated) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Icon name="info" size={18} color={colors.redText} />
      <UiText size={13} weight="bold" color={colors.redText} style={styles.text}>
        {t('content.testBanner')}
      </UiText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.redLight,
  },
  text: { flex: 1 },
});
