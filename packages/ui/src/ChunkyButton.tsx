import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { UiText } from './Typography';
import { colors, radii } from './tokens';

export type ChunkyVariant = 'primary' | 'blue' | 'danger';

const VARIANTS: Record<ChunkyVariant, { bg: string; shadow: string; fg: string }> = {
  primary: { bg: colors.yellow, shadow: colors.yellowShadow, fg: colors.ink },
  blue: { bg: colors.blue, shadow: colors.blueShadow, fg: colors.white },
  danger: { bg: colors.redDark, shadow: colors.redShadow, fg: colors.white },
};

const SHADOW = 4;

export interface ChunkyButtonProps {
  label: string;
  onPress: () => void;
  variant?: ChunkyVariant;
  disabled?: boolean;
  /** Reflet clair en haut du bouton, comme sur l'écran d'accueil. */
  highlight?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** Bouton principal « en relief » de la maquette (Vérifier, Continuer, Réessayer…). */
export function ChunkyButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  highlight = false,
  testID,
  style,
}: ChunkyButtonProps) {
  const look = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        disabled
          ? { backgroundColor: colors.border, marginTop: SHADOW }
          : {
              backgroundColor: look.bg,
              borderBottomColor: look.shadow,
              borderBottomWidth: pressed ? 0 : SHADOW,
              marginTop: pressed ? SHADOW : 0,
            },
        style,
      ]}>
      {highlight && !disabled ? <View style={styles.highlight} /> : null}
      <UiText size={17} weight="extrabold" color={disabled ? colors.inkSoft : look.fg}>
        {label}
      </UiText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 6,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.yellowHighlight,
  },
});
