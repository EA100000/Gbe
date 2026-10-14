import type { StoryLine } from '@gbe/content-schema';
import {
  ChunkyButton,
  FonText,
  Galet,
  Icon,
  Illustration,
  ProgressBar,
  RichText,
  Tile,
  UiText,
  Vendeuse,
  colors,
} from '@gbe/ui';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '../../components/IconButton';
import { t } from '../../core/i18n';
import { useStoryController } from './useStoryController';

function LineBubble({
  line,
  index,
  showTranslation,
  onListen,
}: {
  line: StoryLine;
  index: number;
  showTranslation: boolean;
  onListen: (index: number) => void;
}) {
  const vendor = line.speaker === 'vendor';

  if (line.audioOnly === true) {
    return (
      <View style={styles.vendorRow}>
        <Vendeuse pose="avatar" size={34} />
        <View style={[styles.bubble, styles.vendorBubble, styles.dashed]}>
          <View style={styles.audioOnly}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('story.listenVendor')}
              onPress={() => onListen(index)}
              style={styles.playButton}
              testID={`story-play-${index}`}>
              <Icon name="play" size={20} />
            </Pressable>
            <Icon name="waveform" size={28} width={132} color={colors.lockedIcon} />
          </View>
          {line.hintFr !== undefined ? (
            <UiText size={14} color={colors.inkMuted}>
              {line.hintFr}
            </UiText>
          ) : null}
        </View>
      </View>
    );
  }

  const text = line.fon ?? '';
  const bubble = (
    <View style={[styles.bubble, vendor ? styles.vendorBubble : styles.learnerBubble]}>
      <View style={styles.lineRow}>
        <FonText size={19} style={styles.flexShrink}>
          {text}
        </FonText>
        {line.audio !== undefined ? (
          <IconButton
            icon="speaker"
            size={20}
            label={t('story.listenLine', { text })}
            color={vendor ? colors.blue : colors.yellowText}
            onPress={() => onListen(index)}
            style={styles.lineSpeaker}
          />
        ) : null}
      </View>
      {showTranslation && line.fr !== undefined ? (
        <UiText size={14} color={colors.inkMuted}>
          {line.fr}
        </UiText>
      ) : null}
    </View>
  );

  return vendor ? (
    <View style={styles.vendorRow}>
      <Vendeuse pose="avatar" size={34} />
      {bubble}
    </View>
  ) : (
    <View style={styles.learnerRow}>{bubble}</View>
  );
}

/** Écran 7 de la maquette : dialogue au marché, puis choix de la bonne réplique. */
export function StoryScreen({ lessonId }: { lessonId: string }) {
  const { story, state, progress, toggleTranslation, listen, pick, finish, leave } =
    useStoryController(lessonId);
  if (story === undefined) return <SafeAreaView style={styles.screen} />;
  const correct = story.question.choices.find((c) => c.correct);
  const wrong = state.wrongChoice === null ? undefined : story.question.choices[state.wrongChoice];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <IconButton icon="close" label={t('story.quit')} onPress={leave} />
        <ProgressBar value={progress} accessibilityLabel={t('story.progress')} />
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={t('story.translate')}
          accessibilityState={{ checked: state.showTranslation }}
          onPress={toggleTranslation}
          style={[
            styles.frToggle,
            state.showTranslation
              ? { borderColor: colors.blue, backgroundColor: colors.blueLight }
              : { borderColor: colors.border, backgroundColor: colors.white },
          ]}
          testID="story-translate">
          <UiText
            size={14}
            weight="extrabold"
            color={state.showTranslation ? colors.blueShadow : colors.inkMuted}>
            FR
          </UiText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.scene}>
          <View style={styles.sceneArt}>
            <Illustration name="market" width={358} height={156} />
          </View>
          <View style={styles.sceneVendor}>
            <Vendeuse pose="parle" size={104} />
          </View>
          <View style={styles.sceneTitle}>
            <UiText size={11} weight="extrabold" color={colors.blue} style={styles.kicker}>
              {t('story.header', { setting: story.setting }).toLocaleUpperCase('fr-FR')}
            </UiText>
            <UiText size={16} weight="extrabold" accessibilityRole="header">
              {story.title}
            </UiText>
          </View>
        </View>

        <View style={styles.lines}>
          {story.lines.map((line, i) => (
            <LineBubble
              key={i}
              line={line}
              index={i}
              showTranslation={state.showTranslation}
              onListen={listen}
            />
          ))}
        </View>
      </ScrollView>

      {state.solved ? (
        <View style={[styles.panel, { backgroundColor: colors.blueLight }]} testID="story-solved">
          <View style={styles.panelRow}>
            <Galet pose="content" size={76} style={styles.panelMascot} />
            <View style={styles.flex}>
              <UiText size={21} weight="extrabold" color={colors.blueShadow}>
                {story.question.successFr}
              </UiText>
              {correct !== undefined ? (
                <RichText segments={correct.explanation} size={15} color={colors.blueShadow} />
              ) : null}
            </View>
          </View>
          <ChunkyButton label={t('common.continue')} onPress={finish} variant="blue" />
        </View>
      ) : (
        <View style={styles.question}>
          <UiText size={16} weight="extrabold">
            {story.question.promptFr}
          </UiText>
          {wrong !== undefined ? (
            <View accessibilityLiveRegion="polite">
              <RichText segments={wrong.explanation} size={14} color={colors.redText} />
            </View>
          ) : null}
          {story.question.choices.map((choice, i) => {
            const isWrong = state.wrongChoice === i;
            return (
              <Tile
                key={i}
                state={isWrong ? 'wrong' : 'idle'}
                onPress={() => pick(i)}
                accessibilityLabel={choice.fon}
                radius={14}
                style={styles.choice}
                testID={`story-choice-${i}`}>
                <FonText size={18} color={isWrong ? colors.redText : colors.ink}>
                  {choice.fon}
                </FonText>
              </Tile>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  frToggle: {
    minHeight: 44,
    minWidth: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingBottom: 16 },
  scene: {
    marginTop: 14,
    marginHorizontal: 16,
    height: 156,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.cream,
    borderWidth: 2,
    borderColor: colors.yellowLine,
  },
  sceneArt: { position: 'absolute', left: 0, top: 0 },
  sceneVendor: { position: 'absolute', left: 40, bottom: 6 },
  sceneTitle: {
    position: 'absolute',
    right: 10,
    top: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.white,
    maxWidth: 200,
  },
  kicker: { letterSpacing: 0.9 },
  lines: { paddingTop: 16, paddingHorizontal: 20, gap: 10 },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    alignSelf: 'flex-start',
    maxWidth: 320,
  },
  learnerRow: { alignSelf: 'flex-end', maxWidth: 290 },
  bubble: {
    borderWidth: 2,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 4,
    gap: 2,
    flexShrink: 1,
  },
  vendorBubble: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 4,
  },
  learnerBubble: {
    backgroundColor: colors.cream,
    borderColor: colors.yellow,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  dashed: {
    borderStyle: 'dashed',
    borderColor: colors.lockedShadow,
    paddingLeft: 8,
    paddingRight: 14,
    gap: 6,
  },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  lineSpeaker: { marginVertical: -10 },
  flexShrink: { flexShrink: 1 },
  audioOnly: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.yellow,
    borderBottomWidth: 3,
    borderBottomColor: colors.yellowShadow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  question: {
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderTopWidth: 2,
    borderTopColor: colors.borderSoft,
    gap: 8,
  },
  choice: { minHeight: 50, alignItems: 'flex-start', paddingHorizontal: 16 },
  panel: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 16, gap: 14 },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  panelMascot: { marginTop: -16, marginBottom: -6, marginLeft: -8 },
  flex: { flex: 1, gap: 2 },
});
