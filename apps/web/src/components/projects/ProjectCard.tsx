"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Music2, Clock, MoreVertical, Trash2, ExternalLink, Loader2 } from "lucide-react";
import type { Project } from "@/lib/db/schema";
import { cn, formatDuration, getStatusColor, getStatusLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface ProjectCardProps {
  project: Project;
  onDeleted?: (id: string) => void;
}

export function ProjectCard({ project, onDeleted }: ProjectCardProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: `"${project.title}" deleted` });
      onDeleted?.(project.id);
      router.refresh();
    } catch {
      toast({ title: "Failed to delete project", variant: "destructive" });
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <div className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
        {/* Thumbnail / cover art */}
        <Link href={`/dashboard/projects/${project.id}`}>
          <div className="relative aspect-video overflow-hidden bg-muted">
            {project.coverArt ? (
              <Image
                src={project.coverArt}
                alt={project.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Music2 className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
            {/* Status badge overlay */}
            <div className="absolute bottom-2 left-2">
              <span
                className={cn(
                  "rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium backdrop-blur-sm",
                  getStatusColor(project.status),
                )}
              >
                {getStatusLabel(project.status)}
              </span>
            </div>
          </div>
        </Link>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Link href={`/dashboard/projects/${project.id}`}>
                <h3 className="truncate font-semibold text-white hover:text-primary">
                  {project.title}
                </h3>
              </Link>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{project.artist}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/projects/${project.id}`} className="cursor-pointer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Project
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => setShowConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {project.duration && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(project.duration)}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{project.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project, its lyrics, sync data, and all render
              records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
