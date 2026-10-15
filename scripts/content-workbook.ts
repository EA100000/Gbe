/**
 * Écrit le classeur d'une unité pour les experts (.xlsx), prérempli avec un bon de commande :
 * le plan en français, les cases du fon laissées en jaune.
 *
 * Usage :
 *   npm run content:workbook -- --commande content/sources/u02-nombres/commande.json
 *   npm run content:workbook -- --sortie nouvelle-unite.xlsx        (classeur vierge)
 * Par défaut, le classeur est écrit à côté du bon de commande, sous le nom du pack.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';

import {
  buildTemplate,
  type CellStyle,
  type TemplateCell,
  UnitPlanSchema,
} from '@gbe/content-tools';
import writeXlsxFile, { type CellObject, type Sheet } from 'write-excel-file/node';

const { values } = parseArgs({
  options: { commande: { type: 'string' }, sortie: { type: 'string' } },
});

const plan =
  values.commande === undefined
    ? undefined
    : UnitPlanSchema.parse(JSON.parse(readFileSync(values.commande, 'utf8')));
const output =
  values.sortie ??
  (values.commande !== undefined && plan !== undefined
    ? join(dirname(values.commande), `${plan.unit.pack}.xlsx`)
    : undefined);
if (output === undefined) {
  console.error('Indiquer --commande <bon de commande.json> ou --sortie <fichier.xlsx>.');
  process.exit(1);
}

/** Mise en forme de chaque rôle de cellule : en-têtes en gras, cases à remplir en jaune. */
const STYLES: Record<CellStyle, Omit<CellObject, 'value'>> = {
  title: { fontWeight: 'bold', fontSize: 14 },
  header: {
    fontWeight: 'bold',
    backgroundColor: '#DCE6F5',
    borderColor: '#9AAFD3',
    borderStyle: 'thin',
  },
  todo: { backgroundColor: '#FFF1B8', borderColor: '#E0C25A', borderStyle: 'thin' },
  given: { borderColor: '#D9D4CC', borderStyle: 'thin' },
  text: {},
};

const toCell = (cell: TemplateCell): CellObject => ({
  value: cell.value,
  type: String,
  wrap: true,
  alignVertical: 'top',
  ...(cell.style === undefined ? {} : STYLES[cell.style]),
});

const sheets: Sheet<never>[] = buildTemplate(plan).map((sheet, index) => ({
  sheet: sheet.name,
  data: sheet.rows.map((row) => row.map(toCell)),
  columns: sheet.widths.map((width) => ({ width })),
  // Le mode d'emploi n'a pas d'en-tête de tableau à figer.
  ...(index === 0 ? {} : { stickyRowsCount: 1 }),
}));

async function main(target: string): Promise<void> {
  mkdirSync(dirname(target), { recursive: true });
  await writeXlsxFile(sheets).toFile(target);
  console.log(`Classeur écrit : ${target}`);
}

main(output).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
