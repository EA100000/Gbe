import { Icon, ProgressBar, UiText, colors } from '@gbe/ui';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '../../../components/IconButton';
import { t, tPlural } from '../../../core/i18n';

/**
 * Haut de l'écran : quitter, barre de progression, vies restantes.
 * Séance d'entraînement : une étiquette (« Entraînement ») remplace les vies, qui ne servent pas.
 */
export function LessonTopBar({
  progress,
  hearts,
  badge,
  onQuit,
}: {
  progress: number;
  hearts: number;
  badge?: string | undefined;
  onQuit: () => void;
}) {
  return (
    <View style={styles.bar}>
      <IconButton icon="close" label={t('lesson.quit')} onPress={onQuit} testID="lesson-quit" />
      <ProgressBar value={progress} accessibilityLabel={t('lesson.progress')} />
      {badge === undefined ? (
        <View
          accessible
          accessibilityLabel={tPlural(hearts, 'lesson.heartsLeft.one', 'lesson.heartsLeft.other')}
          style={styles.hearts}
          testID="lesson-hearts">
          <Icon name="heart" size={24} />
          <UiText size={17} weight="extrabold" color={colors.redDark}>
            {hearts}
          </UiText>
        </View>
      ) : (
        <View style={styles.badge} testID="lesson-badge">
          <UiText size={13} weight="extrabold" color={colors.blueShadow}>
            {badge}
          </UiText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    paddingLeft: 6,
    paddingRight: 16,
  },
  hearts: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  badge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.blueLight,
  },
});
