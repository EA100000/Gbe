/**
 * Importe le classeur rempli par les experts et écrit le pack de l'unité.
 *
 * Usage : npm run content:import -- content/sources/u02-nombres/u02-nombres.xlsx
 *
 * - Les dessins des mots illustrés sont lus dans `illustrations/<réf>.svg`, à côté du classeur.
 * - La version du pack augmente seulement si son contenu change (une version publiée ne change jamais).
 * - La liste des enregistrements à faire est écrite dans `enregistrements.csv`, à côté du classeur.
 * Ensuite : npm run audio:placeholders, npm run content:build, npm run content:validate.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { importUnit, type Recording } from '@gbe/content-tools';
import { validatePack } from '@gbe/content-schema';
import { format, resolveConfig } from 'prettier';
import readXlsxFile from 'read-excel-file/node';

import { PACKS_DIR, ROOT, readJson } from './lib/packs';

/** Marque d'ordre des octets : Excel lit alors le CSV en UTF-8 et affiche les tons. */
const UTF8_BOM = '﻿';

/** Durée réelle d'un fichier audio (ffprobe), si l'outil est installé. */
function measureMs(file: string): number | undefined {
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
      { encoding: 'utf8' },
    );
    const seconds = Number.parseFloat(out);
    return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : undefined;
  } catch {
    return undefined;
  }
}

/** Liste des enregistrements, lisible dans Excel (séparateur « ; » des réglages français). */
function recordingsCsv(recordings: readonly Recording[]): string {
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = [
    ['Fichier', 'Voix', 'Vitesse', 'Fon', 'Français'],
    ...recordings.map((r) => [
      r.file.replace('audio/', ''),
      r.voice,
      r.speed === 'slow' ? 'lente' : 'normale',
      r.fon,
      r.fr,
    ]),
  ];
  return `${UTF8_BOM}${rows.map((row) => row.map(cell).join(';')).join('\r\n')}\r\n`;
}

async function main(source: string): Promise<void> {
  const sourceDir = dirname(source);
  const workbook = Object.fromEntries(
    (await readXlsxFile(source)).map(({ sheet, data }) => [sheet, data]),
  );

  const drawingsDir = join(sourceDir, 'illustrations');
  const drawings = new Map<string, string>(
    existsSync(drawingsDir)
      ? readdirSync(drawingsDir)
          .filter((file) => file.endsWith('.svg'))
          .map((file) => [basename(file, '.svg'), readFileSync(join(drawingsDir, file), 'utf8')])
      : [],
  );

  // Premier passage : vérifier le classeur et connaître le pack visé.
  const first = importUnit({ workbook, drawings });
  if (!first.ok) {
    console.error(`Classeur à corriger (${first.issues.length} problème(s)) :`);
    for (const issue of first.issues) {
      const where = issue.row === undefined ? issue.sheet : `${issue.sheet}, ligne ${issue.row}`;
      console.error(`  ✗ ${where} : ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const packDir = join(PACKS_DIR, first.pack.id);
  const packFile = join(packDir, 'pack.json');
  const previous = existsSync(packFile) ? validatePack(readJson(packFile)) : undefined;

  // Durées mesurées des enregistrements déjà déposés dans le pack.
  const durations = new Map<string, number>();
  for (const audio of first.pack.audios) {
    const file = join(packDir, audio.file);
    const ms = existsSync(file) ? measureMs(file) : undefined;
    if (ms !== undefined) durations.set(audio.id, ms);
  }

  const baseVersion = previous?.ok === true ? previous.pack.version : 1;
  const result = importUnit({ workbook, drawings, durations, version: baseVersion });
  if (!result.ok) throw new Error('Import instable : le second passage a échoué.');
  let pack = result.pack;
  if (previous?.ok === true) {
    const same = isDeepStrictEqual({ ...previous.pack, version: 0 }, { ...pack, version: 0 });
    if (!same) pack = { ...pack, version: previous.pack.version + 1 };
  }

  mkdirSync(packDir, { recursive: true });
  const prettierConfig = (await resolveConfig(packFile)) ?? {};
  writeFileSync(
    packFile,
    await format(JSON.stringify(pack), { ...prettierConfig, filepath: packFile }),
  );
  const csvFile = join(sourceDir, 'enregistrements.csv');
  writeFileSync(csvFile, recordingsCsv(result.recordings));

  const exercises = pack.unit.lessons.reduce((n, lesson) => n + lesson.exercises.length, 0);
  const status = pack.validated ? 'validé' : 'non validé';
  console.log(`✓ ${relative(ROOT, packFile)} (version ${pack.version}, ${status})`);
  console.log(
    `  ${pack.unit.lessons.length} leçons, ${exercises} exercices, ${pack.items.length} mots et phrases`,
  );
  console.log(
    `  ${result.recordings.length} enregistrements listés dans ${relative(ROOT, csvFile)}`,
  );
  console.log(
    'Ensuite : npm run audio:placeholders && npm run content:build && npm run content:validate',
  );
}

const source = process.argv[2];
if (source === undefined || !source.endsWith('.xlsx')) {
  console.error('Usage : npm run content:import -- <classeur.xlsx>');
  process.exitCode = 1;
} else {
  main(source).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
