import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { uploadToCloudinary } from "@/lib/cloudinary";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  tags: z.array(z.string()).default([]),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userTemplates = await db
    .select()
    .from(templates)
    .where(eq(templates.userId, session.user.id))
    .orderBy(desc(templates.createdAt));

  return NextResponse.json({ data: userTemplates });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string | null;
  const tagsRaw = formData.get("tags") as string | null;

  if (!file || !name) {
    return NextResponse.json(
      { error: "file and name are required" },
      { status: 400 },
    );
  }

  const parsed = createSchema.safeParse({
    name,
    tags: tagsRaw ? JSON.parse(tagsRaw) : [],
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const uploaded = await uploadToCloudinary(buffer, {
    folder: `lyric-sync/${session.user.id}/templates`,
    resource_type: "image",
    transformation: [{ width: 1920, height: 1080, crop: "fill" }],
  });

  // Auto-generate thumbnail (smaller version)
  const thumbnailUrl = uploaded.secure_url.replace(
    "/upload/",
    "/upload/w_400,h_225,c_fill/",
  );

  const [template] = await db
    .insert(templates)
    .values({
      userId: session.user.id,
      name: parsed.data.name,
      imageUrl: uploaded.secure_url,
      thumbnailUrl,
      tags: parsed.data.tags,
      type: "image",
    })
    .returning();

  return NextResponse.json({ data: template }, { status: 201 });
}
