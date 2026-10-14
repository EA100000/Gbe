import type { Manifest, Pack } from './schema';
import { ManifestSchema, PackSchema, SUPPORTED_FORMAT_VERSIONS } from './schema';

export type PackIssueCode =
  | 'schema'
  | 'format_version'
  | 'duplicate_id'
  | 'missing_reference'
  | 'invalid_answer'
  | 'missing_illustration'
  | 'missing_audio'
  | 'story_answer'
  | 'manifest_mismatch'
  | 'manifest_missing_file'
  | 'hash_mismatch';

export interface PackIssue {
  code: PackIssueCode;
  /** Emplacement dans le pack, par exemple `unit.lessons.0.exercises.2.answer`. */
  path: string;
  message: string;
}

export type PackValidation = { ok: true; pack: Pack } | { ok: false; issues: PackIssue[] };

/** Nom du fichier principal d'un pack, à la racine de son dossier. */
export const PACK_FILE = 'pack.json';

const isSupportedVersion = (v: unknown): boolean =>
  typeof v === 'number' && (SUPPORTED_FORMAT_VERSIONS as readonly number[]).includes(v);

/**
 * Valide un pack de contenu : schéma, puis cohérence interne
 * (identifiants uniques, références existantes, bonnes réponses possibles).
 */
export function validatePack(input: unknown): PackValidation {
  if (
    typeof input === 'object' &&
    input !== null &&
    'formatVersion' in input &&
    !isSupportedVersion((input as { formatVersion: unknown }).formatVersion)
  ) {
    return {
      ok: false,
      issues: [
        {
          code: 'format_version',
          path: 'formatVersion',
          message: `Format de pack non pris en charge : ${String((input as { formatVersion: unknown }).formatVersion)}`,
        },
      ],
    };
  }

  const parsed = PackSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        code: 'schema' as const,
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  const pack = parsed.data;
  const issues = checkConsistency(pack);
  return issues.length === 0 ? { ok: true, pack } : { ok: false, issues };
}

function findDuplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
}

function checkConsistency(pack: Pack): PackIssue[] {
  const issues: PackIssue[] = [];
  const add = (code: PackIssueCode, path: string, message: string) =>
    issues.push({ code, path, message });

  const lessons = pack.unit.lessons;
  const exercises = lessons.flatMap((lesson) => lesson.exercises);
  const groups: [string, string[]][] = [
    ['items', pack.items.map((i) => i.id)],
    ['audios', pack.audios.map((a) => a.id)],
    ['audios.file', pack.audios.map((a) => a.file)],
    ['illustrations', pack.illustrations.map((i) => i.id)],
    ['unit.lessons', lessons.map((l) => l.id)],
    ['exercises', exercises.map((e) => e.id)],
  ];
  for (const [path, ids] of groups) {
    for (const duplicate of findDuplicates(ids)) {
      add('duplicate_id', path, `Identifiant en double : ${duplicate}`);
    }
  }

  const audioIds = new Set(pack.audios.map((a) => a.id));
  const illustrationIds = new Set(pack.illustrations.map((i) => i.id));
  const itemsById = new Map(pack.items.map((item) => [item.id, item]));

  const requireAudio = (id: string | undefined, path: string) => {
    if (id !== undefined && !audioIds.has(id)) {
      add('missing_reference', path, `Audio inconnu : ${id}`);
    }
  };

  pack.items.forEach((item, i) => {
    requireAudio(item.audio?.normal, `items.${i}.audio.normal`);
    requireAudio(item.audio?.slow, `items.${i}.audio.slow`);
    if (item.illustration !== undefined && !illustrationIds.has(item.illustration)) {
      add(
        'missing_reference',
        `items.${i}.illustration`,
        `Illustration inconnue : ${item.illustration}`,
      );
    }
  });

  lessons.forEach((lesson, l) => {
    lesson.exercises.forEach((exercise, e) => {
      const base = `unit.lessons.${l}.exercises.${e}`;
      switch (exercise.type) {
        case 'image_choice': {
          exercise.choices.forEach((choice, c) => {
            const item = itemsById.get(choice);
            if (item === undefined) {
              add('missing_reference', `${base}.choices.${c}`, `Élément inconnu : ${choice}`);
            } else if (item.illustration === undefined) {
              add(
                'missing_illustration',
                `${base}.choices.${c}`,
                `Élément sans illustration : ${choice}`,
              );
            }
          });
          for (const duplicate of findDuplicates(exercise.choices)) {
            add('duplicate_id', `${base}.choices`, `Choix en double : ${duplicate}`);
          }
          if (!exercise.choices.includes(exercise.answer)) {
            add(
              'invalid_answer',
              `${base}.answer`,
              'La bonne réponse ne fait pas partie des choix',
            );
          }
          break;
        }
        case 'build_sentence':
          requireAudio(exercise.audio, `${base}.audio`);
          break;
        case 'match_pairs':
          for (const duplicate of findDuplicates(exercise.pairs.map((p) => p.fon))) {
            add('duplicate_id', `${base}.pairs`, `Mot fon en double : ${duplicate}`);
          }
          for (const duplicate of findDuplicates(exercise.pairs.map((p) => p.fr))) {
            add('duplicate_id', `${base}.pairs`, `Traduction en double : ${duplicate}`);
          }
          exercise.pairs.forEach((pair, p) => requireAudio(pair.audio, `${base}.pairs.${p}.audio`));
          break;
        case 'story': {
          exercise.lines.forEach((line, n) => {
            requireAudio(line.audio, `${base}.lines.${n}.audio`);
            if (line.audioOnly === true && line.audio === undefined) {
              add('missing_audio', `${base}.lines.${n}`, 'Réplique « audio seul » sans audio');
            }
            if (line.audioOnly !== true && line.fon === undefined) {
              add('missing_reference', `${base}.lines.${n}.fon`, 'Réplique sans texte fon');
            }
          });
          const correct = exercise.question.choices.filter((c) => c.correct).length;
          if (correct !== 1) {
            add(
              'story_answer',
              `${base}.question`,
              `Il faut exactement une bonne réplique (trouvé : ${correct})`,
            );
          }
          break;
        }
        case 'pronunciation': {
          const item = itemsById.get(exercise.item);
          if (item === undefined) {
            add('missing_reference', `${base}.item`, `Élément inconnu : ${exercise.item}`);
          } else if (item.audio?.normal === undefined) {
            add(
              'missing_audio',
              `${base}.item`,
              `Élément sans audio de référence : ${exercise.item}`,
            );
          }
          break;
        }
      }
    });
  });

  pack.sounds?.letters.forEach((card, i) => requireAudio(card.audio, `sounds.letters.${i}.audio`));
  pack.sounds?.nasals.forEach((card, i) => requireAudio(card.audio, `sounds.nasals.${i}.audio`));

  return issues;
}

/** Liste des fichiers qu'un pack doit livrer : le JSON et chaque audio. */
export function listPackFiles(pack: Pack): string[] {
  return [PACK_FILE, ...pack.audios.map((a) => a.file)];
}

/**
 * Vérifie un manifeste contre les fichiers réellement présents.
 * `actualHashes` associe chaque chemin relatif à son empreinte SHA-256 calculée.
 */
export function verifyManifest(
  manifestInput: unknown,
  actualHashes: ReadonlyMap<string, string>,
  pack?: Pack,
): { ok: true; manifest: Manifest } | { ok: false; issues: PackIssue[] } {
  const parsed = ManifestSchema.safeParse(manifestInput);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        code: 'schema' as const,
        path: `manifest.${issue.path.join('.')}`,
        message: issue.message,
      })),
    };
  }
  const manifest = parsed.data;
  const issues: PackIssue[] = [];

  if (!isSupportedVersion(manifest.formatVersion)) {
    issues.push({
      code: 'format_version',
      path: 'manifest.formatVersion',
      message: `Format de pack non pris en charge : ${manifest.formatVersion}`,
    });
  }

  manifest.files.forEach((file, i) => {
    const actual = actualHashes.get(file.path);
    if (actual === undefined) {
      issues.push({
        code: 'manifest_missing_file',
        path: `manifest.files.${i}`,
        message: `Fichier absent : ${file.path}`,
      });
    } else if (actual !== file.sha256) {
      issues.push({
        code: 'hash_mismatch',
        path: `manifest.files.${i}`,
        message: `Empreinte différente pour ${file.path}`,
      });
    }
  });

  if (pack !== undefined) {
    if (pack.id !== manifest.packId || pack.version !== manifest.version) {
      issues.push({
        code: 'manifest_mismatch',
        path: 'manifest',
        message: 'Le manifeste ne correspond pas au pack (identifiant ou version)',
      });
    }
    const listed = new Set(manifest.files.map((f) => f.path));
    for (const path of listPackFiles(pack)) {
      if (!listed.has(path)) {
        issues.push({
          code: 'manifest_missing_file',
          path: 'manifest.files',
          message: `Fichier du pack absent du manifeste : ${path}`,
        });
      }
    }
  }

  return issues.length === 0 ? { ok: true, manifest } : { ok: false, issues };
}
