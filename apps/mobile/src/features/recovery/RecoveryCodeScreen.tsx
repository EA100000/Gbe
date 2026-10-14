import { ChunkyButton, Galet, Icon, UiText, colors, fonts, type IconName } from '@gbe/ui';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '../../components/IconButton';
import { t, type TranslationKey } from '../../core/i18n';
import { useRecoveryCodeController } from './useRecoveryCodeController';

const TIPS: readonly { icon: IconName; key: TranslationKey }[] = [
  { icon: 'pencil', key: 'recoveryCode.tip.write' },
  { icon: 'shield', key: 'recoveryCode.tip.secret' },
  { icon: 'info', key: 'recoveryCode.tip.noEmail' },
];

/** Le code lu caractère par caractère par les lecteurs d'écran (« K 7 Q M, 3 X R P… »). */
function spelled(code: string): string {
  return code
    .split('-')
    .map((group) => group.split('').join(' '))
    .join(', ');
}

/** Écran 13 (proposition validée) : le code qui permet de retrouver sa progression. */
export function RecoveryCodeScreen() {
  const { state, copied, copy, retry, close } = useRecoveryCodeController();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <IconButton icon="chevronLeft" label={t('recoveryCode.back')} onPress={close} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mascot}>
          <Galet pose="content" size={124} />
        </View>
        <UiText size={25} weight="extrabold" accessibilityRole="header" style={styles.center}>
          {t('recoveryCode.title')}
        </UiText>
        <UiText size={16} color={colors.inkMuted} style={[styles.center, styles.body]}>
          {t('recoveryCode.body')}
        </UiText>

        <View style={styles.card} accessibilityLiveRegion="polite">
          {state.status === 'loading' ? (
            <View style={styles.status}>
              <ActivityIndicator color={colors.blue} />
              <UiText size={15} color={colors.inkMuted}>
                {t('recoveryCode.loading')}
              </UiText>
            </View>
          ) : null}
          {state.status === 'offline' ? (
            <View style={styles.status}>
              <UiText size={15} weight="bold" color={colors.inkMuted} style={styles.center}>
                {t('recoveryCode.offline')}
              </UiText>
              <ChunkyButton label={t('common.retry')} onPress={retry} variant="blue" />
            </View>
          ) : null}
          {state.status === 'ready' ? (
            <>
              <UiText
                size={27}
                style={styles.code}
                accessibilityLabel={t('recoveryCode.spoken', { letters: spelled(state.code) })}
                selectable
                testID="recovery-code">
                {state.code}
              </UiText>
              <Pressable
                accessibilityRole="button"
                onPress={copy}
                style={styles.copy}
                testID="recovery-copy">
                <Icon name={copied ? 'check' : 'copy'} size={20} color={colors.blueShadow} />
                <UiText size={16} weight="extrabold" color={colors.blueShadow}>
                  {copied ? t('recoveryCode.copied') : t('recoveryCode.copy')}
                </UiText>
              </Pressable>
            </>
          ) : null}
        </View>

        <View style={styles.tips}>
          {TIPS.map((tip) => (
            <View key={tip.key} style={styles.tip}>
              <Icon name={tip.icon} size={22} color={colors.blue} />
              <UiText size={15} color={colors.inkMuted} style={styles.tipText}>
                {t(tip.key)}
              </UiText>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <ChunkyButton
          label={t('recoveryCode.done')}
          onPress={close}
          highlight
          testID="recovery-done"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  top: { paddingHorizontal: 12, paddingTop: 12 },
  content: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  mascot: { alignItems: 'center' },
  center: { textAlign: 'center' },
  body: { lineHeight: 24, paddingHorizontal: 4 },
  card: {
    marginTop: 10,
    minHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.yellowShadow,
    backgroundColor: colors.cream,
  },
  status: { alignItems: 'center', gap: 12 },
  code: { fontFamily: fonts.fon.bold, letterSpacing: 1.4, color: colors.ink },
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.blue,
    backgroundColor: colors.white,
  },
  tips: { marginTop: 10, gap: 12 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tipText: { flex: 1, lineHeight: 21 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
});
