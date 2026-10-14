/**
 * Génère des audios de remplacement (des « bips ») pour chaque audio déclaré dans les packs.
 * Ils permettent de développer et de tester l'appli avant les séances de studio.
 * Les vrais enregistrements des deux experts les remplaceront, fichier par fichier.
 *
 * Usage : npm run audio:placeholders [-- --force]
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { validatePack } from '@gbe/content-schema';

import { listPackDirs, readJson } from './lib/packs';

const force = process.argv.includes('--force');

/** Fréquence stable pour un identifiant donné, entre 330 et 880 Hz. */
function frequencyFor(id: string): number {
  const byte = createHash('sha256').update(id).digest()[0] ?? 0;
  return 330 + Math.round((byte / 255) * 550);
}

let created = 0;
for (const dir of listPackDirs()) {
  const result = validatePack(readJson(join(dir, 'pack.json')));
  if (!result.ok) {
    console.error(`Pack invalide, audios non générés : ${dir}`);
    process.exitCode = 1;
    continue;
  }
  for (const audio of result.pack.audios) {
    const target = join(dir, audio.file);
    if (existsSync(target) && !force) continue;
    mkdirSync(dirname(target), { recursive: true });
    const seconds = (audio.durationMs / 1000).toFixed(3);
    // Voix B un peu plus grave ; vitesse lente = deux bips.
    const base = frequencyFor(audio.id) * (audio.voice === 'B' ? 0.75 : 1);
    const tone =
      audio.speed === 'slow'
        ? `sine=frequency=${base}:duration=${seconds},volume='if(lt(mod(t,0.5),0.35),1,0)':eval=frame`
        : `sine=frequency=${base}:duration=${seconds}`;
    execFileSync(
      'ffmpeg',
      [
        '-loglevel',
        'error',
        '-y',
        '-f',
        'lavfi',
        '-i',
        tone,
        '-af',
        'afade=t=in:d=0.02,afade=t=out:st=' +
          Math.max(0, audio.durationMs / 1000 - 0.05).toFixed(3) +
          ':d=0.05',
        '-ac',
        '1',
        '-ar',
        '44100',
        '-c:a',
        'aac',
        '-b:a',
        '64k',
        // Sortie reproductible : pas de date ni de métadonnées variables.
        '-map_metadata',
        '-1',
        '-fflags',
        '+bitexact',
        '-flags:a',
        '+bitexact',
        target,
      ],
      { stdio: 'inherit' },
    );
    created += 1;
  }
}
console.log(`Audios de remplacement créés : ${created}`);
