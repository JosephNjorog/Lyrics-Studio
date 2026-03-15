import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { AlignmentQueueJob, RenderQueueJob } from "@lyric-sync/types";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const alignmentQueue = new Queue<AlignmentQueueJob>("alignment", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const renderQueue = new Queue<RenderQueueJob>("render", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 10000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 25 },
  },
});

export { connection as redisConnection };
