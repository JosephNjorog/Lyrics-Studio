"use client";

import { useState, useCallback } from "react";
import { useJobPoll } from "./useJobPoll";
import { toast } from "./use-toast";

interface UseAlignmentJobOptions {
  projectId: string;
  onSuccess?: () => void;
}

/**
 * Manages the full alignment flow:
 *   1. POST /api/alignment to enqueue
 *   2. Poll the returned jobId until completion
 *   3. Notify caller on success/failure
 */
export function useAlignmentJob({ projectId, onSuccess }: UseAlignmentJobOptions) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { status, isRunning, isDone, isFailed } = useJobPoll(jobId);

  // Fire callback when job succeeds
  if (isDone && jobId) {
    onSuccess?.();
  }

  if (isFailed && jobId) {
    toast({
      title: "Alignment failed",
      description: status?.failedReason ?? "Unknown error. Try again.",
      variant: "destructive",
    });
  }

  const startAlignment = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/alignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast({
          title: "Could not start alignment",
          description: data.error ?? "Unknown error",
          variant: "destructive",
        });
        return;
      }

      const data = (await res.json()) as { data: { jobId: string } };
      setJobId(data.data.jobId);
      toast({
        title: "Auto-sync started",
        description: "WhisperX is aligning your lyrics. This takes 1–3 minutes.",
      });
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [projectId]);

  const progress = status?.progress ?? 0;
  const isActive = submitting || isRunning;

  return { startAlignment, isActive, progress, isDone, isFailed, jobId };
}
