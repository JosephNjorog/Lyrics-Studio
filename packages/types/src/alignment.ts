/** A single word with precise timing data from forced alignment */
export interface WordTiming {
  word: string;
  startTime: number; // seconds
  endTime: number;   // seconds
  confidence: number; // 0–1
  lineIndex: number;
  wordIndex: number;
}

/** A single lyric line composed of words */
export interface LyricLine {
  lineIndex: number;
  text: string;
  words: WordTiming[];
  startTime: number | null;
  endTime: number | null;
}

/** Structured lyric data stored per project */
export interface LyricWord {
  line: number;
  word: number;
  text: string;
  startTime: number | null;
  endTime: number | null;
}

/** Full alignment result from the Python microservice */
export interface AlignmentResult {
  projectId: string;
  language: string;
  wordTimings: WordTiming[];
  lines: LyricLine[];
  durationSeconds: number;
  alignedAt: string; // ISO timestamp
}

/** Request payload to the alignment microservice */
export interface AlignmentRequest {
  projectId: string;
  audioUrl: string;
  lyrics: string;
  language?: string;
  callbackUrl?: string;
}

/** Status of an alignment job */
export type AlignmentJobStatus = "pending" | "processing" | "completed" | "failed";

export interface AlignmentJob {
  jobId: string;
  projectId: string;
  status: AlignmentJobStatus;
  progress: number; // 0–100
  result?: AlignmentResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
