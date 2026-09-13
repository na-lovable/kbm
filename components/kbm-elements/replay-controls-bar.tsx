"use client";

import { Button } from "@/components/ui/button";
import { Pause, Play, SkipBack, SkipForward, Waypoints, X } from "lucide-react";

interface ReplayControlsBarProps {
  replayPath: string[];
  replayStep: number;
  isReplaying: boolean;
  onStepBack: () => void;
  onStepForward: () => void;
  onTogglePlay: () => void;
  onStopReplay: () => void;
  onClose: () => void;
}

export function ReplayControlsBar({
  replayPath,
  replayStep,
  isReplaying,
  onStepBack,
  onStepForward,
  onTogglePlay,
  onStopReplay,
  onClose,
}: ReplayControlsBarProps) {
  if (replayPath.length === 0) return null;

  return (
    <div className="shrink-0 bg-primary/10 border-b border-primary/20 px-3 h-10 flex items-center justify-between gap-2 text-xs min-w-0">
      <div className="flex items-center gap-2 font-medium min-w-0 truncate">
        <Waypoints className={`h-4 w-4 text-primary shrink-0 ${isReplaying ? "animate-spin" : ""}`} />
        <span className="truncate">
          Step {replayStep + 1} / {replayPath.length}:{" "}
          <strong className="font-mono text-primary">{replayPath[replayStep]}</strong>
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          disabled={replayStep <= 0}
          onClick={onStepBack}
          className="h-7 w-7"
          title="Previous Step"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </Button>
        {isReplaying ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={onStopReplay}
            className="h-7 w-7"
            title="Pause"
          >
            <Pause className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            disabled={replayStep >= replayPath.length - 1}
            onClick={onTogglePlay}
            className="h-7 w-7"
            title="Play"
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          disabled={replayStep >= replayPath.length - 1}
          onClick={onStepForward}
          className="h-7 w-7"
          title="Next Step"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Close Replay"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
