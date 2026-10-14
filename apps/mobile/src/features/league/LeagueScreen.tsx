import { ChunkyButton, Galet, Icon, UiText, colors } from '@gbe/ui';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t, tPlural } from '../../core/i18n';
import { useLeagueController, type LeagueRow } from './useLeagueController';

/** Pastilles des 3 premières places (or, argent, bronze), comme la maquette. */
const MEDALS: Record<number, string> = { 1: colors.yellow, 2: '#DCD5CA', 3: '#E8B48A' };

function Row({ row }: { row: LeagueRow }) {
  const medal = MEDALS[row.rank];
  const ink = row.isMe ? colors.blueShadow : colors.ink;
  return (
    <View
      accessible
      accessibilityLabel={t('league.row', { rank: row.rank, name: row.name, n: row.xp })}
      style={[styles.row, row.isMe ? styles.rowMe : null]}
      testID={row.isMe ? 'league-me' : undefined}>
      {medal === undefined ? (
        <UiText
          size={16}
          weight="extrabold"
          color={row.isMe ? ink : colors.inkMuted}
          style={styles.rank}>
          {row.rank}
        </UiText>
      ) : (
        <View style={[styles.medal, { backgroundColor: medal }]}>
          <UiText size={14} weight="extrabold">
            {row.rank}
          </UiText>
        </View>
      )}
      {row.isMe ? (
        <Galet pose="avatar" size={44} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: row.colors.bg }]}>
          <UiText size={18} weight="extrabold" color={row.colors.fg}>
            {row.initial}
          </UiText>
        </View>
      )}
      <UiText size={16} weight={row.isMe ? 'extrabold' : 'bold'} color={ink} style={styles.name}>
        {row.name}
      </UiText>
      <UiText
        size={15}
        weight={row.isMe ? 'extrabold' : 'bold'}
        color={row.isMe ? ink : colors.inkMuted}>
        {t('league.xp', { n: row.xp })}
      </UiText>
    </View>
  );
}

function TopSeparator({ count }: { count: number }) {
  return (
    <View style={styles.zone} importantForAccessibility="no-hide-descendants">
      <View style={styles.zoneLine} />
      <Icon name="arrowUp" size={16} color={colors.blue} />
      <UiText size={13} weight="extrabold" color={colors.blue} style={styles.zoneLabel}>
        {t('league.top', { n: count }).toLocaleUpperCase('fr-FR')}
      </UiText>
      <View style={styles.zoneLine} />
    </View>
  );
}

/** Écran 9 de la maquette : Ligue de la semaine. */
export function LeagueScreen() {
  const { status, rows, topCount, daysLeft, retry } = useLeagueController();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Icon name="leagueShield" size={66} width={60} />
        <UiText size={26} weight="extrabold" accessibilityRole="header">
          {t('league.title')}
        </UiText>
        <UiText size={15} color={colors.inkMuted} style={styles.center}>
          {t('league.subtitle')}
        </UiText>
        {status === 'ready' ? (
          <View style={styles.pill}>
            <Icon name="clock" size={16} color={colors.yellowText} />
            <UiText size={14} weight="extrabold" color={colors.yellowText}>
              {tPlural(daysLeft, 'league.daysLeft.one', 'league.daysLeft.other')}
            </UiText>
          </View>
        ) : null}
      </View>

      {status === 'loading' ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.blue} accessibilityLabel={t('league.loading')} />
        </View>
      ) : status === 'offline' ? (
        <View style={styles.state}>
          <Galet pose="triste" size={120} />
          <UiText size={16} weight="bold" style={styles.center} testID="league-offline">
            {t('league.offline')}
          </UiText>
          <ChunkyButton
            label={t('common.retry')}
            onPress={retry}
            variant="blue"
            style={styles.retry}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {rows.map((row, i) => (
            <View key={row.key}>
              <Row row={row} />
              {i === topCount - 1 && rows.length > topCount ? (
                <TopSeparator count={topCount} />
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderSoft,
  },
  center: { textAlign: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.cream,
  },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  rowMe: {
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.blue,
    backgroundColor: colors.blueLight,
    paddingHorizontal: 10,
  },
  rank: { width: 30, textAlign: 'center' },
  medal: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { flex: 1 },
  zone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  zoneLine: { flex: 1, height: 2, backgroundColor: colors.blue },
  zoneLabel: { letterSpacing: 0.8 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  retry: { alignSelf: 'stretch' },
});
