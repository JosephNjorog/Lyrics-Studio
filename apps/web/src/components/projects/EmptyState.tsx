import Link from "next/link";
import { Music2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-border">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Music2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">No projects yet</h3>
      <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
        Upload an MP3 or MP4 file to create your first lyric video project.
      </p>
      <Button asChild className="gap-2">
        <Link href="/dashboard/upload">
          <Upload className="h-4 w-4" />
          Upload Audio
        </Link>
      </Button>
    </div>
  );
}
