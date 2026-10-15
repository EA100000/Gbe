import { type CellValue, cellText, headerKey } from './text';

/**
 * Format du classeur des experts : une unité par fichier .xlsx.
 * Les mêmes définitions servent à écrire le modèle et à le relire, pour qu'ils ne divergent jamais.
 */
export const SHEETS = {
  guide: 'Mode d’emploi',
  unit: 'Unité',
  lessons: 'Leçons',
  words: 'Mots',
  sentences: 'Phrases',
  story: 'Histoire',
  question: 'Question',
  choices: 'Choix',
} as const;

export type SheetId = keyof typeof SHEETS;

/** Feuilles « champ / valeur » (une information par ligne). */
export const UNIT_FIELDS = {
  id: 'Identifiant de l’unité',
  pack: 'Identifiant du pack',
  order: 'Ordre dans le parcours',
  title: 'Titre',
  subtitle: 'Sous-titre',
  validated: 'Validé par les deux experts (oui / non)',
} as const;

export const QUESTION_FIELDS = {
  title: 'Titre de l’histoire',
  setting: 'Lieu',
  prompt: 'Question posée à l’apprenant',
  success: 'Message quand la réponse est juste',
} as const;

/** Feuilles en tableau : une ligne d'en-têtes, puis une ligne par élément. */
export const COLUMNS = {
  lessons: {
    ref: 'Leçon',
    type: 'Type (leçon / révision / histoire)',
    title: 'Titre',
    summary: 'Ce que l’apprenant sait faire à la fin',
  },
  words: {
    lesson: 'Leçon',
    ref: 'Réf',
    fr: 'Français',
    fon: 'Fon (avec les tons)',
    note: 'Précision (facultatif)',
    image: 'Image (oui / non)',
    remarks: 'Remarques (non importées)',
  },
  sentences: {
    lesson: 'Leçon',
    ref: 'Réf',
    fr: 'Français',
    fon: 'Fon (phrase complète, ponctuation comprise)',
    tiles: 'Tuiles (facultatif, séparées par /)',
    note: 'Précision après la réponse (facultatif)',
    remarks: 'Remarques (non importées)',
  },
  story: {
    order: 'Ordre',
    speaker: 'Qui parle (vendeuse / apprenant)',
    fr: 'Français',
    fon: 'Fon',
    audioOnly: 'Écoute seule (oui / non)',
    hint: 'Indice (facultatif)',
    remarks: 'Remarques (non importées)',
  },
  choices: {
    meaning: 'Sens en français',
    fon: 'Fon',
    correct: 'Bonne réponse (oui / non)',
    explanation: 'Explication (facultatif, mots fon entre [crochets])',
    remarks: 'Remarques (non importées)',
  },
} as const;

/** Classeur lu : nom de feuille → lignes de cellules. */
export type Workbook = Readonly<Record<string, readonly (readonly CellValue[])[]>>;

/** Lignes d'une feuille, retrouvée sans tenir compte de la casse ni des apostrophes. */
export function findSheet(
  workbook: Workbook,
  name: string,
): readonly (readonly CellValue[])[] | undefined {
  const wanted = headerKey(name);
  const found = Object.keys(workbook).find((sheet) => headerKey(sheet) === wanted);
  return found === undefined ? undefined : workbook[found];
}

export interface TableRow<K extends string> {
  /** Numéro de ligne tel qu'Excel l'affiche (1 = première ligne). */
  row: number;
  values: Record<K, string>;
}

export type TableResult<K extends string> =
  { ok: true; rows: TableRow<K>[] } | { ok: false; missingColumns: string[] };

/**
 * Lit une feuille en tableau. La première ligne non vide donne les en-têtes ;
 * les colonnes sont retrouvées par leur titre, dans n'importe quel ordre.
 * Les lignes vides (sur les colonnes connues) sont ignorées.
 */
export function readTable<K extends string>(
  rows: readonly (readonly CellValue[])[],
  columns: Readonly<Record<K, string>>,
  optional: readonly NoInfer<K>[] = [],
): TableResult<K> {
  const headerIndex = rows.findIndex((row) => row.some((cell) => cellText(cell) !== ''));
  const header = (rows[headerIndex] ?? []).map(headerKey);
  const keys = Object.keys(columns) as K[];
  const positions = new Map<K, number>();
  const missingColumns: string[] = [];
  for (const key of keys) {
    const index = header.indexOf(headerKey(columns[key]));
    if (index === -1) {
      if (!optional.includes(key)) missingColumns.push(columns[key]);
    } else {
      positions.set(key, index);
    }
  }
  if (missingColumns.length > 0) return { ok: false, missingColumns };

  const result: TableRow<K>[] = [];
  rows.forEach((row, index) => {
    if (index <= headerIndex) return;
    const values = {} as Record<K, string>;
    for (const key of keys) {
      const position = positions.get(key);
      values[key] = position === undefined ? '' : cellText(row[position]);
    }
    // Une ligne qui n'a que des remarques ne décrit rien à importer.
    if (keys.some((key) => key !== 'remarks' && values[key] !== '')) {
      result.push({ row: index + 1, values });
    }
  });
  return { ok: true, rows: result };
}

/** Lit une feuille « champ / valeur » : colonne A le libellé, colonne B la valeur. */
export function readFields<K extends string>(
  rows: readonly (readonly CellValue[])[],
  fields: Readonly<Record<K, string>>,
): { values: Record<K, string>; rowOf: Record<K, number | undefined> } {
  const values = {} as Record<K, string>;
  const rowOf = {} as Record<K, number | undefined>;
  for (const key of Object.keys(fields) as K[]) {
    const index = rows.findIndex((row) => headerKey(row[0]) === headerKey(fields[key]));
    values[key] = index === -1 ? '' : cellText(rows[index]?.[1]);
    rowOf[key] = index === -1 ? undefined : index + 1;
  }
  return { values, rowOf };
}
