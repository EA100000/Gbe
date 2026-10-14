import { create } from 'zustand';

import {
  lessonReducer,
  startLesson,
  type LessonAction,
  type LessonViewState,
} from './lessonMachine';

/** État de l'écran de leçon (Zustand), mis à jour uniquement par le réducteur pur. */
interface LessonStore {
  state: LessonViewState | null;
  start: (...args: Parameters<typeof startLesson>) => void;
  dispatch: (action: LessonAction) => void;
  reset: () => void;
}

export const useLessonStore = create<LessonStore>((set) => ({
  state: null,
  start: (...args) => set({ state: startLesson(...args) }),
  dispatch: (action) =>
    set((store) => (store.state === null ? store : { state: lessonReducer(store.state, action) })),
  reset: () => set({ state: null }),
}));
