import { Icon, UiText, type IconName } from '@gbe/ui';
import { StyleSheet, View } from 'react-native';

/** Compteur avec icône (série, cauris, vies). Lu comme un seul élément par les lecteurs d'écran. */
export function StatBadge({
  icon,
  value,
  color,
  label,
  testID,
}: {
  icon: IconName;
  value: number;
  color: string;
  label: string;
  testID?: string;
}) {
  return (
    <View accessible accessibilityLabel={label} style={styles.badge} testID={testID}>
      <Icon name={icon} size={24} />
      <UiText size={17} weight="extrabold" color={color}>
        {value}
      </UiText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 8,
  },
});
