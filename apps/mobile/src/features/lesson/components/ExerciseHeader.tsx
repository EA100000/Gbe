import type { ExerciseTag } from '@gbe/content-schema';
import { Icon, UiText, colors } from '@gbe/ui';
import { StyleSheet, View } from 'react-native';

const ICON = { new: 'sparkle', review: 'refresh', listen: 'headphones' } as const;

/** Étiquette (« Nouveau mot », « Révision · les nombres », « Écoute ») et consigne de l'exercice. */
export function ExerciseHeader({
  tag,
  prompt,
}: {
  tag?: ExerciseTag | { kind: 'listen'; labelFr: string } | undefined;
  prompt: string;
}) {
  const tone = tag?.kind === 'review' ? colors.redDark : colors.blue;
  return (
    <View style={styles.header}>
      {tag !== undefined ? (
        <View style={styles.tag}>
          <Icon name={ICON[tag.kind]} size={18} color={tone} />
          <UiText size={13} weight="extrabold" color={tone} style={styles.tagText}>
            {tag.labelFr.toLocaleUpperCase('fr-FR')}
          </UiText>
        </View>
      ) : null}
      <UiText size={26} weight="extrabold" accessibilityRole="header">
        {prompt}
      </UiText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagText: { letterSpacing: 1.3 },
});
