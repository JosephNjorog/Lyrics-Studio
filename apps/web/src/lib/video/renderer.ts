import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { createCanvas, loadImage } from "canvas";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import os from "os";
import type { WordTiming, TextStyle } from "@lyric-sync/types";

ffmpeg.setFfmpegPath(ffmpegPath.path);

const RESOLUTION_MAP = {
  "1080p": { width: 1920, height: 1080 },
  "4k": { width: 3840, height: 2160 },
};

interface RenderOptions {
  outputPath: string;
  audioUrl: string;
  backgroundUrl: string;
  wordTimings: WordTiming[];
  textStyle: TextStyle;
  resolution: "1080p" | "4k";
  onProgress?: (percent: number) => Promise<void>;
}

export async function renderVideo(opts: RenderOptions): Promise<void> {
  const { width, height } = RESOLUTION_MAP[opts.resolution];
  const fps = 30;

  // Download background image
  const bgResponse = await axios.get(opts.backgroundUrl, { responseType: "arraybuffer" });
  const bgTempPath = path.join(os.tmpdir(), `bg_${Date.now()}.jpg`);
  await fs.writeFile(bgTempPath, Buffer.from(bgResponse.data as ArrayBuffer));
  const bgImage = await loadImage(bgTempPath);

  // Determine total duration from last word timing
  const totalDuration =
    opts.wordTimings.length > 0
      ? Math.ceil(opts.wordTimings[opts.wordTimings.length - 1]!.endTime + 1)
      : 0;

  const totalFrames = totalDuration * fps;
  const framesDir = path.join(os.tmpdir(), `frames_${Date.now()}`);
  await fs.mkdir(framesDir, { recursive: true });

  // Group word timings by line
  const lineMap = new Map<number, WordTiming[]>();
  for (const wt of opts.wordTimings) {
    const line = lineMap.get(wt.lineIndex) ?? [];
    line.push(wt);
    lineMap.set(wt.lineIndex, line);
  }
  const lines = Array.from(lineMap.entries()).sort(([a], [b]) => a - b);

  // Render frames
  for (let frame = 0; frame < totalFrames; frame++) {
    const currentTime = frame / fps;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Draw background
    ctx.drawImage(bgImage, 0, 0, width, height);

    // Determine which lines are "active" (visible)
    const visibleLines = getVisibleLines(lines, currentTime, 3);

    // Draw lyrics
    drawLyrics(ctx, visibleLines, currentTime, opts.textStyle, width, height);

    // Save frame
    const framePath = path.join(framesDir, `frame_${String(frame).padStart(8, "0")}.png`);
    await fs.writeFile(framePath, canvas.toBuffer("image/png"));

    if (frame % 30 === 0 && opts.onProgress) {
      await opts.onProgress(Math.floor((frame / totalFrames) * 100));
    }
  }

  // Assemble video with FFmpeg
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(path.join(framesDir, "frame_%08d.png"))
      .inputFPS(fps)
      .input(opts.audioUrl)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-pix_fmt yuv420p",
        "-preset fast",
        "-crf 18",
        "-movflags +faststart",
        `-vf scale=${width}:${height}`,
      ])
      .output(opts.outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });

  // Cleanup temp files
  await fs.rm(framesDir, { recursive: true, force: true });
  await fs.unlink(bgTempPath).catch(() => undefined);
}

function getVisibleLines(
  lines: [number, WordTiming[]][],
  currentTime: number,
  windowSize: number,
): [number, WordTiming[]][] {
  // Find current line
  const currentLineIdx = lines.findIndex(([, words]) => {
    const first = words[0];
    const last = words[words.length - 1];
    return first && last && currentTime >= first.startTime && currentTime <= last.endTime;
  });

  if (currentLineIdx === -1) {
    // Between lines — show upcoming
    const nextIdx = lines.findIndex(([, words]) => {
      const first = words[0];
      return first && currentTime < first.startTime;
    });
    if (nextIdx === -1) return [];
    return lines.slice(Math.max(0, nextIdx - 1), nextIdx + windowSize - 1);
  }

  const start = Math.max(0, currentLineIdx - 1);
  const end = Math.min(lines.length, start + windowSize);
  return lines.slice(start, end);
}

function drawLyrics(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  visibleLines: [number, WordTiming[]][],
  currentTime: number,
  style: TextStyle,
  canvasWidth: number,
  canvasHeight: number,
) {
  const fontSize = style.fontSize;
  const lineHeight = fontSize * style.lineSpacing;

  ctx.font = `bold ${fontSize}px "${style.fontFamily}", sans-serif`;
  ctx.textAlign = style.textAlign as CanvasTextAlign;
  ctx.textBaseline = "middle";

  const totalHeight = visibleLines.length * lineHeight;
  const startY = (canvasHeight - totalHeight) / 2 + lineHeight / 2;
  const centerX = canvasWidth / 2;

  visibleLines.forEach(([, words], lineOffset) => {
    const y = startY + lineOffset * lineHeight;

    if (style.highlightStyle === "color") {
      // Render word by word for per-word colour
      const fullLine = words.map((w) => w.word).join(" ");
      const totalLineWidth = ctx.measureText(fullLine).width;
      let x = style.textAlign === "center" ? centerX - totalLineWidth / 2 : style.padding.left;

      words.forEach((wt) => {
        const isActive = currentTime >= wt.startTime && currentTime <= wt.endTime;
        ctx.fillStyle = isActive ? style.highlightColor : style.baseColor;

        // Slight scale on active word
        if (isActive) {
          ctx.save();
          ctx.translate(x + ctx.measureText(wt.word).width / 2, y);
          ctx.scale(1.05, 1.05);
          ctx.fillText(wt.word, -ctx.measureText(wt.word).width / 2, 0);
          ctx.restore();
        } else {
          ctx.fillText(wt.word, x, y);
        }

        x += ctx.measureText(wt.word + " ").width;
      });
    } else {
      // Whole-line render with glow/underline
      const lineText = words.map((w) => w.word).join(" ");
      const isLineActive = words.some(
        (wt) => currentTime >= wt.startTime && currentTime <= wt.endTime,
      );
      ctx.fillStyle = isLineActive ? style.highlightColor : style.baseColor;

      if (isLineActive && style.highlightStyle === "glow") {
        ctx.shadowColor = style.highlightColor;
        ctx.shadowBlur = 20;
      }

      ctx.fillText(lineText, centerX, y);
      ctx.shadowBlur = 0;

      if (isLineActive && style.highlightStyle === "underline") {
        const lineWidth = ctx.measureText(lineText).width;
        ctx.strokeStyle = style.highlightColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX - lineWidth / 2, y + fontSize / 2 + 4);
        ctx.lineTo(centerX + lineWidth / 2, y + fontSize / 2 + 4);
        ctx.stroke();
      }
    }
  });
}
