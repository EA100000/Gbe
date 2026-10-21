import { programmeOverview, sectionOf, UNITS_PER_SECTION } from './programme';

const planned = (order: number) => ({
  id: `u${String(order).padStart(2, '0')}`,
  order,
  title: `Titre ${order}`,
  subtitle: `Sous-titre ${order}`,
});

describe('suite du programme', () => {
  it('range vingt unités par section', () => {
    expect(UNITS_PER_SECTION).toBe(20);
    expect([1, 20, 21, 40, 41].map(sectionOf)).toEqual([1, 1, 2, 2, 3]);
  });

  it('montre en préparation les unités prévues sans pack, dans l’ordre', () => {
    // Préparer
    const programme = [planned(3), planned(1), planned(2)];
    // Agir
    const overview = programmeOverview(programme, [{ id: 'u01', order: 1 }]);
    // Vérifier
    expect(overview.upcoming.map((u) => u.id)).toEqual(['u02', 'u03']);
    expect(overview).toMatchObject({ section: 1, ready: 1, total: 3 });
  });

  it('compte une unité disponible même absente du programme', () => {
    const overview = programmeOverview([planned(2)], [{ id: 'u01', order: 1 }]);

    expect(overview).toMatchObject({ ready: 1, total: 2 });
  });

  it('passe à la section suivante quand la première est entièrement prête', () => {
    const available = Array.from({ length: 20 }, (_, i) => ({
      id: planned(i + 1).id,
      order: i + 1,
    }));

    const overview = programmeOverview([planned(20), planned(21), planned(22)], available);

    expect(overview).toMatchObject({ section: 2, ready: 0, total: 2 });
  });

  it('n’annonce rien quand tout le programme est prêt', () => {
    const overview = programmeOverview([planned(1)], [{ id: 'u01', order: 1 }]);

    expect(overview).toEqual({ section: 1, ready: 1, total: 1, upcoming: [] });
  });

  it('reste à la section 1 sans aucune unité', () => {
    expect(programmeOverview([], [])).toEqual({ section: 1, ready: 0, total: 0, upcoming: [] });
  });
});
