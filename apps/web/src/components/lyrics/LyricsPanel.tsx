"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Wand2, Languages, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { Project, Lyric } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAlignmentJob } from "@/hooks/useAlignmentJob";
import { toast } from "@/hooks/use-toast";

interface LyricsPanelProps {
  project: Project;
  lyricData: Lyric | null;
  /** Called when alignment completes so parent can refresh sync data */
  onAlignmentDone?: () => void;
}

export function LyricsPanel({ project, lyricData, onAlignmentDone }: LyricsPanelProps) {
  const router = useRouter();
  const [lyrics, setLyrics] = useState(lyricData?.rawText ?? "");
  const [translated, setTranslated] = useState(lyricData?.translatedText ?? "");
  const [language, setLanguage] = useState(lyricData?.language ?? "en");
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [translating, setTranslating] = useState(false);

  const { startAlignment, isActive, progress, isDone, isFailed } = useAlignmentJob({
    projectId: project.id,
    onSuccess: () => {
      toast({ title: "Alignment complete!", description: "Switch to Sync Editor to review." });
      onAlignmentDone?.();
      router.refresh();
    },
  });

  async function handleSave() {
    if (!lyrics.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, rawText: lyrics, language }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Lyrics saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
    setSaving(false);
  }

  async function handleFetch() {
    setFetching(true);
    try {
      const res = await fetch(
        `/api/lyrics?title=${encodeURIComponent(project.title)}&artist=${encodeURIComponent(project.artist)}`,
      );
      const data = (await res.json()) as { data?: { lyrics: string; source: string; hasTimings: boolean } };
      if (data.data?.lyrics) {
        setLyrics(data.data.lyrics);
        toast({
          title: "Lyrics found!",
          description: `Source: ${data.data.source}. Review and save before syncing.`,
        });
      } else {
        toast({
          title: "Lyrics not found",
          description: "Try pasting them manually.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Fetch failed", variant: "destructive" });
    }
    setFetching(false);
  }

  async function handleTranslate() {
    if (!lyrics) return;
    setTranslating(true);
    try {
      // Ensure lyrics are saved first
      await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, rawText: lyrics, language }),
      });

      const res = await fetch("/api/lyrics/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, sourceLanguage: language }),
      });
      const data = (await res.json()) as { data?: { translatedText: string }; error?: string };
      if (res.status === 503) {
        toast({
          title: "Translation not available",
          description: "OpenAI API key is not configured. You can still paste translated lyrics manually.",
          variant: "destructive",
        });
      } else if (data.data?.translatedText) {
        setTranslated(data.data.translatedText);
        toast({ title: "Translation complete" });
      } else if (data.error) {
        toast({ title: "Translation failed", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Translation failed", variant: "destructive" });
    }
    setTranslating(false);
  }

  async function handleStartAlignment() {
    if (!lyrics.trim()) {
      toast({ title: "Add lyrics first", variant: "destructive" });
      return;
    }
    // Save lyrics first, then enqueue
    await handleSave();
    await startAlignment();
  }

  const wordCount = lyrics.trim() ? lyrics.trim().split(/\s+/).length : 0;
  const lineCount = lyrics.trim() ? lyrics.trim().split("\n").filter(Boolean).length : 0;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleFetch}
          disabled={fetching}
        >
          {fetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Fetch Lyrics
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleTranslate}
          disabled={translating || !lyrics}
        >
          {translating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Languages className="h-4 w-4" />
          )}
          Translate to English (GPT-4o)
        </Button>

        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleSave}
            disabled={saving || !lyrics}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={handleStartAlignment}
            disabled={isActive || !lyrics}
          >
            {isActive ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isDone ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {isActive ? "Syncing…" : isDone ? "Synced!" : "Auto-Sync Lyrics"}
          </Button>
        </div>
      </div>

      {/* Alignment status bar */}
      {isActive && (
        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-primary">WhisperX forced alignment running…</span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            This runs in the background — you can leave this page.
          </p>
        </div>
      )}

      {isDone && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Alignment complete! Switch to the <strong>Sync Editor</strong> tab to review and
            fine-tune word timings.
          </AlertDescription>
        </Alert>
      )}

      {isFailed && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Alignment failed. Check that your audio is uploaded and the lyrics match the song.
          </AlertDescription>
        </Alert>
      )}

      {/* Language picker */}
      <div className="flex items-end gap-4">
        <div className="space-y-1.5">
          <Label>Song language (ISO code)</Label>
          <Input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="en, es, fr, ko, ja…"
            className="w-40"
          />
        </div>
        {lyrics && (
          <p className="text-xs text-muted-foreground">
            {lineCount} lines · {wordCount} words
          </p>
        )}
      </div>

      {/* Lyrics editor */}
      <Tabs defaultValue="original">
        <TabsList>
          <TabsTrigger value="original">Original Lyrics</TabsTrigger>
          <TabsTrigger value="translated" disabled={!translated}>
            English Translation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="original" className="mt-4">
          <Textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={22}
            className="resize-y font-mono text-sm leading-relaxed"
            placeholder={`Paste your lyrics here, or click "Fetch Lyrics" to search automatically.

Each line will become a lyric line in the video.
Blank lines are ignored.`}
          />
        </TabsContent>

        <TabsContent value="translated" className="mt-4">
          <Textarea
            value={translated}
            onChange={(e) => setTranslated(e.target.value)}
            rows={22}
            className="resize-y font-mono text-sm leading-relaxed"
            placeholder="Click 'Translate to English (GPT-4o)' to generate a natural translation…"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
