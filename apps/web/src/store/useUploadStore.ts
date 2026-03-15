import { create } from "zustand";

export type UploadStep = "idle" | "uploading" | "processing" | "done" | "error";

interface UploadStore {
  step: UploadStep;
  progress: number;
  fileName: string | null;
  error: string | null;
  audioUrl: string | null;
  metadata: {
    title: string | null;
    artist: string | null;
    duration: number | null;
    coverArt: string | null;
  } | null;

  setStep: (step: UploadStep) => void;
  setProgress: (progress: number) => void;
  setFileName: (name: string | null) => void;
  setError: (error: string | null) => void;
  setAudioUrl: (url: string | null) => void;
  setMetadata: (metadata: UploadStore["metadata"]) => void;
  reset: () => void;
}

export const useUploadStore = create<UploadStore>((set) => ({
  step: "idle",
  progress: 0,
  fileName: null,
  error: null,
  audioUrl: null,
  metadata: null,

  setStep: (step) => set({ step }),
  setProgress: (progress) => set({ progress }),
  setFileName: (fileName) => set({ fileName }),
  setError: (error) => set({ error }),
  setAudioUrl: (audioUrl) => set({ audioUrl }),
  setMetadata: (metadata) => set({ metadata }),
  reset: () =>
    set({
      step: "idle",
      progress: 0,
      fileName: null,
      error: null,
      audioUrl: null,
      metadata: null,
    }),
}));
