"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Loader2,
  Film,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Settings2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Project, Template, Render } from "@/lib/db/schema";
import type { TextStyle } from "@lyric-sync/types";
import { DEFAULT_TEXT_STYLE } from "@lyric-sync/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatDuration } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useJobPoll } from "@/hooks/useJobPoll";
import Image from "next/image";

interface RenderPanelProps {
  project: Project;
  renders: Render[];
}

const FONT_OPTIONS = [
  "Inter",
  "Geist",
  "Montserrat",
  "Poppins",
  "Roboto",
  "Open Sans",
  "Raleway",
  "Oswald",
  "Bebas Neue",
];

const HIGHLIGHT_STYLES: Array<{ value: TextStyle["highlightStyle"]; label: string }> = [
  { value: "color", label: "Color change" },
  { value: "scale", label: "Scale pulse" },
  { value: "underline", label: "Underline" },
  { value: "glow", label: "Glow" },
];

function RenderStatusRow({ render }: { render: Render }) {
  // Poll if active
  const { status } = useJobPoll(
    render.status === "queued" || render.status === "processing" ? render.id : null,
  );

  const currentProgress = status?.progress ?? render.progress;
  const currentStatus =
    (status?.state as Render["status"] | undefined) ?? render.status;

  async function copyUrl() {
    if (!render.outputUrl) return;
    await navigator.clipboard.writeText(render.outputUrl);
    toast({ title: "URL copied to clipboard" });
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {currentStatus === "completed" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : currentStatus === "failed" ? (
            <AlertCircle className="h-5 w-5 text-red-400" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          <div>
            <p className="text-sm font-medium text-white">
              {render.resolution}{" "}
              <span className="capitalize text-muted-foreground">· {currentStatus}</span>
            </p>
            {render.renderDurationMs && (
              <p className="text-xs text-muted-foreground">
                Took {formatDuration(render.renderDurationMs / 1000)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(render.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {render.outputUrl && (
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={copyUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy Cloudinary URL</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={render.outputUrl} download>
                <Download className="h-4 w-4" />
                Download MP4
              </a>
            </Button>
          </div>
        )}
      </div>

      {(currentStatus === "queued" || currentStatus === "processing") && (
        <div className="mt-3 space-y-1">
          <Progress value={currentProgress} />
          <p className="text-xs text-muted-foreground">{currentProgress}% complete</p>
        </div>
      )}

      {currentStatus === "failed" && render.error && (
        <p className="mt-2 text-xs text-red-400">{render.error}</p>
      )}
    </div>
  );
}

export function RenderPanel({ project, renders: initialRenders }: RenderPanelProps) {
  const [renders, setRenders] = useState(initialRenders);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [resolution, setResolution] = useState<"1080p" | "4k">("1080p");
  const [launching, setLaunching] = useState(false);
  const [showTextStyle, setShowTextStyle] = useState(false);
  const [textStyle, setTextStyle] = useState<TextStyle>({ ...DEFAULT_TEXT_STYLE });

  // Load templates
  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json() as Promise<{ data: Template[] }>)
      .then((d) => setTemplates(d.data))
      .catch(() => undefined);
  }, []);

  function updateStyle<K extends keyof TextStyle>(key: K, value: TextStyle[K]) {
    setTextStyle((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRender(reRenderTemplateId?: string) {
    const tid = reRenderTemplateId ?? selectedTemplate;
    if (!tid) {
      toast({ title: "Select a template first", variant: "destructive" });
      return;
    }
    setLaunching(true);
    try {
      const res = await fetch("/api/renders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          templateId: tid,
          resolution,
          textStyleOverrides: textStyle,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Unknown error");
      }
      const data = (await res.json()) as { data: Render };
      setRenders((prev) => [data.data, ...prev]);
      toast({
        title: "Render started",
        description: "Typically takes 5–20 minutes. Progress shown below.",
      });
    } catch (err) {
      toast({
        title: "Failed to start render",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
    setLaunching(false);
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Template picker */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold text-white">1. Select Background Template</h3>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No templates yet.{" "}
              <a href="/dashboard/templates" className="text-primary hover:underline">
                Upload one
              </a>{" "}
              from the Templates page first.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={cn(
                    "overflow-hidden rounded-lg border-2 text-left transition-all",
                    selectedTemplate === t.id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {t.thumbnailUrl && (
                    <Image
                      src={t.thumbnailUrl}
                      alt={t.name}
                      width={200}
                      height={112}
                      className="aspect-video w-full object-cover"
                    />
                  )}
                  <p className="px-2 py-1.5 text-xs font-medium text-white">{t.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text style configurator */}
        <div className="rounded-xl border border-border bg-card">
          <button
            className="flex w-full items-center justify-between px-6 py-4 text-left"
            onClick={() => setShowTextStyle((v) => !v)}
          >
            <span className="flex items-center gap-2 font-semibold text-white">
              <Settings2 className="h-4 w-4 text-primary" />
              2. Text Style
            </span>
            {showTextStyle ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {showTextStyle && (
            <div className="border-t border-border px-6 pb-6 pt-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {/* Font */}
                <div className="space-y-1.5">
                  <Label>Font family</Label>
                  <Select
                    value={textStyle.fontFamily}
                    onValueChange={(v) => updateStyle("fontFamily", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Font size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Font size</Label>
                    <span className="text-sm text-muted-foreground">{textStyle.fontSize}px</span>
                  </div>
                  <Slider
                    min={24}
                    max={120}
                    step={2}
                    value={[textStyle.fontSize]}
                    onValueChange={([v]) => updateStyle("fontSize", v!)}
                  />
                </div>

                {/* Line spacing */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Line spacing</Label>
                    <span className="text-sm text-muted-foreground">
                      {textStyle.lineSpacing.toFixed(1)}×
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={3}
                    step={0.1}
                    value={[textStyle.lineSpacing]}
                    onValueChange={([v]) => updateStyle("lineSpacing", v!)}
                  />
                </div>

                {/* Base color */}
                <div className="space-y-1.5">
                  <Label>Base word color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={textStyle.baseColor}
                      onChange={(e) => updateStyle("baseColor", e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                    />
                    <Input
                      value={textStyle.baseColor}
                      onChange={(e) => updateStyle("baseColor", e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>

                {/* Highlight color */}
                <div className="space-y-1.5">
                  <Label>Highlight color (active word)</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={textStyle.highlightColor}
                      onChange={(e) => updateStyle("highlightColor", e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                    />
                    <Input
                      value={textStyle.highlightColor}
                      onChange={(e) => updateStyle("highlightColor", e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>

                {/* Highlight style */}
                <div className="space-y-1.5">
                  <Label>Highlight style</Label>
                  <Select
                    value={textStyle.highlightStyle}
                    onValueChange={(v) =>
                      updateStyle("highlightStyle", v as TextStyle["highlightStyle"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HIGHLIGHT_STYLES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Text align */}
                <div className="space-y-1.5">
                  <Label>Text alignment</Label>
                  <Select
                    value={textStyle.textAlign}
                    onValueChange={(v) =>
                      updateStyle("textAlign", v as TextStyle["textAlign"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Live preview swatch */}
              <div
                className="mt-4 flex items-center justify-center rounded-lg p-6 text-2xl font-bold"
                style={{ background: "#111" }}
              >
                <span style={{ color: textStyle.baseColor, fontFamily: textStyle.fontFamily }}>
                  I{" "}
                </span>
                <span
                  style={{
                    color: textStyle.highlightColor,
                    fontFamily: textStyle.fontFamily,
                    fontSize: `${Math.min(textStyle.fontSize, 48)}px`,
                    textDecoration:
                      textStyle.highlightStyle === "underline" ? "underline" : undefined,
                    textShadow:
                      textStyle.highlightStyle === "glow"
                        ? `0 0 16px ${textStyle.highlightColor}`
                        : undefined,
                  }}
                >
                  love
                </span>
                <span style={{ color: textStyle.baseColor, fontFamily: textStyle.fontFamily }}>
                  {" "}
                  this song
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Resolution + Launch */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="mb-2 text-sm font-medium text-white">3. Resolution</p>
            <div className="flex gap-2">
              {(["1080p", "4k"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setResolution(r)}
                  className={cn(
                    "rounded-md border px-4 py-1.5 text-sm font-medium transition-colors",
                    resolution === r
                      ? "border-primary bg-primary text-white"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {r}
                  {r === "4k" && (
                    <span className="ml-1.5 rounded bg-primary/20 px-1 py-0.5 text-xs text-primary">
                      slow
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="ml-auto">
            <Button
              size="lg"
              className="gap-2 px-8"
              onClick={() => handleRender()}
              disabled={launching || !selectedTemplate}
            >
              {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
              Finalise &amp; Render
            </Button>
          </div>
        </div>

        {/* Render history */}
        {renders.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Render History</h3>
              <p className="text-xs text-muted-foreground">{renders.length} render(s)</p>
            </div>
            {renders.map((render) => (
              <div key={render.id} className="space-y-1">
                <RenderStatusRow render={render} />
                {/* Re-render button (copies same template) */}
                {render.status === "completed" && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs text-muted-foreground"
                      onClick={() => handleRender(render.templateId)}
                      disabled={launching}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Re-render with current settings
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
