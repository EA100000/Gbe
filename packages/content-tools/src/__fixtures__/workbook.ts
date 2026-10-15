import type { CellValue } from '../text';
import { buildTemplate, type UnitPlan, UnitPlanSchema } from '../template';
import { COLUMNS, SHEETS, type Workbook } from '../workbook';

/**
 * Bon de commande d'essai. Les textes « fon » des tests sont des syllabes inventées
 * (aucun mot fon réel ici, conformément aux règles du dépôt).
 */
export const PLAN: UnitPlan = UnitPlanSchema.parse({
  unit: { id: 'u09', pack: 'u09-essai', order: 9, title: 'Essai', subtitle: 'Une unité de test' },
  lessons: [
    { ref: 'l01', type: 'leçon', title: 'Les objets', summary: 'Tu nommes quatre objets.' },
    { ref: 'l02', type: 'leçon', title: 'Les nombres' },
    { ref: 'l03', type: 'leçon', title: 'Demander' },
    { ref: 'l04', type: 'révision', title: 'Révision de l’unité' },
    { ref: 'histoire', type: 'histoire', title: 'Au marché' },
  ],
  words: [
    { lesson: 'l01', ref: 'pomme', fr: 'pomme', image: true },
    { lesson: 'l01', ref: 'poire', fr: 'poire', image: true },
    { lesson: 'l01', ref: 'pain', fr: 'pain', image: true },
    { lesson: 'l01', ref: 'sel', fr: 'sel', image: false, note: 'au marché' },
    { lesson: 'l02', ref: 'n6', fr: 'six' },
    { lesson: 'l02', ref: 'n7', fr: 'sept' },
    { lesson: 'l02', ref: 'n8', fr: 'huit' },
    { lesson: 'l02', ref: 'n9', fr: 'neuf' },
    { lesson: 'l02', ref: 'n10', fr: 'dix' },
  ],
  sentences: [
    { lesson: 'l03', ref: 'combien', fr: 'Combien en veux-tu ?' },
    { lesson: 'l03', ref: 'deux', fr: 'J’en veux deux.', note: 'Pratique au marché.' },
    { lesson: 'l03', ref: 'cher', fr: 'C’est trop cher.' },
  ],
  story: {
    title: 'Acheter des poires',
    setting: 'Au marché',
    prompt: 'Que réponds-tu ?',
    success: 'Bien joué !',
    lines: [
      { speaker: 'vendeuse', fr: 'Bonjour !' },
      { speaker: 'apprenant', fr: 'Combien ça coûte ?' },
      { speaker: 'vendeuse', fr: 'Cent francs.', audioOnly: true, hint: 'Écoute le prix.' },
    ],
    choices: [
      { meaning: 'merci', correct: false },
      { meaning: 'c’est trop cher', correct: true },
    ],
  },
});

/** Fon inventé : une syllabe par mot, des phrases de trois syllabes et une ponctuation. */
export const FAKE_FON: Readonly<Record<string, string>> = {
  pomme: 'pa',
  poire: 'pe',
  pain: 'pi',
  sel: 'so',
  n6: 'ka',
  n7: 'ke',
  n8: 'ki',
  n9: 'ko',
  n10: 'ku',
  combien: 'Ta tè tò ?',
  deux: 'Ma wè mé.',
  cher: 'Da dé dò !',
};

export const FAKE_STORY_FON = ['Lo lé !', 'Ta tè tò ?', 'Sa sé sò.'];
export const FAKE_CHOICE_FON = ['Na nè', 'Da dé dò'];

/** Le modèle du bon de commande, tel que le relirait l'outil en ligne de commande. */
export function templateWorkbook(plan: UnitPlan = PLAN): Record<string, CellValue[][]> {
  const workbook: Record<string, CellValue[][]> = {};
  for (const sheet of buildTemplate(plan)) {
    workbook[sheet.name] = sheet.rows.map((row) => row.map((cell) => cell.value));
  }
  return workbook;
}

function setColumn(
  rows: CellValue[][],
  column: string,
  value: (row: CellValue[], index: number) => CellValue,
) {
  const position = (rows[0] ?? []).indexOf(column);
  rows.slice(1).forEach((row, index) => {
    row[position] = value(row, index);
  });
}

/** Le même classeur, comme rendu par les experts : tout le fon rempli. */
export function filledWorkbook(plan: UnitPlan = PLAN): Record<string, CellValue[][]> {
  const workbook = templateWorkbook(plan);
  const refOf = (row: CellValue[], sheet: CellValue[][]) =>
    String(row[(sheet[0] ?? []).indexOf(COLUMNS.words.ref)]);
  const words = workbook[SHEETS.words] ?? [];
  setColumn(words, COLUMNS.words.fon, (row) => FAKE_FON[refOf(row, words)] ?? '');
  const sentences = workbook[SHEETS.sentences] ?? [];
  setColumn(sentences, COLUMNS.sentences.fon, (row) => FAKE_FON[refOf(row, sentences)] ?? '');
  setColumn(workbook[SHEETS.story] ?? [], COLUMNS.story.fon, (_, i) => FAKE_STORY_FON[i] ?? '');
  setColumn(
    workbook[SHEETS.choices] ?? [],
    COLUMNS.choices.fon,
    (_, i) => FAKE_CHOICE_FON[i] ?? '',
  );
  return workbook;
}

/** Dessins des mots illustrés du bon de commande d'essai. */
export const DRAWINGS: ReadonlyMap<string, string> = new Map(
  ['pomme', 'poire', 'pain'].map((ref) => [
    ref,
    `<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>\n`,
  ]),
);

/** Remplace une cellule (ligne et colonne comptées depuis l'en-tête). */
export function setCell(
  workbook: Workbook,
  sheet: string,
  row: number,
  column: string,
  value: CellValue,
) {
  const rows = workbook[sheet] as CellValue[][];
  const position = (rows[0] ?? []).indexOf(column);
  const target = rows[row];
  if (target === undefined || position === -1)
    throw new Error(`Cellule introuvable : ${sheet} ${row} ${column}`);
  target[position] = value;
}
