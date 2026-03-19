import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { projects, lyrics } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { addAlignmentJob } from "@/lib/queue";

const schema = z.object({
  projectId: z.string().uuid(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, parsed.data.projectId),
        eq(projects.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.audioUrl) {
    return NextResponse.json({ error: "No audio uploaded for this project" }, { status: 400 });
  }

  const [lyricRow] = await db
    .select()
    .from(lyrics)
    .where(eq(lyrics.projectId, project.id))
    .limit(1);

  if (!lyricRow?.rawText) {
    return NextResponse.json({ error: "No lyrics saved for this project" }, { status: 400 });
  }

  // Enqueue alignment job
  const job = await addAlignmentJob({
    projectId: project.id,
    audioUrl: project.audioUrl,
    lyrics: lyricRow.rawText,
    language: lyricRow.language ?? "en",
  });

  // Update project status
  await db
    .update(projects)
    .set({ status: "syncing", updatedAt: new Date() })
    .where(eq(projects.id, project.id));

  return NextResponse.json({ data: { jobId: job.id, status: "queued" } }, { status: 202 });
}
