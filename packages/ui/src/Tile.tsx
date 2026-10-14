import type { ReactNode } from 'react';
import { Pressable, type AccessibilityState, type StyleProp, type ViewStyle } from 'react-native';

import { colors, MIN_TOUCH, radii } from './tokens';

/**
 * États visuels des cases (images, mots, paires).
 * La couleur n'est jamais le seul signal : l'appli annonce aussi l'état
 * (libellé d'accessibilité, texte du panneau de correction).
 */
export type TileState = 'idle' | 'selected' | 'wrong' | 'done';

const LOOKS: Record<TileState, { border: string; bg: string; fg: string }> = {
  idle: { border: colors.border, bg: colors.white, fg: colors.ink },
  selected: { border: colors.blue, bg: colors.blueLight, fg: colors.blueShadow },
  wrong: { border: colors.red, bg: colors.redLight, fg: colors.redText },
  done: { border: colors.borderSoft, bg: colors.surfaceMuted, fg: colors.inkSoft },
};

export function tileForeground(state: TileState): string {
  return LOOKS[state].fg;
}

export interface TileProps {
  state?: TileState;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  testID?: string;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Case à bordure et ombre basse, comme les cartes de la maquette. */
export function Tile({
  state = 'idle',
  onPress,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  testID,
  radius = radii.lg,
  style,
  children,
}: TileProps) {
  const look = LOOKS[state];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled === true, ...accessibilityState }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH,
          borderRadius: radius,
          borderWidth: 2,
          borderBottomWidth: pressed ? 2 : 5,
          marginTop: pressed ? 3 : 0,
          borderColor: look.border,
          backgroundColor: look.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      {children}
    </Pressable>
  );
}
