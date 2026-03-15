import { Worker } from "bullmq";
import { redisConnection } from "../index";
import type { RenderQueueJob } from "@lyric-sync/types";
import { db } from "@/lib/db";
import { renders, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { renderVideo } from "@/lib/video/renderer";
import { uploadToCloudinary } from "@/lib/cloudinary";
import fs from "fs/promises";

export const renderWorker = new Worker<RenderQueueJob>(
  "render",
  async (job) => {
    const { renderId, projectId, audioUrl, backgroundUrl, wordTimings, textStyle, resolution } =
      job.data;

    const startTime = Date.now();

    // Update render status → processing
    await db
      .update(renders)
      .set({ status: "processing", progress: 5, updatedAt: new Date() })
      .where(eq(renders.id, renderId));

    await job.updateProgress(5);

    // Render to temp file
    const outputPath = `/tmp/render_${renderId}.mp4`;
    await renderVideo({
      outputPath,
      audioUrl,
      backgroundUrl,
      wordTimings,
      textStyle,
      resolution,
      onProgress: async (pct) => {
        await job.updateProgress(Math.floor(5 + pct * 0.85)); // 5–90%
        await db
          .update(renders)
          .set({ progress: Math.floor(5 + pct * 0.85) })
          .where(eq(renders.id, renderId));
      },
    });

    await job.updateProgress(90);

    // Upload final video to Cloudinary
    const buffer = await fs.readFile(outputPath);
    const uploaded = await uploadToCloudinary(buffer, {
      folder: `lyric-sync/renders`,
      resource_type: "video",
      public_id: `render_${renderId}`,
    });

    // Clean up temp file
    await fs.unlink(outputPath).catch(() => undefined);

    const durationMs = Date.now() - startTime;

    // Update render → completed
    await db
      .update(renders)
      .set({
        status: "completed",
        progress: 100,
        outputUrl: uploaded.secure_url,
        renderDurationMs: durationMs,
        updatedAt: new Date(),
      })
      .where(eq(renders.id, renderId));

    // Update project status
    await db
      .update(projects)
      .set({ status: "rendered", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    await job.updateProgress(100);

    return { outputUrl: uploaded.secure_url };
  },
  {
    connection: redisConnection,
    concurrency: 1, // Rendering is CPU-intensive; limit to 1 at a time
  },
);

renderWorker.on("failed", async (job, err) => {
  console.error(`[render] Job ${job?.id} failed:`, err.message);
  if (job?.data.renderId) {
    await db
      .update(renders)
      .set({ status: "failed", error: err.message, updatedAt: new Date() })
      .where(eq(renders.id, job.data.renderId));
  }
});
