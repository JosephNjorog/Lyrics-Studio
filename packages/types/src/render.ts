export type RenderResolution = "1080p" | "4k";
export type RenderStatus = "queued" | "processing" | "completed" | "failed";

export interface RenderJob {
  id: string;
  projectId: string;
  templateId: string;
  resolution: RenderResolution;
  status: RenderStatus;
  progress: number; // 0–100
  outputUrl: string | null;
  renderDurationMs: number | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRenderInput {
  projectId: string;
  templateId: string;
  resolution?: RenderResolution;
  textStyleOverrides?: Partial<import("./template.js").TextStyle>;
}
