"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      </div>
      <Button onClick={reset} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
