import { StyleSheet, View } from 'react-native';

import { colors } from './tokens';

export interface ProgressBarProps {
  /** Avancement entre 0 et 1. */
  value: number;
  accessibilityLabel: string;
}

/** Barre de progression de la leçon (jaune sur fond clair, avec reflet). */
export function ProgressBar({ value, accessibilityLabel }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={styles.track}>
      {clamped > 0 ? (
        <View style={[styles.fill, { width: `${clamped * 100}%` }]}>
          <View style={styles.shine} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.borderSoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    minWidth: 16,
    borderRadius: 8,
    backgroundColor: colors.yellow,
    paddingTop: 4,
    paddingHorizontal: 8,
  },
  shine: { height: 4, borderRadius: 2, backgroundColor: colors.yellowHighlight },
});
