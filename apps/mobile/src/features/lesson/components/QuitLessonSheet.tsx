import { ChunkyButton, Galet, MIN_TOUCH, UiText, colors } from '@gbe/ui';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../../../core/i18n';

/**
 * Écran 17 (proposition validée) : confirmation avant de quitter une leçon, depuis la croix
 * ou le bouton « retour » d'Android. Toucher le fond revient à la leçon.
 */
export function QuitLessonSheet({
  visible,
  onStay,
  onLeave,
}: {
  visible: boolean;
  onStay: () => void;
  onLeave: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onStay}>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('lesson.quitSheet.stay')}
          onPress={onStay}
          style={styles.backdrop}
          testID="quit-backdrop"
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}
          testID="quit-sheet">
          <View style={styles.handle} />
          <View style={styles.message}>
            <Galet pose="triste" size={92} />
            <View style={styles.text}>
              <UiText size={24} weight="extrabold" accessibilityRole="header">
                {t('lesson.quitSheet.title')}
              </UiText>
              <UiText size={15} color={colors.inkMuted} style={styles.body}>
                {t('lesson.quitSheet.body')}
              </UiText>
            </View>
          </View>
          <ChunkyButton
            label={t('lesson.quitSheet.stay')}
            onPress={onStay}
            variant="blue"
            testID="quit-stay"
          />
          <Pressable
            accessibilityRole="button"
            onPress={onLeave}
            style={styles.leave}
            testID="quit-leave">
            <UiText size={16} weight="extrabold" color={colors.redText}>
              {t('lesson.quitSheet.leave')}
            </UiText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(33, 29, 24, 0.5)' },
  sheet: {
    paddingTop: 10,
    paddingHorizontal: 20,
    gap: 14,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.white,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  message: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, gap: 6 },
  body: { lineHeight: 21 },
  leave: { minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
