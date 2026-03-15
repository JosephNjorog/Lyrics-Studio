/** Generic API response envelope */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
  code?: string;
}

/** Pagination */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Upload response from /api/upload */
export interface UploadResponse {
  url: string;
  publicId: string;
  format: string;
  size: number;
  duration?: number; // seconds (audio files)
}

/** Lyrics fetch request */
export interface LyricFetchRequest {
  title: string;
  artist: string;
}

export interface LyricFetchResponse {
  lyrics: string;
  source: "genius" | "lrclib" | "manual";
  hasTimings: boolean;
  language?: string;
}

/** Translation request */
export interface TranslateRequest {
  lyrics: string;
  sourceLanguage: string;
  targetLanguage?: string; // defaults to "en"
}

export interface TranslateResponse {
  translatedLyrics: string;
  sourceLanguage: string;
  targetLanguage: string;
}
