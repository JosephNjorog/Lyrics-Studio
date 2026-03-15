"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Upload, Music2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { useUploadStore } from "@/store/useUploadStore";

export function UploadView() {
  const router = useRouter();
  const { step, progress, setStep, setProgress, setError, setMetadata, setAudioUrl, reset } =
    useUploadStore();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");

  const onDrop = useCallback(
    (accepted: File[]) => {
      const f = accepted[0];
      if (!f) return;
      setFile(f);
      setStep("idle");
      // Pre-fill title from filename
      const name = f.name.replace(/\.(mp3|mp4|m4a)$/i, "");
      if (!title) setTitle(name);
    },
    [title, setStep],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "audio/mpeg": [".mp3"], "audio/mp4": [".mp4", ".m4a"], "video/mp4": [".mp4"] },
    maxFiles: 1,
    maxSize: 200 * 1024 * 1024,
  });

  async function handleUpload() {
    if (!file) return;
    setStep("uploading");
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Simulate progress (actual XHR progress tracking could be added)
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress = Math.min(currentProgress + 5, 85);
        setProgress(currentProgress);
      }, 300);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      clearInterval(progressInterval);

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Upload failed");
      }

      const { data } = await res.json() as {
        data: {
          url: string;
          title?: string;
          artist?: string;
          duration?: number;
          coverArt?: string;
        };
      };

      setProgress(90);
      setAudioUrl(data.url);
      setMetadata({
        title: data.title ?? title,
        artist: data.artist ?? artist,
        duration: data.duration ?? null,
        coverArt: data.coverArt ?? null,
      });

      // Create project
      const projectTitle = data.title ?? title ?? file.name;
      const projectArtist = data.artist ?? artist ?? "Unknown Artist";

      const projectRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectTitle,
          artist: projectArtist,
          audioUrl: data.url,
          duration: data.duration,
          coverArt: data.coverArt,
        }),
      });

      const { data: project } = await projectRes.json() as { data: { id: string } };
      setProgress(100);
      setStep("done");

      toast({ title: "Project created!", description: `"${projectTitle}" is ready.` });

      setTimeout(() => {
        reset();
        router.push(`/dashboard/projects/${project.id}`);
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setStep("error");
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors",
          isDragActive
            ? "border-primary bg-primary/10"
            : file
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-border hover:border-primary/50 hover:bg-primary/5",
        )}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="space-y-2">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="font-medium text-white">{file.name}</p>
            <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
              {isDragActive ? (
                <Music2 className="h-7 w-7 text-primary" />
              ) : (
                <Upload className="h-7 w-7 text-primary" />
              )}
            </div>
            <div>
              <p className="font-medium text-white">
                {isDragActive ? "Drop it here" : "Drop your audio file"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                MP3 or MP4 — up to 200 MB
              </p>
            </div>
            <Button variant="outline" size="sm" type="button">
              Browse files
            </Button>
          </div>
        )}
      </div>

      {/* Metadata override */}
      {file && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Song title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-detected from ID3"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Artist</Label>
              <Input
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Auto-detected from ID3"
              />
            </div>
          </div>

          {/* Progress */}
          {step === "uploading" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {step === "error" && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Upload failed. Please try again.
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={step === "uploading" || step === "done"}
            className="w-full"
          >
            {step === "uploading" && <Loader2 className="h-4 w-4 animate-spin" />}
            {step === "done" ? "Redirecting..." : "Create Project"}
          </Button>
        </div>
      )}
    </div>
  );
}
