"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Project, Lyric, SyncData, Render } from "@/lib/db/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LyricsPanel } from "@/components/lyrics/LyricsPanel";
import { SyncEditor } from "@/components/audio/SyncEditor";
import { RenderPanel } from "@/components/render/RenderPanel";
import { getStatusLabel, getStatusColor, cn, formatDuration } from "@/lib/utils";
import { Clock, Music2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";

interface ProjectWorkspaceProps {
  project: Project;
  lyricData: Lyric | null;
  syncData: SyncData | null;
  renders: Render[];
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  syncing: Loader2,
  ready: CheckCircle2,
  rendered: CheckCircle2,
  error: AlertCircle,
};

export function ProjectWorkspace({
  project,
  lyricData,
  syncData,
  renders,
}: ProjectWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("lyrics");
  const [hasSyncData, setHasSyncData] = useState(!!syncData?.wordTimings);

  const handleAlignmentDone = useCallback(() => {
    setHasSyncData(true);
    setActiveTab("sync");
    router.refresh();
  }, [router]);

  const hasLyrics = !!lyricData?.rawText;
  const StatusIcon = STATUS_ICONS[project.status];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Project header */}
        <div className="flex items-start gap-4">
          {project.coverArt ? (
            <Image
              src={project.coverArt}
              alt={project.title}
              width={72}
              height={72}
              className="rounded-xl object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-xl bg-muted ring-1 ring-border">
              <Music2 className="h-9 w-9 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{project.title}</h1>
            <p className="text-muted-foreground">{project.artist}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  getStatusColor(project.status),
                )}
              >
                {StatusIcon && (
                  <StatusIcon
                    className={cn(
                      "h-3.5 w-3.5",
                      project.status === "syncing" && "animate-spin",
                    )}
                  />
                )}
                {getStatusLabel(project.status)}
              </span>
              {project.duration && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(project.duration)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Workflow tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="gap-0.5">
            <TabsTrigger value="lyrics">
              <span className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  1
                </span>
                Lyrics
              </span>
            </TabsTrigger>

            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <TabsTrigger value="sync" disabled={!hasLyrics}>
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold",
                          hasLyrics
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        2
                      </span>
                      Sync Editor
                    </span>
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              {!hasLyrics && (
                <TooltipContent>Save lyrics first to unlock the sync editor</TooltipContent>
              )}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <TabsTrigger value="render" disabled={!hasSyncData}>
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold",
                          hasSyncData
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        3
                      </span>
                      Render
                    </span>
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              {!hasSyncData && (
                <TooltipContent>Run alignment first to unlock rendering</TooltipContent>
              )}
            </Tooltip>
          </TabsList>

          <TabsContent value="lyrics" className="mt-6">
            <LyricsPanel
              project={project}
              lyricData={lyricData}
              onAlignmentDone={handleAlignmentDone}
            />
          </TabsContent>

          <TabsContent value="sync" className="mt-6">
            {hasLyrics && project.audioUrl ? (
              <SyncEditor
                project={project}
                lyricData={lyricData!}
                syncData={syncData}
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                Save lyrics and upload audio first.
              </div>
            )}
          </TabsContent>

          <TabsContent value="render" className="mt-6">
            <RenderPanel project={project} renders={renders} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
