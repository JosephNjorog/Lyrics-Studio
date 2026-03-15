import { Worker } from "bullmq";
import { redisConnection } from "../index";
import type { AlignmentQueueJob } from "@lyric-sync/types";
import axios from "axios";

const ALIGNMENT_SERVICE_URL = process.env.ALIGNMENT_SERVICE_URL ?? "http://localhost:8000";
const CALLBACK_URL = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/webhooks/alignment`;
const WEBHOOK_SECRET = process.env.ALIGNMENT_WEBHOOK_SECRET ?? "";

export const alignmentWorker = new Worker<AlignmentQueueJob>(
  "alignment",
  async (job) => {
    const { projectId, audioUrl, lyrics, language } = job.data;

    await job.updateProgress(10);

    const response = await axios.post(
      `${ALIGNMENT_SERVICE_URL}/api/v1/alignment`,
      {
        project_id: projectId,
        audio_url: audioUrl,
        lyrics,
        language: language ?? "en",
        callback_url: CALLBACK_URL,
        callback_secret: WEBHOOK_SECRET,
      },
      { timeout: 300_000 }, // 5 min timeout
    );

    await job.updateProgress(90);

    return response.data;
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);

alignmentWorker.on("completed", (job) => {
  console.log(`[alignment] Job ${job.id} completed for project ${job.data.projectId}`);
});

alignmentWorker.on("failed", (job, err) => {
  console.error(`[alignment] Job ${job?.id} failed:`, err.message);
});
