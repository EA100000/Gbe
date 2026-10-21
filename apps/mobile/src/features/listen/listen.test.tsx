import { createRng, itemStats, type ItemAnsweredEvent } from '@gbe/domain';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { playAudio } from '../../core/audio/audioService';
import { mergeContents } from '../../core/content/practiceContent';
import { useProgressStore } from '../../core/progress/progressStore';
import { setupStores, testContent } from '../../test-utils/fixtures';
import { useLessonStore } from '../lesson/lessonStore';
import { PracticeScreen } from '../practice/PracticeScreen';
import { practiceAudioIds } from '../practice/usePracticeController';
import { ReviewScreen } from '../review/ReviewScreen';
import { buildListening, LISTEN_SIZE } from './listenSession';

let n = 0;
const answered = (itemId: string, correct: boolean): ItemAnsweredEvent => {
  n += 1;
  return {
    id: `l${n}`,
    type: 'item_answered',
    at: Date.UTC(2026, 9, 20, 9, n),
    dayKey: '2026-10-20',
    unitId: 'u01',
    itemId,
    correct,
    mode: 'lesson',
  };
};

function merged() {
  const content = mergeContents([testContent()]);
  if (content === null) throw new Error('contenu');
  return content;
}

beforeEach(() => {
  jest.clearAllMocks();
  useLessonStore.getState().reset();
});

describe('séance « Écouter et choisir »', () => {
  it('fait entendre les mots déjà rencontrés, les moins maîtrisés d’abord', () => {
    // Préparer
    const stats = itemStats([answered('sin', true), answered('hwe', true), answered('kwe', false)]);
    // Agir
    const exercises = buildListening(stats, merged(), createRng(4));
    // Vérifier
    expect(exercises.map((e) => e.type === 'listen_choice' && e.answer)).toEqual([
      'u01:kwe',
      expect.stringMatching(/^u01:(sin|hwe)$/),
      expect.stringMatching(/^u01:(sin|hwe)$/),
    ]);
    for (const exercise of exercises) {
      if (exercise.type !== 'listen_choice') throw new Error('écoute attendue');
      expect(exercise.choices).toHaveLength(4);
      expect(exercise.choices).toContain(exercise.answer);
      expect(new Set(exercise.choices).size).toBe(4);
    }
  });

  it('propose l’audio lent quand il existe', () => {
    const exercises = buildListening(
      itemStats([answered('sin', true), answered('n1', true)]),
      merged(),
      createRng(1),
    );

    const sin = exercises.find((e) => e.type === 'listen_choice' && e.answer === 'u01:sin');
    const n1 = exercises.find((e) => e.type === 'listen_choice' && e.answer === 'u01:n1');
    expect(sin).toMatchObject({ audio: 'u01:sin-n', slowAudio: 'u01:sin-l' });
    expect(n1).not.toHaveProperty('slowAudio');
  });

  it('attend au moins deux mots rencontrés, et s’arrête à huit', () => {
    expect(buildListening(itemStats([answered('sin', true)]), merged(), createRng(1))).toEqual([]);

    const all = [...merged().itemsById.keys()].map((key) => answered(key.slice(4), true));
    expect(buildListening(itemStats(all), merged(), createRng(1))).toHaveLength(LISTEN_SIZE);
  });

  it('précharge le mot entendu et sa version lente, toutes voix comprises', () => {
    const content = merged();
    const ids = practiceAudioIds(
      [
        {
          id: 'e',
          type: 'listen_choice',
          promptFr: 'Qu’as-tu entendu ?',
          audio: 'u01:sin-n',
          slowAudio: 'u01:sin-l',
          choices: ['u01:sin', 'u01:hwe'],
          answer: 'u01:sin',
        },
      ],
      content,
    );

    expect(ids).toEqual(['u01:sin-n', 'u01:sin-l']);
  });

  it('se joue sans perdre de vie et corrige l’erreur réussie', async () => {
    // Préparer : « kwɛ́ » raté en leçon, « sin » réussi
    await setupStores({ events: [answered('kwe', false), answered('sin', true)] });
    await render(<PracticeScreen mode="listen" build={buildListening} />);
    expect(screen.getByText('Qu’as-tu entendu ?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('listen-play'));
    expect(playAudio).toHaveBeenCalled();

    // Agir : premier mot (kwɛ́, le moins maîtrisé) juste, second faux
    await fireEvent.press(screen.getByTestId('listen-choice-u01:kwe'));
    await fireEvent.press(screen.getByTestId('check-button'));
    expect(screen.getByText('Bonne oreille !')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('feedback-button'));
    await fireEvent.press(screen.getByTestId('listen-choice-u01:kwe'));
    await fireEvent.press(screen.getByTestId('check-button'));
    expect(screen.getByTestId('feedback-wrong')).toHaveTextContent(/Pas de vie perdue/);
    await fireEvent.press(screen.getByTestId('feedback-button'));
    await fireEvent.press(screen.getByTestId('listen-choice-u01:sin'));
    await fireEvent.press(screen.getByTestId('check-button'));
    await fireEvent.press(screen.getByTestId('feedback-button'));

    // Vérifier
    const { events, lastSummary } = useProgressStore.getState();
    const listened = events.filter((e) => e.type === 'item_answered' && e.mode === 'listen');
    expect(listened).toEqual([
      expect.objectContaining({ itemId: 'kwe', correct: true }),
      expect.objectContaining({ itemId: 'sin', correct: false }),
    ]);
    expect(events.map((e) => e.type)).not.toContain('heart_lost');
    expect(lastSummary).toMatchObject({ kind: 'listen' });
    expect(router.replace).toHaveBeenCalledWith('/fin');
  });
});

describe('carte « Écouter et choisir »', () => {
  it('reste inactive sans mots rencontrés, puis ouvre la séance', async () => {
    await setupStores();
    const { rerender } = await render(<ReviewScreen />);
    expect(screen.getByTestId('listen-start')).toBeDisabled();

    await setupStores({ events: [answered('sin', true), answered('hwe', true)] });
    await rerender(<ReviewScreen />);
    await fireEvent.press(screen.getByTestId('listen-start'));

    expect(router.push).toHaveBeenCalledWith('/ecoute');
  });
});
