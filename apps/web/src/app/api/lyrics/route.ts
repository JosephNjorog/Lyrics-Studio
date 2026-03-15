import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { lyrics, projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { fetchLyricsFromGenius, fetchLyricsFromLRCLIB } from "@/lib/lyrics/fetcher";

const saveLyricsSchema = z.object({
  projectId: z.string().uuid(),
  rawText: z.string().min(1),
  language: z.string().default("en"),
});

const fetchLyricsSchema = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = saveLyricsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Verify project belongs to user
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

  // Parse words JSON from raw text
  const wordsJson = parseLyricsToWords(parsed.data.rawText);

  const [saved] = await db
    .insert(lyrics)
    .values({
      projectId: parsed.data.projectId,
      language: parsed.data.language,
      rawText: parsed.data.rawText,
      wordsJson,
    })
    .onConflictDoUpdate({
      target: lyrics.projectId,
      set: {
        rawText: parsed.data.rawText,
        language: parsed.data.language,
        wordsJson,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json({ data: saved }, { status: 201 });
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title");
  const artist = searchParams.get("artist");

  const parsed = fetchLyricsSchema.safeParse({ title, artist });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "title and artist query params required" },
      { status: 400 },
    );
  }

  // Try LRCLIB first (has timed lyrics), fall back to Genius
  const lrcResult = await fetchLyricsFromLRCLIB(parsed.data.title, parsed.data.artist);
  if (lrcResult) {
    return NextResponse.json({
      data: { lyrics: lrcResult.lyrics, source: "lrclib", hasTimings: lrcResult.hasTimings },
    });
  }

  const geniusResult = await fetchLyricsFromGenius(parsed.data.title, parsed.data.artist);
  if (geniusResult) {
    return NextResponse.json({
      data: { lyrics: geniusResult, source: "genius", hasTimings: false },
    });
  }

  return NextResponse.json({ error: "Lyrics not found" }, { status: 404 });
}

function parseLyricsToWords(rawText: string) {
  const lines = rawText.split(/\n/).filter((l) => l.trim().length > 0);
  const words: Array<{
    line: number;
    word: number;
    text: string;
    startTime: null;
    endTime: null;
  }> = [];

  lines.forEach((line, lineIdx) => {
    const lineWords = line.trim().split(/\s+/);
    lineWords.forEach((w, wordIdx) => {
      if (w.length > 0) {
        words.push({ line: lineIdx, word: wordIdx, text: w, startTime: null, endTime: null });
      }
    });
  });

  return words;
}
