import { ChunkyButton, Galet, Icon, MIN_TOUCH, UiText, colors } from '@gbe/ui';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { IconButton } from '../../components/IconButton';
import { t, tPlural } from '../../core/i18n';
import { useOutOfHeartsController } from './useOutOfHeartsController';

const HEART =
  'M12 20.5s-7.5-4.6-7.5-10.4A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.5c0 5.8-7.5 10.4-7.5 10.4z';

/** Cœur plein (vie disponible) ou vide (vie à attendre) : la forme suffit, pas seulement la couleur. */
function HeartSlot({ filled }: { filled: boolean }) {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24">
      <Path
        d={HEART}
        fill={filled ? colors.red : colors.borderSoft}
        stroke={filled ? colors.redDark : colors.lockedShadow}
        strokeWidth={1.6}
      />
    </Svg>
  );
}

function WaitRow({
  icon,
  label,
  value,
  color,
  divider = false,
  testID,
}: {
  icon: 'clockLine' | 'heart';
  label: string;
  value: string;
  color: string;
  divider?: boolean;
  testID: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label} : ${value}`}
      style={[styles.row, divider ? styles.divider : null]}
      testID={testID}>
      <Icon name={icon} size={24} color={colors.blue} />
      <UiText size={16} weight="bold" style={styles.grow}>
        {label}
      </UiText>
      <UiText size={16} weight="extrabold" color={color}>
        {value}
      </UiText>
    </View>
  );
}

/** Écran 16 (proposition validée) : plus de vies, et quand elles reviennent. */
export function OutOfHeartsScreen() {
  const c = useOutOfHeartsController();
  const slots = Array.from({ length: c.max }, (_, i) => i < c.count);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <IconButton icon="close" label={t('hearts.close')} onPress={c.backToPath} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mascot}>
          <Galet pose={c.count === 0 ? 'triste' : 'content'} size={160} />
        </View>
        <UiText size={28} weight="extrabold" accessibilityRole="header" style={styles.center}>
          {c.count === 0 ? t('hearts.title') : t('hearts.titleBack')}
        </UiText>
        <UiText size={16} color={colors.inkMuted} style={[styles.center, styles.body]}>
          {t('hearts.body')}
        </UiText>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={tPlural(c.count, 'hearts.count.one', 'hearts.count.other', {
            max: c.max,
          })}
          style={styles.hearts}
          testID="hearts-slots">
          {slots.map((filled, i) => (
            <HeartSlot key={i} filled={filled} />
          ))}
        </View>
        {c.nextIn !== null && c.fullIn !== null ? (
          <View style={styles.card}>
            <WaitRow
              icon="clockLine"
              label={t('hearts.next')}
              value={t('hearts.in', { time: c.nextIn })}
              color={colors.blueShadow}
              testID="hearts-next"
            />
            <WaitRow
              icon="heart"
              label={t('hearts.full')}
              value={t('hearts.in', { time: c.fullIn })}
              color={colors.redText}
              divider
              testID="hearts-full"
            />
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <ChunkyButton
          label={t('hearts.back')}
          onPress={c.backToPath}
          highlight
          testID="hearts-back"
        />
        <Pressable
          accessibilityRole="link"
          onPress={c.openSounds}
          style={styles.sounds}
          testID="hearts-sounds">
          <Icon name="tabSounds" size={20} color={colors.blue} />
          <UiText size={15} weight="bold" color={colors.blue}>
            {t('hearts.sounds')}
          </UiText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  top: { paddingHorizontal: 12, paddingTop: 12 },
  content: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  mascot: { alignItems: 'center', paddingTop: 8 },
  center: { textAlign: 'center' },
  body: { lineHeight: 24, paddingHorizontal: 8 },
  hearts: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 12 },
  card: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  divider: { borderTopWidth: 2, borderTopColor: colors.borderSoft },
  grow: { flex: 1 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 6 },
  sounds: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
