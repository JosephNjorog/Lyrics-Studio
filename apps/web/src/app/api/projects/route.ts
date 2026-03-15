import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
  audioUrl: z.string().url().optional(),
  duration: z.number().positive().optional(),
  coverArt: z.string().url().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(desc(projects.createdAt));

  return NextResponse.json({ data: userProjects });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const [project] = await db
    .insert(projects)
    .values({
      userId: session.user.id,
      ...parsed.data,
      status: "draft",
    })
    .returning();

  return NextResponse.json({ data: project }, { status: 201 });
}
