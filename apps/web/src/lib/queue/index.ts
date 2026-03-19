import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { AlignmentQueueJob, RenderQueueJob } from "@lyric-sync/types";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const alignmentQueue = new Queue<AlignmentQueueJob, void, string>("alignment", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const renderQueue = new Queue<RenderQueueJob, void, string>("render", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 10000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 25 },
  },
});

/** Typed wrappers — avoids BullMQ v5 ExtractNameType inference issues */
export const addAlignmentJob = (data: AlignmentQueueJob) =>
  alignmentQueue.add("align" as string, data);

export const addRenderJob = (data: RenderQueueJob) =>
  renderQueue.add("render" as string, data);

export { connection as redisConnection };
