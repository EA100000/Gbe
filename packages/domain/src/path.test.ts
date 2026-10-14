import {
  buildCoursePath,
  buildUnitPath,
  chestIdFor,
  chestsToOpen,
  isLessonNode,
  isLessonPlayable,
  storyUnlockedBy,
  type PathUnit,
} from './path';

const unit: PathUnit = {
  id: 'u01',
  lessons: [
    { id: 'l1', kind: 'standard' },
    { id: 'l2', kind: 'standard' },
    { id: 'story', kind: 'story' },
  ],
};

const statuses = (completed: string[]) =>
  buildUnitPath(unit, new Set(completed)).map((n) => {
    if (isLessonNode(n)) return n.status;
    return n.open ? 'open' : 'closed';
  });

describe('buildUnitPath', () => {
  it('ouvre seulement la première leçon au départ', () => {
    expect(statuses([])).toEqual(['current', 'locked', 'locked', 'closed', 'closed']);
  });

  it('débloque la leçon suivante quand la précédente est terminée', () => {
    expect(statuses(['l1'])).toEqual(['done', 'current', 'locked', 'closed', 'closed']);
  });

  it('marque l’histoire comme telle dans le chemin', () => {
    const nodes = buildUnitPath(unit, new Set());
    expect(nodes.map((n) => n.kind)).toEqual(['lesson', 'lesson', 'story', 'chest', 'trophy']);
  });

  it('ouvre la calebasse et le trophée quand toute l’unité est terminée', () => {
    expect(statuses(['l1', 'l2', 'story'])).toEqual(['done', 'done', 'done', 'open', 'open']);
  });
});

describe('isLessonPlayable', () => {
  it('autorise une leçon terminée ou en cours, pas une leçon verrouillée', () => {
    const nodes = buildUnitPath(unit, new Set(['l1']));
    expect(isLessonPlayable(nodes, 'l1')).toBe(true);
    expect(isLessonPlayable(nodes, 'l2')).toBe(true);
    expect(isLessonPlayable(nodes, 'story')).toBe(false);
    expect(isLessonPlayable(nodes, 'inconnue')).toBe(false);
  });
});

describe('chestsToOpen', () => {
  it('ne propose rien tant que l’unité n’est pas terminée', () => {
    expect(chestsToOpen(buildUnitPath(unit, new Set(['l1'])), new Set())).toEqual([]);
  });

  it('propose la calebasse débloquée et pas encore ouverte', () => {
    const nodes = buildUnitPath(unit, new Set(['l1', 'l2', 'story']));
    expect(chestsToOpen(nodes, new Set())).toEqual([chestIdFor('u01')]);
  });

  it('ne propose pas une calebasse déjà ouverte', () => {
    const nodes = buildUnitPath(unit, new Set(['l1', 'l2', 'story']));
    expect(chestsToOpen(nodes, new Set([chestIdFor('u01')]))).toEqual([]);
  });
});

describe('storyUnlockedBy', () => {
  it('annonce l’histoire débloquée par la leçon qui la précède', () => {
    expect(storyUnlockedBy(unit, 'l2', new Set(['l1']))).toBe('story');
  });

  it('n’annonce rien si la leçon suivante n’est pas une histoire', () => {
    expect(storyUnlockedBy(unit, 'l1', new Set())).toBeNull();
  });

  it('n’annonce rien quand on refait une leçon déjà terminée', () => {
    expect(storyUnlockedBy(unit, 'l2', new Set(['l1', 'l2']))).toBeNull();
  });

  it('n’annonce rien pour la dernière leçon ou une leçon inconnue', () => {
    expect(storyUnlockedBy(unit, 'story', new Set(['l1', 'l2']))).toBeNull();
    expect(storyUnlockedBy(unit, 'inconnue', new Set())).toBeNull();
  });

  it('n’annonce rien si l’histoire est déjà terminée', () => {
    expect(storyUnlockedBy(unit, 'l2', new Set(['l1', 'story']))).toBeNull();
  });
});

describe('buildCoursePath', () => {
  const second: PathUnit = {
    id: 'u02',
    lessons: [
      { id: 'u2-l1', kind: 'standard' },
      { id: 'u2-l2', kind: 'standard' },
    ],
  };
  const lessonStatuses = (sectionNodes: ReturnType<typeof buildUnitPath>) =>
    sectionNodes.filter(isLessonNode).map((n) => n.status);

  it('garde l’unité suivante verrouillée tant que la première n’est pas finie', () => {
    // Préparer
    const completed = new Set(['l1', 'l2']);
    // Agir
    const [first, next] = buildCoursePath([unit, second], completed);
    // Vérifier
    expect(first?.locked).toBe(false);
    expect(next?.locked).toBe(true);
    expect(lessonStatuses(next?.nodes ?? [])).toEqual(['locked', 'locked']);
  });

  it('ouvre la première leçon de l’unité suivante quand la précédente est finie', () => {
    const [, next] = buildCoursePath([unit, second], new Set(['l1', 'l2', 'story']));
    expect(next?.locked).toBe(false);
    expect(lessonStatuses(next?.nodes ?? [])).toEqual(['current', 'locked']);
  });

  it('laisse rejouer une leçon terminée même si son unité est de nouveau verrouillée', () => {
    // Cas d'une nouvelle version de l'unité 1 qui ajoute une leçon après coup.
    const [, next] = buildCoursePath([unit, second], new Set(['l1', 'l2', 'u2-l1']));
    expect(next?.locked).toBe(true);
    expect(lessonStatuses(next?.nodes ?? [])).toEqual(['done', 'locked']);
  });
});
