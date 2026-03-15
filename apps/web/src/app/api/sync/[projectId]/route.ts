import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { syncData, projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const wordTimingSchema = z.object({
  word: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  confidence: z.number(),
  lineIndex: z.number(),
  wordIndex: z.number(),
});

const updateSchema = z.object({
  wordTimings: z.array(wordTimingSchema),
});

export async function PUT(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify project ownership
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.projectId), eq(projects.userId, session.user.id)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body: unknown = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [updated] = await db
    .insert(syncData)
    .values({
      projectId: params.projectId,
      wordTimings: parsed.data.wordTimings,
      lastEditedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: syncData.projectId,
      set: {
        wordTimings: parsed.data.wordTimings,
        lastEditedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json({ data: updated });
}
