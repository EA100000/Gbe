import { ChunkyButton, FonText, Icon, UiText, colors } from '@gbe/ui';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t, tPlural } from '../../core/i18n';
import { useReviewController, type WeakWord } from './useReviewController';

function MasteryBars({ mastery }: { mastery: number }) {
  return (
    <View
      accessible
      accessibilityLabel={t('review.weak.mastery', { n: mastery })}
      style={styles.bars}>
      {[1, 2, 3, 4].map((level) => (
        <View
          key={level}
          style={[
            styles.bar,
            { backgroundColor: level <= mastery ? colors.yellow : colors.border },
          ]}
        />
      ))}
    </View>
  );
}

function WeakRow({ word, onListen }: { word: WeakWord; onListen: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('review.weak.listen', { word: word.fon })}
        onPress={onListen}
        style={styles.listen}
        testID={`weak-listen-${word.key}`}>
        <Icon name="speaker" size={20} color={colors.blue} />
      </Pressable>
      <View style={styles.rowText}>
        <FonText size={18}>{word.fon}</FonText>
        <UiText size={14} color={colors.inkMuted}>
          {word.fr}
        </UiText>
      </View>
      <MasteryBars mastery={word.mastery} />
    </View>
  );
}

/** Écran 24 (proposition validée) : l'onglet Réviser. */
export function ReviewScreen() {
  const c = useReviewController();
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <UiText size={26} weight="extrabold" accessibilityRole="header">
            {t('review.title')}
          </UiText>
          <UiText size={15} color={colors.inkMuted}>
            {c.hasHistory ? t('review.intro') : t('review.empty')}
          </UiText>
        </View>

        <View style={styles.card} testID="review-mistakes">
          <View style={styles.cardHead}>
            <View style={[styles.cardIcon, { backgroundColor: colors.redLight }]}>
              <Icon name="mistakes" size={26} />
            </View>
            <View style={styles.flex}>
              <UiText size={19} weight="extrabold" accessibilityRole="header">
                {t('review.mistakes.title')}
              </UiText>
              <UiText size={15} color={colors.inkMuted}>
                {c.mistakeCount === 0
                  ? t('review.mistakes.none')
                  : tPlural(
                      c.mistakeCount,
                      'review.mistakes.count.one',
                      'review.mistakes.count.other',
                    )}
              </UiText>
            </View>
          </View>
          {c.mistakeWords.length > 0 ? (
            <View style={styles.chips}>
              {c.mistakeWords.map((fon) => (
                <View key={fon} style={styles.chip}>
                  <FonText size={16}>{fon}</FonText>
                </View>
              ))}
              {c.moreMistakes > 0 ? (
                <View style={styles.chip}>
                  <UiText size={15} weight="bold" color={colors.inkMuted}>
                    {t('review.mistakes.more', { n: c.moreMistakes })}
                  </UiText>
                </View>
              ) : null}
            </View>
          ) : null}
          <ChunkyButton
            label={c.canStart ? t('review.start', { n: c.minutes }) : t('review.startEmpty')}
            onPress={c.start}
            disabled={!c.canStart}
            testID="review-start"
          />
        </View>

        <View style={[styles.card, styles.listenCard]} testID="review-listen">
          <View style={[styles.cardIcon, { backgroundColor: colors.blueLight }]}>
            <Icon name="headphones" size={26} color={colors.blue} />
          </View>
          <View style={styles.flex}>
            <UiText size={19} weight="extrabold" accessibilityRole="header">
              {t('listen.title')}
            </UiText>
            <UiText size={15} color={colors.inkMuted}>
              {t('listen.cardBody')}
            </UiText>
          </View>
          <ChunkyButton
            label={t('listen.go')}
            onPress={c.startListening}
            disabled={!c.canListen}
            variant="blue"
            testID="listen-start"
          />
        </View>

        {c.weak.length > 0 ? (
          <View style={styles.weak}>
            <UiText size={17} weight="extrabold" accessibilityRole="header">
              {t('review.weak.title')}
            </UiText>
            {c.weak.map((word) => (
              <WeakRow key={word.key} word={word} onListen={() => c.listen(word.audio)} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { padding: 16, paddingTop: 20, gap: 14 },
  intro: { gap: 4 },
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listenCard: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
  },
  weak: { gap: 4, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderSoft,
  },
  listen: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  bars: { flexDirection: 'row', gap: 3 },
  bar: { width: 8, height: 18, borderRadius: 3 },
});
