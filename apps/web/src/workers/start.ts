/**
 * Worker entry point — run this as a separate process in production.
 *
 * Usage:
 *   npx tsx apps/web/src/workers/start.ts
 *   # or via package.json script:  pnpm --filter=web workers
 *
 * Both BullMQ workers are started here. They listen on Redis for jobs
 * enqueued by the Next.js API routes.
 */

import "dotenv/config";
import { alignmentWorker } from "@/lib/queue/workers/alignmentWorker";
import { renderWorker } from "@/lib/queue/workers/renderWorker";

console.log("[workers] Starting LyricSync Studio background workers…");
console.log("[workers] Alignment worker:", alignmentWorker.name);
console.log("[workers] Render worker:   ", renderWorker.name);

// Graceful shutdown on SIGTERM / SIGINT
async function shutdown(signal: string) {
  console.log(`[workers] Received ${signal} — shutting down gracefully…`);
  await alignmentWorker.close();
  await renderWorker.close();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
