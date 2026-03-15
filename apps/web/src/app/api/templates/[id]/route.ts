import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [template] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, params.id), eq(templates.userId, session.user.id)))
    .limit(1);

  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(templates).where(eq(templates.id, params.id));

  return new NextResponse(null, { status: 204 });
}
