import { buildTemplate, GRAMMAR_FIELD, GUIDE, UnitPlanSchema } from './template';
import { findSheet, readFields, readTable, SHEETS } from './workbook';

describe('lecture des feuilles', () => {
  it('retrouve les colonnes par leur titre, dans n’importe quel ordre', () => {
    const rows = [[], ['Français', 'Réf', 'Autre'], ['eau', 'sin', 'x']];

    const result = readTable(rows, { ref: 'Réf', fr: 'Français' });

    expect(result).toEqual({ ok: true, rows: [{ row: 3, values: { ref: 'sin', fr: 'eau' } }] });
  });

  it('ignore les lignes vides et celles qui n’ont que des remarques', () => {
    const rows = [
      ['Réf', 'Remarques'],
      ['', 'à revoir'],
      [null, null],
      ['sin', ''],
    ];

    const result = readTable(rows, { ref: 'Réf', remarks: 'Remarques' });

    expect(result.ok && result.rows.map((r) => r.row)).toEqual([4]);
  });

  it('liste les colonnes obligatoires absentes, pas les facultatives', () => {
    const result = readTable([['Réf']], { ref: 'Réf', fr: 'Français', note: 'Note' }, ['note']);

    expect(result).toEqual({ ok: false, missingColumns: ['Français'] });
  });

  it('lit une feuille champ / valeur et la ligne de chaque champ', () => {
    const rows = [
      ['Champ', 'Valeur'],
      ['Titre', ' Nombres '],
    ];

    expect(readFields(rows, { title: 'Titre', order: 'Ordre' })).toEqual({
      values: { title: 'Nombres', order: '' },
      rowOf: { title: 2, order: undefined },
    });
  });

  it('retrouve une feuille sans tenir compte de la casse', () => {
    expect(findSheet({ unité: [['x']] }, SHEETS.unit)).toEqual([['x']]);
    expect(findSheet({}, SHEETS.unit)).toBeUndefined();
  });
});

describe('modèle de classeur', () => {
  it('produit les huit feuilles, le mode d’emploi en premier', () => {
    const sheets = buildTemplate();

    expect(sheets.map((sheet) => sheet.name)).toEqual(Object.values(SHEETS));
    expect(sheets[0]?.rows).toHaveLength(GUIDE.length + 1);
    for (const sheet of sheets) {
      for (const row of sheet.rows) expect(row.length).toBeLessThanOrEqual(sheet.widths.length);
    }
  });

  it('laisse le fon à remplir en jaune et refuse un bon de commande mal formé', () => {
    const plan = UnitPlanSchema.parse({
      unit: { id: 'u05', pack: 'u05-x', order: 5, title: 'X', subtitle: 'Y' },
      lessons: [{ ref: 'l01', type: 'leçon', title: 'Z' }],
      words: [{ lesson: 'l01', ref: 'mot', fr: 'mot' }],
    });

    const words = buildTemplate(plan).find((sheet) => sheet.name === SHEETS.words);

    expect(words?.rows[1]?.[3]).toEqual({ value: '', style: 'todo' });
    expect(words?.rows[1]?.[5]).toEqual({ value: 'non', style: 'given' });
    expect(UnitPlanSchema.safeParse({ ...plan, inconnu: 1 }).success).toBe(false);
  });

  it('montre aux experts la notion de grammaire visée, sans l’importer', () => {
    const plan = UnitPlanSchema.parse({
      unit: {
        id: 'u05',
        pack: 'u05-x',
        order: 5,
        title: 'X',
        subtitle: 'Y',
        grammar: 'le pluriel',
      },
      lessons: [{ ref: 'l01', type: 'leçon', title: 'Z' }],
    });

    const unit = buildTemplate(plan).find((sheet) => sheet.name === SHEETS.unit);

    expect(unit?.rows.at(-1)?.map((cell) => cell.value)).toEqual([GRAMMAR_FIELD, 'le pluriel']);
  });
});
