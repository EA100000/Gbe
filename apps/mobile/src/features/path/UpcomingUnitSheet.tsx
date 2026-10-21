import type { PlannedUnit } from '@gbe/domain';
import { ChunkyButton, Galet, UiText, colors } from '@gbe/ui';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../../core/i18n';

/** Écran 23 : ce qui attend une unité « en préparation ». Toucher le fond referme. */
export function UpcomingUnitSheet({
  unit,
  onClose,
}: {
  unit: PlannedUnit | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={unit !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('path.upcoming.sheetClose')}
          onPress={onClose}
          style={styles.backdrop}
        />
        {unit === null ? null : (
          <View
            accessibilityViewIsModal
            style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}
            testID="upcoming-sheet">
            <View style={styles.handle} />
            <View style={styles.head}>
              <Galet pose="parle" size={84} />
              <View style={styles.titles}>
                <UiText size={13} weight="extrabold" color={colors.inkMuted} style={styles.kicker}>
                  {t('path.upcoming.sheetKicker', { n: unit.order }).toLocaleUpperCase('fr-FR')}
                </UiText>
                <UiText size={22} weight="extrabold" accessibilityRole="header">
                  {unit.title}
                </UiText>
              </View>
            </View>
            <UiText size={16} style={styles.body}>
              {t('path.upcoming.sheetBody', { subtitle: unit.subtitle })}
            </UiText>
            <ChunkyButton
              label={t('path.upcoming.sheetClose')}
              onPress={onClose}
              testID="upcoming-close"
            />
          </View>
        )}
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
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titles: { flex: 1, gap: 2 },
  kicker: { letterSpacing: 1 },
  body: { lineHeight: 23 },
});
