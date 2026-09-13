"use client";

import { useCallback, useEffect, useState } from "react";

const REPLAY_INTERVAL_MS = 1800;

interface UseReplayEngineOptions {
  inspectNode: (filename: string) => void;
}

export function useReplayEngine({ inspectNode }: UseReplayEngineOptions) {
  const [replayPath, setReplayPath] = useState<string[]>([]);
  const [replayStep, setReplayStep] = useState(-1);
  const [isReplaying, setIsReplaying] = useState(false);

  useEffect(() => {
    if (!isReplaying || replayPath.length === 0) return;

    const timer = setInterval(() => {
      setReplayStep((prev) => {
        const next = prev + 1;
        if (next >= replayPath.length) {
          setIsReplaying(false);
          return prev;
        }
        inspectNode(replayPath[next]);
        return next;
      });
    }, REPLAY_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isReplaying, replayPath, inspectNode]);

  const handleStartReplay = useCallback(
    (path: string[]) => {
      if (path.length === 0) return;
      setReplayPath(path);
      setReplayStep(0);
      setIsReplaying(true);
      inspectNode(path[0]);
    },
    [inspectNode],
  );

  const handleStepForward = useCallback(() => {
    setReplayStep((prev) => {
      if (prev >= replayPath.length - 1) return prev;
      const next = prev + 1;
      inspectNode(replayPath[next]);
      return next;
    });
  }, [inspectNode, replayPath]);

  const handleStepBack = useCallback(() => {
    setReplayStep((prev) => {
      if (prev <= 0) return prev;
      const back = prev - 1;
      inspectNode(replayPath[back]);
      return back;
    });
  }, [inspectNode, replayPath]);

  const handleStopReplay = useCallback(() => setIsReplaying(false), []);

  const handleStepReplay = useCallback((path: string[], stepIdx: number) => {
    setReplayPath(path);
    setReplayStep(stepIdx);
    setIsReplaying(false);
  }, []);

  const clearReplay = useCallback(() => {
    setReplayPath([]);
    setReplayStep(-1);
    setIsReplaying(false);
  }, []);

  const resumeReplay = useCallback(() => {
    if (replayPath.length === 0 || replayStep >= replayPath.length - 1) return;
    setIsReplaying(true);
  }, [replayPath.length, replayStep]);

  return {
    replayPath,
    replayStep,
    isReplaying,
    handleStartReplay,
    handleStepForward,
    handleStepBack,
    handleStopReplay,
    handleStepReplay,
    clearReplay,
    resumeReplay,
  };
}
