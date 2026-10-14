import { Icon, MIN_TOUCH, colors, type IconName } from '@gbe/ui';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

export interface IconButtonProps {
  icon: IconName;
  /** Obligatoire : un bouton icône a toujours un libellé pour les lecteurs d'écran. */
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  label,
  onPress,
  color = colors.inkSoft,
  size = 26,
  testID,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      hitSlop={4}
      style={({ pressed }) => [
        {
          width: MIN_TOUCH,
          height: MIN_TOUCH,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}>
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}
