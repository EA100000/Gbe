import type { LexiconItem } from '@gbe/content-schema';
import { masteryOf, normalizeFon, shuffle, type ItemStat } from '@gbe/domain';

import { t } from '../../core/i18n';
import type { ListenChoiceExercise } from '../lesson/lessonMachine';
import type { PracticeBuilder } from '../practice/usePracticeController';

/** Mots entendus au plus dans une séance d'écoute. */
export const LISTEN_SIZE = 8;
const CHOICES = 4;

/**
 * Séance « Écouter et choisir » (écran 25, ADR 0020) : des mots déjà rencontrés qui ont un
 * enregistrement, les moins maîtrisés d'abord. Les autres choix sont d'autres mots enregistrés,
 * de préférence déjà vus ; jamais deux fois le même texte fon.
 */
export const buildListening: PracticeBuilder = (stats, content, rng) => {
  const audible = (item: LexiconItem | undefined): item is LexiconItem =>
    item?.audio?.normal !== undefined && content.audioSources.has(item.audio.normal);
  const seen = [...stats.values()]
    .map((stat): [ItemStat, LexiconItem | undefined] => [stat, content.itemsById.get(stat.key)])
    .filter((pair): pair is [ItemStat, LexiconItem] => audible(pair[1]));
  if (seen.length < 2) return [];

  const ordered = shuffle(seen, rng).sort((a, b) => masteryOf(a[0]) - masteryOf(b[0]));
  const seenIds = new Set(seen.map(([, item]) => item.id));
  const pool = shuffle([...content.itemsById.values()].filter(audible), rng).sort(
    (a, b) => Number(seenIds.has(b.id)) - Number(seenIds.has(a.id)),
  );

  return ordered.slice(0, LISTEN_SIZE).map(([, item], index): ListenChoiceExercise => {
    const others: LexiconItem[] = [];
    for (const candidate of pool) {
      if (others.length >= CHOICES - 1) break;
      const fon = normalizeFon(candidate.fon);
      if (candidate.id === item.id || fon === normalizeFon(item.fon)) continue;
      if (others.some((o) => normalizeFon(o.fon) === fon)) continue;
      others.push(candidate);
    }
    const audio = item.audio?.normal ?? '';
    const slow = item.audio?.slow;
    return {
      id: `ecoute-${index + 1}`,
      type: 'listen_choice',
      tag: { kind: 'listen', labelFr: t('listen.tag') },
      promptFr: t('listen.prompt'),
      audio,
      ...(slow === undefined || !content.audioSources.has(slow) ? {} : { slowAudio: slow }),
      choices: shuffle([item, ...others], rng).map((o) => o.id),
      answer: item.id,
    };
  });
};
