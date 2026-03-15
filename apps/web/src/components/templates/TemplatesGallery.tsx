"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Plus, Trash2, Tag, Loader2, Image as ImageIcon } from "lucide-react";
import type { Template } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";

interface TemplatesGalleryProps {
  initialTemplates: Template[];
}

export function TemplatesGallery({ initialTemplates }: TemplatesGalleryProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
    onDrop: (files) => setFile(files[0] ?? null),
  });

  async function handleUpload() {
    if (!file || !name) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("tags", JSON.stringify(tags.split(",").map((t) => t.trim()).filter(Boolean)));

    try {
      const res = await fetch("/api/templates", { method: "POST", body: formData });
      const data = await res.json() as { data: Template };
      setTemplates((prev) => [data.data, ...prev]);
      setName("");
      setTags("");
      setFile(null);
      toast({ title: "Template uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Template deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-8">
      {/* Upload form */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 font-semibold text-white">Upload New Template</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dark Minimal" />
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma-separated)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="dark, minimal, nature" />
            </div>
            <Button
              onClick={handleUpload}
              disabled={!file || !name || uploading}
              className="w-full gap-2"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Upload Template
            </Button>
          </div>

          <div
            {...getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
              file && "border-emerald-500/50 bg-emerald-500/5",
            )}
          >
            <input {...getInputProps()} />
            {file ? (
              <p className="text-sm font-medium text-white">{file.name}</p>
            ) : (
              <>
                <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drop image (JPG, PNG, WebP)</p>
                <p className="text-xs text-muted-foreground">Recommended: 1920×1080</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Gallery grid */}
      {templates.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          No templates yet — upload your first background image above.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
            >
              {t.thumbnailUrl ? (
                <Image
                  src={t.thumbnailUrl}
                  alt={t.name}
                  width={400}
                  height={225}
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-muted">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}

              <div className="p-3">
                <p className="truncate text-sm font-medium text-white">{t.name}</p>
                {Array.isArray(t.tags) && t.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {t.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleDelete(t.id)}
                className="absolute right-2 top-2 hidden rounded-md bg-destructive/80 p-1.5 text-white transition-opacity group-hover:flex"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
