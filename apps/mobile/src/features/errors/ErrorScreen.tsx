import { ChunkyButton, Galet, MIN_TOUCH, UiText, colors } from '@gbe/ui';
import { router, type ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { t } from '../../core/i18n';
import { reportError } from '../../core/monitoring/monitoring';

/**
 * Écran 19 (proposition validée) : affiché à la place d'un écran qui plante.
 * Volontairement sans dépendance aux fournisseurs de l'appli (zones sûres, données),
 * qui peuvent être eux-mêmes en cause.
 */
export function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  const backToPath = () => {
    try {
      router.replace('/');
    } catch {
      // La navigation elle-même peut être en panne : on retente l'écran quand même.
    }
    void retry();
  };

  return (
    <View style={styles.screen} testID="error-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <Galet pose="triste" size={170} />
        <UiText size={28} weight="extrabold" accessibilityRole="header" style={styles.center}>
          {t('error.title')}
        </UiText>
        <UiText size={16} color={colors.inkMuted} style={[styles.center, styles.body]}>
          {t('error.body')}
        </UiText>
      </ScrollView>
      <View style={styles.footer}>
        <ChunkyButton
          label={t('error.retry')}
          onPress={() => void retry()}
          highlight
          testID="error-retry"
        />
        <Pressable
          accessibilityRole="link"
          onPress={backToPath}
          style={styles.home}
          testID="error-home">
          <UiText size={15} weight="bold" color={colors.blue}>
            {t('error.home')}
          </UiText>
        </Pressable>
        <UiText size={13} color={colors.inkSoft} style={styles.center}>
          {t('error.hint')}
        </UiText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white, paddingTop: 48, paddingBottom: 24 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28 },
  center: { textAlign: 'center' },
  body: { lineHeight: 24 },
  footer: { paddingHorizontal: 20, gap: 10 },
  home: { minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
