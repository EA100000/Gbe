import type { SoundsGuide } from '@gbe/content-schema';
import { FonText, Galet, Icon, RichText, Tile, UiText, colors } from '@gbe/ui';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Path } from 'react-native-svg';

import { useClipPlayer } from '../../core/audio/useClipPlayer';
import { useContent } from '../../core/content/contentStore';
import { t } from '../../core/i18n';

const CONTOURS: Record<SoundsGuide['tones'][number]['contour'], string> = {
  high: 'M8 6H48',
  low: 'M8 22H48',
  rising: 'M8 22L48 6',
  falling: 'M8 6L48 22',
};

function ToneCurve({ contour }: { contour: keyof typeof CONTOURS }) {
  return (
    <Svg width={52} height={28} viewBox="0 0 56 28">
      <Line
        x1={2}
        y1={6}
        x2={54}
        y2={6}
        stroke={colors.border}
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      <Line
        x1={2}
        y1={22}
        x2={54}
        y2={22}
        stroke={colors.border}
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      <Path d={CONTOURS[contour]} stroke={colors.red} strokeWidth={3.5} strokeLinecap="round" />
    </Svg>
  );
}

/** Écran 8 de la maquette : lettres propres au fon, voyelles nasales, tons. */
export function SoundsScreen() {
  const content = useContent();
  const { pack } = content;
  const playClip = useClipPlayer(content);
  const [playing, setPlaying] = useState<string | null>(null);
  const guide = pack.sounds;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <UiText size={13} weight="extrabold" color={colors.blue} style={styles.kicker}>
              {t('sounds.kicker').toLocaleUpperCase('fr-FR')}
            </UiText>
            <UiText size={30} weight="extrabold" accessibilityRole="header">
              {t('sounds.title')}
            </UiText>
            <UiText size={15} color={colors.inkMuted}>
              {t('sounds.intro')}
            </UiText>
          </View>
          <Galet pose="parle" size={96} flip />
        </View>

        {guide === undefined ? (
          <UiText size={15} color={colors.inkMuted}>
            {t('sounds.empty')}
          </UiText>
        ) : (
          <>
            <View style={styles.section}>
              <UiText size={17} weight="extrabold" accessibilityRole="header">
                {t('sounds.letters')}
              </UiText>
              <View style={styles.grid}>
                {guide.letters.map((card) => {
                  const on = playing === card.symbol;
                  return (
                    <View key={card.symbol} style={styles.cell}>
                      <Tile
                        state={on ? 'selected' : 'idle'}
                        onPress={() => {
                          setPlaying(on ? null : card.symbol);
                          playClip(card.audio);
                        }}
                        accessibilityLabel={t('sounds.listenCard', {
                          word: card.exampleFon,
                          meaning: card.exampleFr,
                        })}
                        accessibilityState={{ selected: on }}
                        style={styles.letterTile}
                        testID={`letter-${card.symbol}`}>
                        <View
                          style={[
                            styles.letterBox,
                            { backgroundColor: on ? colors.blue : colors.cream },
                          ]}>
                          <FonText size={26} color={on ? colors.white : colors.yellowText}>
                            {card.symbol}
                          </FonText>
                        </View>
                        <View style={styles.flex}>
                          <FonText size={18}>{card.exampleFon}</FonText>
                          <UiText size={13} color={colors.inkMuted}>
                            {card.exampleFr}
                          </UiText>
                        </View>
                      </Tile>
                    </View>
                  );
                })}
              </View>
              {guide.lettersTip !== undefined ? (
                <View style={styles.tip}>
                  <Icon name="info" size={22} color={colors.blueShadow} />
                  <RichText
                    segments={guide.lettersTip}
                    size={14}
                    color={colors.blueShadow}
                    style={styles.flex}
                  />
                </View>
              ) : null}
            </View>

            <View style={styles.section}>
              <UiText size={17} weight="extrabold" accessibilityRole="header">
                {t('sounds.nasals')}
              </UiText>
              <View style={styles.nasals}>
                {guide.nasals.map((nasal) => (
                  <Tile
                    key={nasal.symbol}
                    onPress={() => playClip(nasal.audio)}
                    accessibilityLabel={t('sounds.listenNasal', { symbol: nasal.symbol })}
                    radius={14}
                    style={styles.nasal}
                    testID={`nasal-${nasal.symbol}`}>
                    <FonText size={20}>{nasal.symbol}</FonText>
                  </Tile>
                ))}
              </View>
              <View style={styles.examples}>
                {guide.nasalExamples.map((example) => (
                  <UiText key={example.fon} size={14} color={colors.inkMuted}>
                    <FonText size={14}>{example.fon}</FonText>
                    {` · ${example.fr}`}
                  </UiText>
                ))}
              </View>
            </View>

            <View style={styles.tones}>
              <UiText size={17} weight="extrabold" accessibilityRole="header">
                {t('sounds.tones')}
              </UiText>
              <UiText size={15} color={colors.yellowDeep}>
                {t('sounds.tonesIntro')}
              </UiText>
              <View style={styles.toneRow}>
                {guide.tones.map((tone) => (
                  <View
                    key={tone.mark}
                    style={styles.tone}
                    accessible
                    accessibilityLabel={`${tone.mark} : ${tone.nameFr}`}>
                    <ToneCurve contour={tone.contour} />
                    <FonText size={28}>{tone.mark}</FonText>
                    <UiText size={13} color={colors.inkMuted}>
                      {tone.nameFr}
                    </UiText>
                  </View>
                ))}
              </View>
            </View>

            {guide.funFact !== undefined ? (
              <View style={styles.funFact}>
                <Icon name="funFact" size={36} />
                <View style={styles.flex}>
                  <UiText
                    size={13}
                    weight="extrabold"
                    color={colors.yellowText}
                    style={styles.kicker}>
                    {t('sounds.funFact').toLocaleUpperCase('fr-FR')}
                  </UiText>
                  <RichText segments={guide.funFact} size={15} />
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { paddingTop: 22, paddingHorizontal: 20, paddingBottom: 24, gap: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kicker: { letterSpacing: 1.3 },
  flex: { flex: 1, gap: 2 },
  section: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell: { width: '50%', padding: 6 },
  letterTile: {
    minHeight: 72,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 12,
    padding: 10,
  },
  letterBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.blueLight,
  },
  nasals: { flexDirection: 'row', gap: 8 },
  nasal: { flex: 1, minHeight: 52 },
  examples: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 6 },
  tones: {
    padding: 18,
    gap: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: colors.yellow,
    borderBottomColor: colors.yellowShadow,
    backgroundColor: colors.cream,
  },
  toneRow: { flexDirection: 'row', gap: 8 },
  tone: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  funFact: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.lockedShadow,
  },
});
