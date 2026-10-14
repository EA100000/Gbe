import { ChunkyButton, Galet, Icon, UiText, colors, fonts, type IconName } from '@gbe/ui';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '../../components/IconButton';
import { SpeechBubble } from '../../components/SpeechBubble';
import { t, tPlural, type TranslationKey } from '../../core/i18n';
import { useRecoverAccountController, type RecoverStatus } from './useRecoverAccountController';

/** Message sous le champ, selon l'état (aide, refus, réseau). */
const MESSAGES: Partial<
  Record<RecoverStatus, { key: TranslationKey; icon: IconName | null; color: string }>
> = {
  typing: { key: 'recover.help', icon: null, color: colors.inkMuted },
  working: { key: 'recover.help', icon: null, color: colors.inkMuted },
  unknown: { key: 'recover.unknown', icon: 'warning', color: colors.redText },
  invalid: { key: 'recover.invalid', icon: 'warning', color: colors.redText },
  offline: { key: 'recover.offline', icon: 'offline', color: colors.inkMuted },
  busy: { key: 'recover.busy', icon: 'offline', color: colors.inkMuted },
};

function FoundStat({
  icon,
  value,
  label,
  color,
}: {
  icon: IconName;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View accessible accessibilityLabel={`${label} : ${value}`} style={styles.stat}>
      <Icon name={icon} size={28} color={colors.blue} />
      <UiText size={19} weight="extrabold" color={color}>
        {value}
      </UiText>
      <UiText size={13} color={colors.inkMuted}>
        {label}
      </UiText>
    </View>
  );
}

/** Écran 14 (proposition validée) : retrouver sa progression avec son code. */
export function RecoverAccountScreen() {
  const c = useRecoverAccountController();

  if (c.status === 'found') {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.found}>
          <Galet pose="fete" size={170} />
          <UiText size={28} weight="extrabold" accessibilityRole="header" style={styles.center}>
            {t('recover.found.title', { pseudo: c.found.pseudo })}
          </UiText>
          <UiText size={16} color={colors.inkMuted} style={styles.center}>
            {t('recover.found.body')}
          </UiText>
          <View style={styles.stats}>
            <FoundStat
              icon="flame"
              value={tPlural(c.found.streak, 'profile.streak.one', 'profile.streak.other')}
              label={t('profile.streakLabel')}
              color={colors.redText}
            />
            <FoundStat
              icon="bolt"
              value={String(c.found.xp)}
              label={t('recover.found.xp')}
              color={colors.yellowText}
            />
            <FoundStat
              icon="book"
              value={String(c.found.lessons)}
              label={t('recover.found.lessons')}
              color={colors.blueShadow}
            />
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <ChunkyButton
            label={t('common.continue')}
            onPress={c.continue}
            highlight
            testID="recover-continue"
          />
        </View>
      </SafeAreaView>
    );
  }

  const message = MESSAGES[c.status] ?? MESSAGES.typing;
  const refused = c.status === 'unknown' || c.status === 'invalid';
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <IconButton icon="chevronLeft" label={t('recover.back')} onPress={c.back} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.greeting}>
          <Galet pose="parle" size={112} />
          <SpeechBubble style={styles.bubble}>
            <UiText size={16} weight="semibold">
              {t('recover.greeting')}
            </UiText>
          </SpeechBubble>
        </View>
        <View style={styles.intro}>
          <UiText size={24} weight="extrabold" accessibilityRole="header">
            {t('recover.title')}
          </UiText>
          <UiText size={15} color={colors.inkMuted}>
            {t('recover.body')}
          </UiText>
        </View>
        <View style={styles.field}>
          <UiText size={15} weight="extrabold" nativeID="recover-label">
            {t('recover.label')}
          </UiText>
          <TextInput
            value={c.code}
            onChangeText={c.changeCode}
            onSubmitEditing={c.submit}
            placeholder={t('recover.placeholder')}
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            returnKeyType="go"
            accessibilityLabelledBy="recover-label"
            accessibilityLabel={t('recover.label')}
            accessibilityHint={t(message?.key ?? 'recover.help')}
            style={[styles.input, refused ? styles.inputRefused : null]}
            testID="recover-input"
          />
          {message !== undefined ? (
            <View style={styles.message} accessibilityLiveRegion="polite">
              {message.icon !== null ? (
                <Icon name={message.icon} size={20} color={message.color} />
              ) : null}
              <UiText
                size={message.icon === null ? 14 : 15}
                weight={message.icon === null ? 'regular' : 'bold'}
                color={message.color}
                style={styles.messageText}
                testID="recover-message">
                {t(message.key)}
              </UiText>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <ChunkyButton
          label={c.status === 'working' ? t('recover.working') : t('recover.submit')}
          onPress={c.submit}
          disabled={!c.canSubmit}
          highlight
          testID="recover-submit"
        />
        <View style={styles.note}>
          <Icon name="info" size={20} color={colors.inkMuted} />
          <UiText size={14} color={colors.inkMuted} style={styles.messageText}>
            {`${t('recover.noCode')} `}
            <UiText
              size={14}
              weight="extrabold"
              color={colors.blue}
              accessibilityRole="link"
              onPress={c.startFresh}
              testID="recover-start-fresh">
              {t('recover.startFresh')}
            </UiText>
          </UiText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  top: { paddingHorizontal: 12, paddingTop: 12 },
  content: { paddingBottom: 16 },
  greeting: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 20,
  },
  bubble: { flex: 1, marginBottom: 14 },
  intro: { paddingHorizontal: 20, paddingTop: 16, gap: 8 },
  field: { paddingHorizontal: 20, paddingTop: 18, gap: 8 },
  input: {
    height: 60,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.lockedShadow,
    fontFamily: fonts.fon.bold,
    fontSize: 24,
    letterSpacing: 1.9,
    color: colors.ink,
  },
  inputRefused: { borderColor: colors.redDark },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  messageText: { flex: 1 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 14 },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  found: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 72, gap: 12 },
  center: { textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 10, marginTop: 14, alignSelf: 'stretch' },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
  },
});
