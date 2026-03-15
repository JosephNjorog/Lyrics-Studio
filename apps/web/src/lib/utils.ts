import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Format a timestamp in seconds to MM:SS.ms */
export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: "text-muted-foreground",
    syncing: "text-blue-400",
    ready: "text-emerald-400",
    rendering: "text-amber-400",
    rendered: "text-purple-400",
    error: "text-red-400",
  };
  return map[status] ?? "text-muted-foreground";
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    syncing: "Syncing...",
    ready: "Ready to Render",
    rendering: "Rendering...",
    rendered: "Rendered",
    error: "Error",
  };
  return map[status] ?? status;
}
