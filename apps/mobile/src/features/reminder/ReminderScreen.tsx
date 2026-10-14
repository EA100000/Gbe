import { ChunkyButton, Galet, Icon, MIN_TOUCH, UiText, colors } from '@gbe/ui';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '../../components/IconButton';
import { SpeechBubble } from '../../components/SpeechBubble';
import { t } from '../../core/i18n';
import { useReminderController, type ReminderOrigin } from './useReminderController';

/** Écran 15 (proposition validée) : rappel quotidien, depuis le Profil ou après la 1re leçon. */
export function ReminderScreen({ origin }: { origin: ReminderOrigin }) {
  const c = useReminderController(origin);
  const disabled = !c.on;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        {c.fromLesson ? null : (
          <IconButton icon="chevronLeft" label={t('reminder.back')} onPress={c.close} />
        )}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.greeting}>
          <Galet pose={c.fromLesson ? 'fete' : 'parle'} size={104} />
          <SpeechBubble style={styles.bubble}>
            <UiText size={16} weight="semibold">
              {c.fromLesson ? t('reminder.greeting.lesson') : t('reminder.greeting.profile')}
            </UiText>
          </SpeechBubble>
        </View>

        <View style={styles.body}>
          <UiText size={24} weight="extrabold" accessibilityRole="header">
            {c.fromLesson ? t('reminder.title.lesson') : t('reminder.title.profile')}
          </UiText>

          {c.fromLesson || c.blocked ? null : (
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: c.on }}
              accessibilityLabel={t('reminder.switch')}
              accessibilityHint={c.status}
              onPress={c.toggle}
              style={styles.switchRow}
              testID="reminder-switch">
              <Icon name="bell" size={24} color={colors.blue} />
              <View style={styles.grow}>
                <UiText size={16} weight="extrabold">
                  {t('reminder.switch')}
                </UiText>
                <UiText size={14} color={colors.inkMuted}>
                  {c.status}
                </UiText>
              </View>
              <View style={[styles.track, c.on ? styles.trackOn : null]}>
                <View style={[styles.knob, c.on ? styles.knobOn : null]} />
              </View>
            </Pressable>
          )}

          {c.blocked ? (
            <View style={styles.blocked} testID="reminder-blocked">
              <View style={styles.row}>
                <Icon name="bellOff" size={22} color={colors.redText} />
                <UiText size={15} weight="bold" color={colors.redText} style={styles.grow}>
                  {t('reminder.blocked')}
                </UiText>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={c.openSettings}
                style={styles.settingsButton}
                testID="reminder-settings">
                <UiText size={15} weight="extrabold" color={colors.redText}>
                  {t('reminder.openSettings')}
                </UiText>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.section}>
            <UiText size={13} weight="extrabold" color={colors.inkMuted} style={styles.kicker}>
              {t('reminder.when').toLocaleUpperCase('fr-FR')}
            </UiText>
            <View style={styles.grid}>
              {c.presets.map((preset) => (
                <Pressable
                  key={preset.hour}
                  accessibilityRole="button"
                  accessibilityState={{ selected: preset.selected, disabled }}
                  accessibilityLabel={`${t(preset.label)}, ${preset.time}`}
                  disabled={disabled}
                  onPress={preset.pick}
                  style={[
                    styles.preset,
                    preset.selected ? styles.selected : null,
                    disabled ? styles.dimmed : null,
                  ]}
                  testID={`reminder-hour-${preset.hour}`}>
                  <Icon
                    name={preset.icon}
                    size={24}
                    color={preset.selected ? colors.blueShadow : colors.inkSoft}
                  />
                  <View style={styles.grow}>
                    <UiText size={16} weight="extrabold">
                      {t(preset.label)}
                    </UiText>
                    <UiText size={14} color={colors.inkMuted}>
                      {preset.time}
                    </UiText>
                  </View>
                  {preset.selected ? <Icon name="check" size={20} color={colors.blue} /> : null}
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: c.otherOpen, disabled }}
              disabled={disabled}
              onPress={c.toggleOther}
              style={[
                styles.other,
                c.otherSelected ? styles.selected : null,
                disabled ? styles.dimmed : null,
              ]}
              testID="reminder-other">
              <Icon name="clockLine" size={20} color={colors.blueShadow} />
              <UiText size={15} weight="extrabold" color={colors.blueShadow}>
                {c.otherLabel}
              </UiText>
            </Pressable>
            {c.otherOpen ? (
              <View style={styles.hours}>
                {c.otherHours.map((h) => (
                  <Pressable
                    key={h.hour}
                    accessibilityRole="button"
                    accessibilityState={{ selected: h.selected }}
                    onPress={h.pick}
                    style={[styles.hour, h.selected ? styles.selected : null]}
                    testID={`reminder-other-${h.hour}`}>
                    <UiText size={15} weight="extrabold">
                      {h.time}
                    </UiText>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <UiText size={13} weight="extrabold" color={colors.inkMuted} style={styles.kicker}>
              {t('reminder.preview').toLocaleUpperCase('fr-FR')}
            </UiText>
            <View style={styles.preview} accessible>
              <View style={styles.previewIcon}>
                <Galet pose="avatar" size={40} />
              </View>
              <View style={styles.grow}>
                <UiText size={13} color={colors.inkMuted}>
                  {c.preview.from}
                </UiText>
                <UiText size={15} weight="extrabold">
                  {c.preview.title}
                </UiText>
                <UiText size={14} color={colors.inkMuted}>
                  {c.preview.body}
                </UiText>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <Icon name="info" size={20} color={colors.inkMuted} />
            <UiText size={14} color={colors.inkMuted} style={styles.grow}>
              {t('reminder.goalNote')}
            </UiText>
          </View>
        </View>
      </ScrollView>

      {c.fromLesson ? (
        <View style={styles.footer}>
          <ChunkyButton
            label={t('reminder.activate')}
            onPress={c.activate}
            highlight
            testID="reminder-activate"
          />
          <Pressable
            accessibilityRole="button"
            onPress={c.later}
            style={styles.later}
            testID="reminder-later">
            <UiText size={15} weight="bold" color={colors.blue}>
              {t('reminder.later')}
            </UiText>
          </Pressable>
          <UiText size={13} color={colors.inkSoft} style={styles.center}>
            {t('reminder.permissionNote')}
          </UiText>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  top: { minHeight: 24, paddingHorizontal: 12, paddingTop: 12 },
  content: { paddingBottom: 16 },
  greeting: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 20,
  },
  bubble: { flex: 1, marginBottom: 12 },
  body: { paddingHorizontal: 20, paddingTop: 12, gap: 16 },
  grow: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  center: { textAlign: 'center' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
  },
  track: {
    width: 52,
    height: 32,
    padding: 3,
    borderRadius: 16,
    backgroundColor: colors.inkSoft,
  },
  trackOn: { backgroundColor: colors.blue },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white },
  knobOn: { marginLeft: 20 },
  blocked: { gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.redLight },
  settingsButton: {
    alignSelf: 'flex-start',
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.redDark,
    backgroundColor: colors.white,
  },
  section: { gap: 10 },
  kicker: { letterSpacing: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  preset: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 60,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  selected: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  dimmed: { opacity: 0.45 },
  other: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: MIN_TOUCH,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  hours: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hour: {
    minWidth: 64,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
  },
  previewIcon: { width: 40, height: 40, borderRadius: 12, overflow: 'hidden' },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 6 },
  later: { minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
