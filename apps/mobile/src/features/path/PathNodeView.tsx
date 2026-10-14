import { isLessonNode, type PathLessonNode, type PathNode } from '@gbe/domain';
import { Icon, Illustration, UiText, colors } from '@gbe/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '../../core/i18n';

/** Décalages horizontaux du chemin en zigzag, repris de la maquette. */
const OFFSETS = [0, -56, -76, -56, 0, 56, 76, 56];
export const offsetAt = (index: number): number => OFFSETS[index % OFFSETS.length] ?? 0;

function lessonLabel(node: PathLessonNode, lessonNumber: number): string {
  if (node.kind === 'story') return t(`path.story.${node.status}`);
  return t(`path.lesson.${node.status}`, { n: lessonNumber });
}

/** Un rond du chemin : leçon, histoire, calebasse ou trophée. */
export function PathNodeView({
  node,
  position,
  lessonNumber,
  onPress,
}: {
  node: PathNode;
  position: number;
  lessonNumber: number;
  onPress: () => void;
}) {
  const translateX = offsetAt(position);

  if (!isLessonNode(node)) {
    if (node.kind === 'trophy') {
      return (
        <View
          accessible
          accessibilityLabel={t(node.open ? 'path.trophy.open' : 'path.trophy.locked')}
          style={[
            styles.node,
            node.open ? styles.active : styles.locked,
            { transform: [{ translateX }] },
          ]}>
          <Icon name="trophy" size={30} color={node.open ? colors.ink : colors.lockedStroke} />
        </View>
      );
    }
    return (
      <View
        accessible
        accessibilityLabel={t(node.open ? 'path.chest.open' : 'path.chest.locked')}
        style={{ transform: [{ translateX }] }}>
        <Illustration
          name={node.open ? 'calebasseOpen' : 'calebasseLocked'}
          width={84}
          height={84}
        />
      </View>
    );
  }

  const label = lessonLabel(node, lessonNumber);
  const isStory = node.kind === 'story';
  const iconColor = node.status === 'locked' ? colors.lockedIcon : colors.ink;
  const icon = isStory ? 'book' : node.status === 'done' ? 'check' : 'star';

  const circle = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: node.status === 'locked' }}
      disabled={node.status === 'locked'}
      onPress={onPress}
      testID={`path-node-${node.lessonId}`}
      style={({ pressed }) => [
        styles.node,
        node.status === 'locked' ? styles.locked : styles.active,
        pressed && node.status !== 'locked' ? styles.pressed : null,
      ]}>
      {node.status !== 'locked' ? <View style={styles.shine} /> : null}
      <Icon
        name={icon}
        size={isStory ? 28 : 32}
        color={isStory && node.status === 'locked' ? colors.lockedStroke : iconColor}
      />
    </Pressable>
  );

  if (node.status !== 'current') {
    return <View style={{ transform: [{ translateX }] }}>{circle}</View>;
  }

  return (
    <View style={[styles.current, { transform: [{ translateX }] }]}>
      <View style={styles.startBubble} importantForAccessibility="no-hide-descendants">
        <UiText size={15} weight="extrabold" color={colors.yellowText}>
          {t('path.start')}
        </UiText>
        <View style={styles.startTail} />
      </View>
      <View style={styles.ring}>{circle}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  node: {
    width: 72,
    height: 66,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
    overflow: 'hidden',
  },
  active: { backgroundColor: colors.yellow, borderBottomColor: colors.yellowShadow },
  locked: { backgroundColor: colors.locked, borderBottomColor: colors.lockedShadow },
  pressed: { borderBottomWidth: 2, marginTop: 4 },
  shine: {
    position: 'absolute',
    left: 14,
    top: 9,
    width: 22,
    height: 8,
    borderRadius: 6,
    backgroundColor: colors.yellowHighlight,
    transform: [{ rotate: '-20deg' }],
  },
  current: { alignItems: 'center', gap: 10 },
  startBubble: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
  },
  startTail: {
    position: 'absolute',
    left: '50%',
    bottom: -8,
    width: 12,
    height: 12,
    marginLeft: -6,
    backgroundColor: colors.white,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
  ring: {
    padding: 6,
    borderRadius: 50,
    borderWidth: 5,
    borderColor: colors.borderSoft,
    borderTopColor: colors.yellow,
    borderRightColor: colors.yellow,
  },
});
