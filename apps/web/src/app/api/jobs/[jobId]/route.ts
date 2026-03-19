import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { alignmentQueue, renderQueue } from "@/lib/queue";

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check both queues
  const job =
    (await alignmentQueue.getJob(params.jobId)) ??
    (await renderQueue.getJob(params.jobId));

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const state = await job.getState();
  const progress = job.progress ?? 0;

  return NextResponse.json({
    data: {
      jobId: job.id,
      state,
      progress,
      result: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
    },
  });
}
