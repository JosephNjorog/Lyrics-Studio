import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { TemplatesGallery } from "@/components/templates/TemplatesGallery";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions);
  const userTemplates = session?.user?.id
    ? await db
        .select()
        .from(templates)
        .where(eq(templates.userId, session.user.id))
        .orderBy(desc(templates.createdAt))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Background images for your lyric videos. Reusable across all projects.
        </p>
      </div>
      <TemplatesGallery initialTemplates={userTemplates} />
    </div>
  );
}
