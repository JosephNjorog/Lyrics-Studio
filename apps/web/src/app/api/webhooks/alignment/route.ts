import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, syncData } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";

const wordTimingSchema = z.object({
  word: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  confidence: z.number(),
  lineIndex: z.number(),
  wordIndex: z.number(),
});

const callbackSchema = z.object({
  projectId: z.string().uuid(),
  status: z.enum(["completed", "failed"]),
  wordTimings: z.array(wordTimingSchema).optional(),
  error: z.string().optional(),
  durationSeconds: z.number().optional(),
});

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.ALIGNMENT_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsed = callbackSchema.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { projectId, status, wordTimings, error } = parsed.data;

  if (status === "completed" && wordTimings) {
    await db
      .insert(syncData)
      .values({ projectId, wordTimings, lastEditedAt: new Date() })
      .onConflictDoUpdate({
        target: syncData.projectId,
        set: { wordTimings, lastEditedAt: new Date() },
      });

    await db
      .update(projects)
      .set({ status: "ready", updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  } else {
    await db
      .update(projects)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    console.error(`Alignment failed for project ${projectId}:`, error);
  }

  return NextResponse.json({ ok: true });
}
