import { ChunkyButton, Galet, RichText, colors, fonts, type RichSegment } from '@gbe/ui';
import { StyleSheet, View } from 'react-native';

export interface FeedbackPanelProps {
  tone: 'correct' | 'wrong';
  title: readonly RichSegment[];
  body: readonly RichSegment[] | null;
  buttonLabel: string;
  onPress: () => void;
}

/**
 * Panneau de correction en bas d'écran. Juste : fond bleu, Galet content.
 * Faux : fond rouge, Galet triste. Le texte dit toujours le résultat (pas la couleur seule).
 */
export function FeedbackPanel({ tone, title, body, buttonLabel, onPress }: FeedbackPanelProps) {
  const correct = tone === 'correct';
  const textColor = correct ? colors.blueShadow : colors.redText;
  return (
    <View
      style={[styles.panel, { backgroundColor: correct ? colors.blueLight : colors.redLight }]}
      accessibilityLiveRegion="polite"
      testID={`feedback-${tone}`}>
      <View style={styles.row}>
        <Galet pose={correct ? 'content' : 'triste'} size={76} style={styles.mascot} />
        <View style={styles.texts}>
          <RichText segments={title} size={21} color={textColor} style={styles.title} />
          {body !== null ? <RichText segments={body} size={15} color={textColor} /> : null}
        </View>
      </View>
      <ChunkyButton
        label={buttonLabel}
        onPress={onPress}
        variant={correct ? 'blue' : 'danger'}
        testID="feedback-button"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 16, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mascot: { marginTop: -16, marginBottom: -6, marginLeft: -8 },
  texts: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.ui.extrabold },
});
