import { ChunkyButton, Galet, Icon, UiText, colors } from '@gbe/ui';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '../../components/IconButton';
import { t, type TranslationKey } from '../../core/i18n';
import { useDeleteAccountController } from './useDeleteAccountController';

const ERASED: readonly TranslationKey[] = [
  'delete.item.lessons',
  'delete.item.streak',
  'delete.item.league',
];

/** Écran 12 (proposition validée) : confirmation avant de tout effacer. */
export function DeleteAccountScreen() {
  const { status, confirm, keep } = useDeleteAccountController();
  const working = status === 'working';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <IconButton icon="close" label={t('delete.close')} onPress={keep} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mascot}>
          <Galet pose="triste" size={170} />
        </View>
        <UiText size={28} weight="extrabold" accessibilityRole="header" style={styles.center}>
          {t('delete.title')}
        </UiText>
        <UiText size={16} color={colors.inkMuted} style={[styles.center, styles.body]}>
          {t('delete.body')}
        </UiText>
        <View style={styles.list}>
          {ERASED.map((key) => (
            <View key={key} style={styles.item}>
              <Icon name="close" size={20} color={colors.redText} />
              <UiText size={15} weight="bold" color={colors.redText}>
                {t(key)}
              </UiText>
            </View>
          ))}
        </View>
        {status === 'error' ? (
          <UiText
            size={15}
            weight="bold"
            color={colors.redText}
            style={styles.center}
            accessibilityLiveRegion="polite">
            {t('delete.error')}
          </UiText>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <ChunkyButton label={t('delete.keep')} onPress={keep} highlight testID="delete-keep" />
        <ChunkyButton
          label={working ? t('delete.working') : t('delete.confirm')}
          onPress={confirm}
          variant="dangerOutline"
          disabled={working}
          testID="delete-confirm"
        />
        <UiText size={13} color={colors.inkSoft} style={styles.center}>
          {t('delete.after')}
        </UiText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  top: { paddingHorizontal: 12, paddingTop: 12 },
  content: { paddingHorizontal: 24, paddingBottom: 16, gap: 12 },
  mascot: { alignItems: 'center', paddingTop: 8 },
  center: { textAlign: 'center' },
  body: { lineHeight: 24 },
  list: {
    marginTop: 10,
    padding: 16,
    gap: 10,
    borderRadius: 16,
    backgroundColor: colors.redLight,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 },
});
