/**
 * Chemin d'une unité (écran 2 de la maquette) : leçons, histoire, calebasse, trophée.
 * Les leçons se débloquent dans l'ordre ; une leçon terminée peut être refaite.
 */
export type LessonNodeStatus = 'done' | 'current' | 'locked';

export interface PathLessonNode {
  kind: 'lesson' | 'story';
  lessonId: string;
  /** Position dans l'unité, à partir de 0. */
  index: number;
  status: LessonNodeStatus;
}

export interface PathMilestoneNode {
  kind: 'chest' | 'trophy';
  id: string;
  open: boolean;
}

export type PathNode = PathLessonNode | PathMilestoneNode;

export function isLessonNode(node: PathNode): node is PathLessonNode {
  return node.kind === 'lesson' || node.kind === 'story';
}

export interface PathUnit {
  id: string;
  lessons: readonly { id: string; kind: 'standard' | 'story' }[];
}

/** Récompense de la calebasse, en cauris. Valeur provisoire (voir ADR 0003). */
export const CHEST_CAURIS = 20;

export const chestIdFor = (unitId: string): string => `${unitId}-calebasse`;

export function buildUnitPath(unit: PathUnit, completed: ReadonlySet<string>): PathNode[] {
  let currentFound = false;
  const nodes: PathNode[] = unit.lessons.map((lesson, index) => {
    let status: LessonNodeStatus = 'locked';
    if (completed.has(lesson.id)) status = 'done';
    else if (!currentFound) {
      status = 'current';
      currentFound = true;
    }
    return {
      kind: lesson.kind === 'story' ? 'story' : 'lesson',
      lessonId: lesson.id,
      index,
      status,
    };
  });
  const unitDone = unit.lessons.every((l) => completed.has(l.id));
  nodes.push({ kind: 'chest', id: chestIdFor(unit.id), open: unitDone });
  nodes.push({ kind: 'trophy', id: `${unit.id}-trophee`, open: unitDone });
  return nodes;
}

export function isLessonPlayable(nodes: readonly PathNode[], lessonId: string): boolean {
  return nodes.some((n) => isLessonNode(n) && n.lessonId === lessonId && n.status !== 'locked');
}

/** Calebasses débloquées mais pas encore ouvertes : l'appli les ouvre et crédite les cauris. */
export function chestsToOpen(
  nodes: readonly PathNode[],
  openedChests: ReadonlySet<string>,
): string[] {
  return nodes
    .filter((n): n is PathMilestoneNode => !isLessonNode(n) && n.kind === 'chest')
    .filter((n) => n.open && !openedChests.has(n.id))
    .map((n) => n.id);
}

/**
 * Histoire débloquée par la leçon qui vient d'être terminée
 * (carte « Histoire débloquée » de l'écran de fin), ou `null`.
 */
export function storyUnlockedBy(
  unit: PathUnit,
  completedLessonId: string,
  completedBefore: ReadonlySet<string>,
): string | null {
  const index = unit.lessons.findIndex((l) => l.id === completedLessonId);
  const following = unit.lessons[index + 1];
  if (index < 0 || following === undefined || following.kind !== 'story') return null;
  if (completedBefore.has(following.id) || completedBefore.has(completedLessonId)) return null;
  return following.id;
}
