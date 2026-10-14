import { Icon, ProgressBar, UiText, colors } from '@gbe/ui';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '../../../components/IconButton';
import { t } from '../../../core/i18n';

/** Haut de l'écran : quitter, barre de progression, vies restantes. */
export function LessonTopBar({
  progress,
  hearts,
  onQuit,
}: {
  progress: number;
  hearts: number;
  onQuit: () => void;
}) {
  return (
    <View style={styles.bar}>
      <IconButton icon="close" label={t('lesson.quit')} onPress={onQuit} testID="lesson-quit" />
      <ProgressBar value={progress} accessibilityLabel={t('lesson.progress')} />
      <View
        accessible
        accessibilityLabel={t('lesson.heartsLeft', { n: hearts })}
        style={styles.hearts}
        testID="lesson-hearts">
        <Icon name="heart" size={24} />
        <UiText size={17} weight="extrabold" color={colors.redDark}>
          {hearts}
        </UiText>
      </View>
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
});
