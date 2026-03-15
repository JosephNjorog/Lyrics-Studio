import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { projects, lyrics, syncData, renders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ProjectWorkspace } from "@/components/projects/ProjectWorkspace";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { title: "Project" };

  const [project] = await db
    .select({ title: projects.title, artist: projects.artist })
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.userId, session.user.id)))
    .limit(1);

  return {
    title: project ? `${project.title} — ${project.artist}` : "Project",
  };
}

export default async function ProjectPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return notFound();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.userId, session.user.id)))
    .limit(1);

  if (!project) return notFound();

  const [lyricData] = await db
    .select()
    .from(lyrics)
    .where(eq(lyrics.projectId, project.id))
    .limit(1);

  const [sync] = await db
    .select()
    .from(syncData)
    .where(eq(syncData.projectId, project.id))
    .limit(1);

  const renderList = await db
    .select()
    .from(renders)
    .where(eq(renders.projectId, project.id))
    .orderBy(renders.createdAt);

  return (
    <ProjectWorkspace
      project={project}
      lyricData={lyricData ?? null}
      syncData={sync ?? null}
      renders={renderList}
    />
  );
}
