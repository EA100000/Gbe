import { Galet, Icon, Tile, UiText, colors, type IconName } from '@gbe/ui';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalBars, GoalPicker } from '../../components/GoalPicker';
import { t, tPlural } from '../../core/i18n';
import { useProfileController } from './useProfileController';

function StatTile({
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
      <Icon name={icon} size={30} color={colors.blue} />
      <View>
        <UiText size={20} weight="extrabold" color={color}>
          {value}
        </UiText>
        <UiText size={13} color={colors.inkMuted}>
          {label}
        </UiText>
      </View>
    </View>
  );
}

function AccountRow({
  icon,
  label,
  onPress,
  danger = false,
  divider = false,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  /** Trait de séparation au-dessus (toutes les lignes sauf la première). */
  divider?: boolean;
  testID?: string;
}) {
  const color = danger ? colors.redText : colors.ink;
  return (
    <Pressable
      accessibilityRole={danger ? 'button' : 'link'}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.row, divider ? styles.divider : null]}
      testID={testID}>
      <Icon name={icon} size={22} color={danger ? colors.redText : colors.inkMuted} />
      <UiText
        size={16}
        weight={danger ? 'extrabold' : 'bold'}
        color={color}
        style={styles.rowLabel}>
        {label}
      </UiText>
      <Icon name="chevronRight" size={20} color={danger ? colors.redText : colors.inkSoft} />
    </Pressable>
  );
}

/** Écran 11 (proposition validée) : pseudo, progrès, objectif du jour, compte. */
export function ProfileScreen() {
  const c = useProfileController();
  const goalLabel = t(`welcome.goal.${c.goal.id}`);
  const goalMinutes = t('welcome.goal.minutes', { n: c.goal.minutes });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Galet pose="avatar" size={88} />
        <View style={styles.identity}>
          <UiText size={24} weight="extrabold" accessibilityRole="header" testID="profile-pseudo">
            {c.pseudo ?? ''}
          </UiText>
          <UiText size={14} color={colors.inkMuted}>
            {t('profile.pseudoCaption')}
          </UiText>
          <Pressable
            accessibilityRole="button"
            onPress={c.rerollPseudo}
            style={styles.reroll}
            testID="profile-reroll">
            <Icon name="refresh" size={18} color={colors.blue} />
            <UiText size={15} weight="extrabold" color={colors.blue}>
              {t('profile.pseudoChange')}
            </UiText>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <UiText size={13} weight="extrabold" color={colors.inkMuted} style={styles.kicker}>
            {t('profile.stats').toLocaleUpperCase('fr-FR')}
          </UiText>
          <View style={styles.grid}>
            <StatTile
              icon="flame"
              value={tPlural(c.stats.streak, 'profile.streak.one', 'profile.streak.other')}
              label={t('profile.streakLabel')}
              color={colors.redText}
            />
            <StatTile
              icon="bolt"
              value={String(c.stats.xp)}
              label={t('profile.xpLabel')}
              color={colors.yellowText}
            />
            <StatTile
              icon="book"
              value={String(c.stats.lessons)}
              label={t('profile.lessonsLabel')}
              color={colors.blueShadow}
            />
            <StatTile
              icon="cauris"
              value={String(c.stats.cauris)}
              label={t('profile.caurisLabel')}
              color={colors.yellowText}
            />
          </View>
        </View>

        <View style={styles.section}>
          <UiText size={13} weight="extrabold" color={colors.inkMuted} style={styles.kicker}>
            {t('profile.goal').toLocaleUpperCase('fr-FR')}
          </UiText>
          {c.editingGoal ? (
            <GoalPicker value={c.goal.id} onChange={(goal) => void c.chooseGoal(goal)} />
          ) : (
            <Tile
              state="selected"
              onPress={c.toggleGoal}
              accessibilityLabel={t('profile.goalCurrent', {
                goal: goalLabel,
                minutes: goalMinutes,
              })}
              style={styles.goal}
              testID="profile-goal">
              <GoalBars level={c.goal.level} active />
              <View style={styles.goalText}>
                <UiText size={17} weight="extrabold">
                  {goalLabel}
                </UiText>
                <UiText size={14} color={colors.inkMuted}>
                  {goalMinutes}
                </UiText>
              </View>
              <UiText size={15} weight="extrabold" color={colors.blueShadow}>
                {t('profile.goalChange')}
              </UiText>
            </Tile>
          )}
        </View>

        <View style={styles.section}>
          <UiText size={13} weight="extrabold" color={colors.inkMuted} style={styles.kicker}>
            {t('profile.account').toLocaleUpperCase('fr-FR')}
          </UiText>
          <UiText size={14} color={colors.inkMuted}>
            {c.backedUp ? t('profile.accountBody') : t('profile.accountBodyLocal')}
          </UiText>
          <View style={styles.rows}>
            {c.openPrivacy === null ? null : (
              <AccountRow icon="shield" label={t('profile.privacy')} onPress={c.openPrivacy} />
            )}
            <AccountRow
              icon="trash"
              label={t('profile.delete')}
              onPress={c.askDelete}
              danger
              divider={c.openPrivacy !== null}
              testID="profile-delete"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderSoft,
  },
  identity: { flex: 1, gap: 4 },
  reroll: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 18 },
  section: { gap: 10 },
  kicker: { letterSpacing: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
  },
  goal: {
    minHeight: 58,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 14,
    paddingHorizontal: 16,
  },
  goalText: { flex: 1 },
  rows: { borderRadius: 16, borderWidth: 2, borderColor: colors.border, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  divider: { borderTopWidth: 2, borderTopColor: colors.borderSoft },
  rowLabel: { flex: 1 },
});
