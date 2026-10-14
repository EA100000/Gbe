import { colors } from '@gbe/ui';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/** Bulle de dialogue avec sa pointe à gauche, tournée vers le Galet. */
export function SpeechBubble({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.bubble, style]}>
      <View style={styles.tail} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 5,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tail: {
    position: 'absolute',
    left: -9,
    bottom: 18,
    width: 14,
    height: 14,
    backgroundColor: colors.white,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
});
