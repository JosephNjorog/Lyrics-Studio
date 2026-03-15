import { create } from "zustand";
import type { WordTiming } from "@lyric-sync/types";

interface EditorStore {
  wordTimings: WordTiming[];
  selectedWordIndex: number | null;
  currentTime: number;
  isPlaying: boolean;
  isDirty: boolean;

  setWordTimings: (timings: WordTiming[]) => void;
  updateWordTiming: (lineIndex: number, wordIndex: number, updates: Partial<WordTiming>) => void;
  setSelectedWord: (index: number | null) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setDirty: (dirty: boolean) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  wordTimings: [],
  selectedWordIndex: null,
  currentTime: 0,
  isPlaying: false,
  isDirty: false,

  setWordTimings: (wordTimings) => set({ wordTimings, isDirty: false }),

  updateWordTiming: (lineIndex, wordIndex, updates) =>
    set((state) => ({
      wordTimings: state.wordTimings.map((wt) =>
        wt.lineIndex === lineIndex && wt.wordIndex === wordIndex ? { ...wt, ...updates } : wt,
      ),
      isDirty: true,
    })),

  setSelectedWord: (selectedWordIndex) => set({ selectedWordIndex }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setDirty: (isDirty) => set({ isDirty }),

  reset: () =>
    set({
      wordTimings: [],
      selectedWordIndex: null,
      currentTime: 0,
      isPlaying: false,
      isDirty: false,
    }),
}));
