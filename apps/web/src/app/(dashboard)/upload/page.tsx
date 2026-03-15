import type { Metadata } from "next";
import { UploadView } from "@/components/upload/UploadView";

export const metadata: Metadata = { title: "Upload Audio" };

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">New Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload an MP3 or MP4 (audio-only) file to get started.
        </p>
      </div>
      <UploadView />
    </div>
  );
}
