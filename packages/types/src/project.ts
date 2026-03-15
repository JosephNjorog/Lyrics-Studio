export type ProjectStatus = "draft" | "syncing" | "ready" | "rendering" | "rendered" | "error";

export interface Project {
  id: string;
  userId: string;
  title: string;
  artist: string;
  duration: number | null;
  audioUrl: string | null;
  coverArt: string | null;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  title: string;
  artist: string;
  duration?: number;
  audioUrl?: string;
  coverArt?: string;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  status?: ProjectStatus;
}
