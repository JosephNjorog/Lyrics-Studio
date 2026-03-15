/** Bull job names */
export const QUEUE_NAMES = {
  ALIGNMENT: "alignment",
  RENDER: "render",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Alignment queue job data */
export interface AlignmentQueueJob {
  projectId: string;
  audioUrl: string;
  lyrics: string;
  language?: string;
}

/** Render queue job data */
export interface RenderQueueJob {
  projectId: string;
  renderId: string;
  templateId: string;
  resolution: import("./render.js").RenderResolution;
  audioUrl: string;
  backgroundUrl: string;
  wordTimings: import("./alignment.js").WordTiming[];
  textStyle: import("./template.js").TextStyle;
}
