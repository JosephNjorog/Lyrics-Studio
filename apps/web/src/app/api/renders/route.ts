import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { projects, templates, syncData, renders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { addRenderJob } from "@/lib/queue";
import { DEFAULT_TEXT_STYLE } from "@lyric-sync/types";

const schema = z.object({
  projectId: z.string().uuid(),
  templateId: z.string().uuid(),
  resolution: z.enum(["1080p", "4k"]).default("1080p"),
  textStyleOverrides: z.record(z.unknown()).optional(),
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

  if (!project?.audioUrl) {
    return NextResponse.json(
      { error: "Project not found or has no audio" },
      { status: 404 },
    );
  }

  const [template] = await db
    .select()
    .from(templates)
    .where(
      and(
        eq(templates.id, parsed.data.templateId),
        eq(templates.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const [sync] = await db
    .select()
    .from(syncData)
    .where(eq(syncData.projectId, project.id))
    .limit(1);

  if (!sync?.wordTimings) {
    return NextResponse.json(
      { error: "Project has no sync data. Run alignment first." },
      { status: 400 },
    );
  }

  // Create render record
  const [render] = await db
    .insert(renders)
    .values({
      projectId: project.id,
      templateId: template.id,
      resolution: parsed.data.resolution,
      status: "queued",
      progress: 0,
    })
    .returning();

  // Merge text style
  const textStyle = { ...DEFAULT_TEXT_STYLE, ...(parsed.data.textStyleOverrides ?? {}) };

  // Enqueue render job
  await addRenderJob({
    projectId: project.id,
    renderId: render!.id,
    templateId: template.id,
    resolution: parsed.data.resolution,
    audioUrl: project.audioUrl,
    backgroundUrl: template.imageUrl,
    wordTimings: sync.wordTimings as never,
    textStyle,
  });

  // Update project status
  await db
    .update(projects)
    .set({ status: "rendering", updatedAt: new Date() })
    .where(eq(projects.id, project.id));

  return NextResponse.json({ data: render }, { status: 202 });
}
