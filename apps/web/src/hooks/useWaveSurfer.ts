"use client";

import { useEffect, useRef, useState } from "react";
import type WaveSurfer from "wavesurfer.js";

interface UseWaveSurferOptions {
  url: string | null;
  container: React.RefObject<HTMLDivElement>;
}

export function useWaveSurfer({ url, container }: UseWaveSurferOptions) {
  const wsRef = useRef<WaveSurfer | null>(null);
  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!container.current || !url) return;

    let destroyed = false;

    const init = async () => {
      const WaveSurferLib = (await import("wavesurfer.js")).default;

      if (destroyed || !container.current) return;

      const ws = WaveSurferLib.create({
        container: container.current,
        waveColor: "hsl(263 70% 50% / 0.4)",
        progressColor: "hsl(263 70% 50%)",
        cursorColor: "hsl(263 70% 70%)",
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 80,
        url,
      });

      ws.on("ready", () => {
        if (!destroyed) {
          setReady(true);
          setDuration(ws.getDuration());
        }
      });
      ws.on("timeupdate", (t) => { if (!destroyed) setCurrentTime(t); });
      ws.on("play", () => { if (!destroyed) setIsPlaying(true); });
      ws.on("pause", () => { if (!destroyed) setIsPlaying(false); });
      ws.on("finish", () => { if (!destroyed) setIsPlaying(false); });

      wsRef.current = ws;
    };

    void init();

    return () => {
      destroyed = true;
      wsRef.current?.destroy();
      wsRef.current = null;
      setReady(false);
    };
  }, [url, container]);

  const play = () => wsRef.current?.play();
  const pause = () => wsRef.current?.pause();
  const playPause = () => wsRef.current?.playPause();
  const seekTo = (seconds: number) => {
    const dur = wsRef.current?.getDuration() ?? 1;
    wsRef.current?.seekTo(seconds / dur);
  };

  return { wavesurfer: wsRef, ready, isPlaying, currentTime, duration, play, pause, playPause, seekTo };
}
