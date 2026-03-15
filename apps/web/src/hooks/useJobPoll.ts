"use client";

import { useEffect, useRef, useState } from "react";

export type JobState = "waiting" | "active" | "completed" | "failed" | "delayed" | null;

export interface JobStatus {
  jobId: string;
  state: JobState;
  progress: number;
  result: unknown;
  failedReason: string | null;
}

/**
 * Polls /api/jobs/[jobId] until the job completes or fails.
 * Returns live status including progress percentage.
 */
export function useJobPoll(jobId: string | null, intervalMs = 2500) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId) {
      setStatus(null);
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          setError("Failed to fetch job status");
          stopPolling();
          return;
        }
        const data = (await res.json()) as { data: JobStatus };
        setStatus(data.data);

        if (data.data.state === "completed" || data.data.state === "failed") {
          stopPolling();
        }
      } catch {
        setError("Network error while polling job");
      }
    };

    const stopPolling = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    // Poll immediately, then on interval
    void poll();
    timerRef.current = setInterval(poll, intervalMs);

    return () => stopPolling();
  }, [jobId, intervalMs]);

  const isRunning = status?.state === "active" || status?.state === "waiting";
  const isDone = status?.state === "completed";
  const isFailed = status?.state === "failed";

  return { status, error, isRunning, isDone, isFailed };
}
