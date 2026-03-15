import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ProjectsList } from "@/components/projects/ProjectsList";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/projects/EmptyState";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  const userProjects = session?.user?.id
    ? await db
        .select()
        .from(projects)
        .where(eq(projects.userId, session.user.id))
        .orderBy(desc(projects.createdAt))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {userProjects.length} lyric video{userProjects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/upload">
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {userProjects.length === 0 ? (
        <EmptyState />
      ) : (
        <ProjectsList initialProjects={userProjects} />
      )}
    </div>
  );
}
