import type { Pack } from '@gbe/content-schema';
import { buildPack } from '@gbe/content-schema/src/__fixtures__/pack';
import { renderHook } from '@testing-library/react-native';

import { lessonAudioIds, loadContent, type LoadedContent } from '../content/content';
import { playAudio } from './audioService';
import { resetTakeRotation } from './takeRotation';
import { useClipPlayer } from './useClipPlayer';

/** Pack factice où « aud-a » a une seconde prise, « aud-a2 », dite par l'autre voix. */
function twoVoiceContent(): LoadedContent {
  const pack: Pack = buildPack();
  pack.audios = [
    { ...pack.audios[0]!, group: 'g' },
    {
      id: 'aud-a2',
      file: 'audio/a2.m4a',
      voice: 'B',
      speed: 'normal',
      durationMs: 950,
      group: 'g',
    },
    ...pack.audios.slice(1),
  ];
  const result = loadContent(pack, { 'audio/a.m4a': 1, 'audio/a2.m4a': 2, 'audio/b.m4a': 3 });
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.content;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetTakeRotation();
});

describe('deux voix pour un même texte', () => {
  it('alterne la voix d’homme et la voix de femme à chaque écoute', async () => {
    // Préparer
    const { result } = await renderHook(() => useClipPlayer(twoVoiceContent()));
    // Agir
    result.current('aud-a');
    result.current('aud-a');
    result.current('aud-a');
    // Vérifier
    expect(jest.mocked(playAudio).mock.calls.map(([source]) => source)).toEqual([1, 2, 1]);
  });

  it('rejoue toujours la même prise quand le texte n’a qu’une voix', async () => {
    const { result } = await renderHook(() => useClipPlayer(twoVoiceContent()));

    result.current('aud-b');
    result.current('aud-b');

    expect(jest.mocked(playAudio).mock.calls.map(([source]) => source)).toEqual([3, 3]);
  });

  it('précharge les deux voix des audios d’une leçon', () => {
    const content = twoVoiceContent();
    const lesson = content.pack.unit.lessons[0];
    if (lesson === undefined) throw new Error('fixture');

    expect(lessonAudioIds(lesson, content)).toEqual(expect.arrayContaining(['aud-a', 'aud-a2']));
  });
});
