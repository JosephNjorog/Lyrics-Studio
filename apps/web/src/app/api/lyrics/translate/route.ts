import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { lyrics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { translateLyrics } from "@/lib/lyrics/translator";

const schema = z.object({
  projectId: z.string().uuid(),
  sourceLanguage: z.string().min(2).max(10),
  targetLanguage: z.string().min(2).max(10).default("en"),
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

  const [lyricRow] = await db
    .select()
    .from(lyrics)
    .where(eq(lyrics.projectId, parsed.data.projectId))
    .limit(1);

  if (!lyricRow?.rawText) {
    return NextResponse.json({ error: "Lyrics not found for project" }, { status: 404 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Translation feature is not enabled (OPENAI_API_KEY not configured)" },
      { status: 503 },
    );
  }

  let translated: string | null;
  try {
    translated = await translateLyrics(
      lyricRow.rawText,
      parsed.data.sourceLanguage,
      parsed.data.targetLanguage,
    );
  } catch (err) {
    console.error("OpenAI translation error:", err);
    return NextResponse.json(
      { error: "Translation failed. Please try again." },
      { status: 502 },
    );
  }

  if (!translated) {
    return NextResponse.json({ error: "Translation returned empty result" }, { status: 502 });
  }

  const [updated] = await db
    .update(lyrics)
    .set({ translatedText: translated, updatedAt: new Date() })
    .where(eq(lyrics.projectId, parsed.data.projectId))
    .returning();

  return NextResponse.json({ data: { translatedText: updated?.translatedText } });
}
