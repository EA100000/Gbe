import { isLessonNode, type PathLessonNode } from '@gbe/domain';
import { Galet, Icon, Illustration, UiText, colors } from '@gbe/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '../../core/i18n';
import { PathNodeView } from './PathNodeView';
import type { UnitSection } from './usePathController';

/**
 * Une unité du chemin : sa bannière puis ses leçons (écran 2 de la maquette).
 * Unité verrouillée : bannière grisée, en attendant la fin de l'unité précédente.
 */
export function UnitSectionView({
  section,
  onOpen,
  onOpenGuide,
}: {
  section: UnitSection;
  onOpen: (node: PathLessonNode) => void;
  onOpenGuide: () => void;
}) {
  const { unit, nodes, locked } = section;
  // Numéro affiché de chaque leçon (les histoires et récompenses ne comptent pas).
  const lessonNumbers = nodes.map(
    (_, i) => nodes.slice(0, i + 1).filter((n) => isLessonNode(n) && n.kind === 'lesson').length,
  );
  // Contraste ≥ 4,5:1 sur le fond grisé d'une unité verrouillée.
  const ink = locked ? colors.inkMuted : colors.ink;

  return (
    <View testID={`unit-${unit.id}`}>
      <View
        style={[styles.banner, locked ? styles.bannerLocked : null]}
        accessible={locked}
        accessibilityLabel={
          locked
            ? t('path.unitLocked', {
                n: unit.order,
                title: unit.title,
                previous: section.previousOrder ?? unit.order - 1,
              })
            : undefined
        }>
        <View style={styles.bannerArt}>
          <Illustration name="bannerDots" width={160} height={110} />
        </View>
        <View style={styles.bannerDash} />
        <View style={styles.bannerText}>
          <UiText
            size={13}
            weight="extrabold"
            color={locked ? colors.inkMuted : colors.yellowDeep}
            style={styles.kicker}>
            {t('path.unit', { n: unit.order, title: unit.title }).toLocaleUpperCase('fr-FR')}
          </UiText>
          <UiText size={19} weight="extrabold" color={ink} accessibilityRole="header">
            {unit.subtitle}
          </UiText>
        </View>
        {section.hasGuide && !locked ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('path.unitGuide')}
            onPress={onOpenGuide}
            style={styles.guide}>
            <Icon name="book" size={24} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.path}>
        <View style={styles.decoGalet}>
          <Galet pose="parle" size={112} flip />
        </View>
        <View style={styles.decoHut}>
          <Illustration name="hut" width={84} height={84} />
        </View>
        <View style={styles.decoPalm}>
          <Illustration name="palm" width={86} height={104} />
        </View>
        {nodes.map((node, position) => {
          const key = isLessonNode(node) ? node.lessonId : node.id;
          return (
            <PathNodeView
              key={key}
              node={node}
              position={position}
              lessonNumber={lessonNumbers[position] ?? 0}
              onPress={() => {
                if (isLessonNode(node)) onOpen(node);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    paddingLeft: 18,
    borderRadius: 16,
    backgroundColor: colors.yellow,
    borderBottomWidth: 4,
    borderBottomColor: colors.yellowShadow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  bannerArt: { position: 'absolute', right: 0, top: 0 },
  bannerDash: {
    position: 'absolute',
    left: 5,
    right: 5,
    top: 5,
    bottom: 5,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.yellowShadow,
    borderRadius: 12,
  },
  bannerText: { flex: 1, gap: 4 },
  kicker: { letterSpacing: 1 },
  guide: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.yellowShadow,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  path: { paddingTop: 28, alignItems: 'center', gap: 22, minHeight: 640 },
  decoGalet: { position: 'absolute', right: 20, top: 158 },
  decoHut: { position: 'absolute', right: 22, top: 318 },
  decoPalm: { position: 'absolute', left: 14, top: 372 },
  bannerLocked: { backgroundColor: colors.locked, borderBottomColor: colors.lockedShadow },
});
