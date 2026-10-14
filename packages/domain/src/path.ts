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

export function buildUnitPath(
  unit: PathUnit,
  completed: ReadonlySet<string>,
  options: { locked?: boolean } = {},
): PathNode[] {
  // Une unité verrouillée n'a aucune leçon « en cours » : tout attend la fin de la précédente.
  let currentFound = options.locked === true;
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
  const unitDone = isUnitDone(unit, completed);
  nodes.push({ kind: 'chest', id: chestIdFor(unit.id), open: unitDone });
  nodes.push({ kind: 'trophy', id: `${unit.id}-trophee`, open: unitDone });
  return nodes;
}

/** Toutes les leçons de l'unité sont terminées. */
export function isUnitDone(unit: PathUnit, completed: ReadonlySet<string>): boolean {
  return unit.lessons.every((l) => completed.has(l.id));
}

export interface CourseSection {
  unitId: string;
  /** Vrai tant que l'unité précédente n'est pas terminée. */
  locked: boolean;
  nodes: PathNode[];
}

/**
 * Chemin complet du cours : les unités à la suite, dans l'ordre reçu.
 * Une unité se débloque quand toutes les leçons de la précédente sont terminées
 * (règle provisoire, voir docs/adr/0010). Une leçon déjà terminée reste toujours rejouable.
 */
export function buildCoursePath(
  units: readonly PathUnit[],
  completed: ReadonlySet<string>,
): CourseSection[] {
  let previousDone = true;
  return units.map((unit) => {
    const locked = !previousDone;
    previousDone = isUnitDone(unit, completed);
    return { unitId: unit.id, locked, nodes: buildUnitPath(unit, completed, { locked }) };
  });
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
