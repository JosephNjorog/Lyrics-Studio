"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Save,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Info,
} from "lucide-react";
import type { Project, Lyric, SyncData } from "@/lib/db/schema";
import type { WordTiming } from "@lyric-sync/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatTimestamp } from "@/lib/utils";
import { useWaveSurfer } from "@/hooks/useWaveSurfer";
import { useEditorStore } from "@/store/useEditorStore";
import { toast } from "@/hooks/use-toast";

interface SyncEditorProps {
  project: Project;
  lyricData: Lyric;
  syncData: SyncData | null;
}

interface DragState {
  wordKey: string; // `${lineIndex}-${wordIndex}`
  edge: "start" | "end";
  startX: number;
  originalTime: number;
  duration: number;
}

export function SyncEditor({ project, lyricData: _lyricData, syncData }: SyncEditorProps) {
  const waveContainerRef = useRef<HTMLDivElement>(null);
  const _timelineRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const [saving, setSaving] = useState(false);
  const [showHint, setShowHint] = useState(!syncData?.wordTimings);

  const {
    wordTimings,
    currentTime,
    isPlaying,
    isDirty,
    setWordTimings,
    updateWordTiming,
    selectedWordIndex,
    setSelectedWord,
  } = useEditorStore();

  const { ready, playPause, seekTo, duration } =
    useWaveSurfer({ url: project.audioUrl, container: waveContainerRef });

  // Load sync data into store
  useEffect(() => {
    if (syncData?.wordTimings) {
      setWordTimings(syncData.wordTimings as WordTiming[]);
    }
  }, [syncData, setWordTimings]);

  // Group words by line
  const lineMap = new Map<number, WordTiming[]>();
  for (const wt of wordTimings) {
    const l = lineMap.get(wt.lineIndex) ?? [];
    l.push(wt);
    lineMap.set(wt.lineIndex, l);
  }
  const lines = Array.from(lineMap.entries()).sort(([a], [b]) => a - b);

  // ─── Drag-to-adjust timing ──────────────────────────────────────────────────
  const PIXELS_PER_SECOND = 80; // px per second on the timeline ruler

  const handleDragStart = useCallback(
    (e: React.MouseEvent, wt: WordTiming, edge: "start" | "end") => {
      e.preventDefault();
      dragRef.current = {
        wordKey: `${wt.lineIndex}-${wt.wordIndex}`,
        edge,
        startX: e.clientX,
        originalTime: edge === "start" ? wt.startTime : wt.endTime,
        duration,
      };

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dt = dx / PIXELS_PER_SECOND;
        const newTime = Math.max(0, dragRef.current.originalTime + dt);

        const [li, wi] = dragRef.current.wordKey.split("-").map(Number) as [number, number];
        updateWordTiming(li, wi, {
          [dragRef.current.edge === "start" ? "startTime" : "endTime"]: parseFloat(
            newTime.toFixed(3),
          ),
        });
      };

      const onMouseUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [duration, updateWordTiming],
  );

  // ─── Save to database ───────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/sync/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordTimings }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Sync data saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
    setSaving(false);
  }

  // ─── Active word detection ──────────────────────────────────────────────────
  // (used via isActive checks inline per word pill)

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Waveform + controls */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div ref={waveContainerRef} className="waveform-container min-h-[80px]" />
          {!ready && (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading audio…</span>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={playPause} disabled={!ready}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Play / Pause</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => seekTo(0)} disabled={!ready}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restart</TooltipContent>
            </Tooltip>

            <code className="rounded bg-muted px-2 py-1 font-mono text-sm text-muted-foreground">
              {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
            </code>

            <div className="ml-auto flex items-center gap-2">
              {isDirty && (
                <span className="text-xs text-amber-400">Unsaved changes</span>
              )}
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSave}
                disabled={!isDirty || saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Timings
              </Button>
            </div>
          </div>
        </div>

        {/* Instructions hint */}
        {showHint && (
          <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <strong className="text-white">How to fine-tune timings:</strong> Click any word to
              select it and seek the audio to that position. Drag the{" "}
              <span className="text-primary">◀ start</span> or{" "}
              <span className="text-primary">end ▶</span> handles to adjust its timing. Press Save
              when done.
            </div>
            <button
              className="ml-auto shrink-0 text-muted-foreground hover:text-white"
              onClick={() => setShowHint(false)}
            >
              ✕
            </button>
          </div>
        )}

        {/* Lyrics timeline panel */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium text-white">
              Word Timings
              {wordTimings.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({wordTimings.length} words)
                </span>
              )}
            </h3>
          </div>

          {wordTimings.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No timing data yet. Go to the{" "}
              <strong className="text-white">Lyrics tab</strong> and click{" "}
              <strong className="text-white">Auto-Sync Lyrics</strong> to run alignment.
            </div>
          ) : (
            <ScrollArea className="h-[55vh]">
              <div className="space-y-1 p-4">
                {lines.map(([lineIdx, words]) => {
                  const isLineActive = words.some(
                    (wt) => currentTime >= wt.startTime && currentTime <= wt.endTime,
                  );
                  return (
                    <div
                      key={lineIdx}
                      className={cn(
                        "rounded-lg p-2 transition-colors",
                        isLineActive ? "bg-primary/10" : "hover:bg-muted/30",
                      )}
                    >
                      {/* Line label */}
                      <p className="mb-1.5 text-xs text-muted-foreground">Line {lineIdx + 1}</p>

                      {/* Words */}
                      <div className="flex flex-wrap gap-1.5">
                        {words.map((wt) => {
                          const key = `${wt.lineIndex}-${wt.wordIndex}`;
                          const isActive =
                            currentTime >= wt.startTime && currentTime <= wt.endTime;
                          const isSelected =
                            selectedWordIndex === wt.lineIndex * 1000 + wt.wordIndex;

                          return (
                            <div key={key} className="group/word relative">
                              {/* Word pill */}
                              <button
                                onClick={() => {
                                  seekTo(wt.startTime);
                                  setSelectedWord(
                                    isSelected ? null : wt.lineIndex * 1000 + wt.wordIndex,
                                  );
                                }}
                                className={cn(
                                  "relative flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition-all",
                                  isActive
                                    ? "border-primary bg-primary text-white shadow-md shadow-primary/30"
                                    : isSelected
                                      ? "border-primary/60 bg-primary/15 text-white"
                                      : "border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-white",
                                )}
                              >
                                {/* Start drag handle */}
                                <span
                                  className="hidden cursor-ew-resize select-none text-xs opacity-50 group-hover/word:block"
                                  onMouseDown={(e) => handleDragStart(e, wt, "start")}
                                  title="Drag to adjust start time"
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                </span>

                                {wt.word}

                                {/* End drag handle */}
                                <span
                                  className="hidden cursor-ew-resize select-none text-xs opacity-50 group-hover/word:block"
                                  onMouseDown={(e) => handleDragStart(e, wt, "end")}
                                  title="Drag to adjust end time"
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </span>
                              </button>

                              {/* Timing tooltip on select */}
                              {isSelected && (
                                <div className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md ring-1 ring-border">
                                  {formatTimestamp(wt.startTime)} → {formatTimestamp(wt.endTime)}
                                  <br />
                                  <span className="text-muted-foreground">
                                    conf: {Math.round(wt.confidence * 100)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
