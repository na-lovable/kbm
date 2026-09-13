"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ChatPanelSkeleton } from "@/components/kbm-elements/panel-skeletons";
import { CaretRightIcon, SparkleIcon } from "@phosphor-icons/react";
import { PANEL_TOOLBAR_CLASS } from "@/lib/layout-classes";

const GroundedChatPanel = dynamic(
  () =>
    import("@/components/kbm-elements/grounded-chat-panel").then(
      (mod) => mod.GroundedChatPanel,
    ),
  {
    ssr: false,
    loading: () => <ChatPanelSkeleton />,
  },
);

interface AdvisorSidebarProps {
  open: boolean;
  reasoningContext: string | null;
  replayPath: string[];
  replayStep: number;
  isReplaying: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  onStartReplay: (path: string[]) => void;
  onStopReplay: () => void;
  onStepReplay: (path: string[], stepIndex: number) => void;
  onInspectNode: (filename: string) => void;
  onRefreshGraphNeeded: () => void;
}

export function AdvisorSidebar({
  open,
  reasoningContext,
  replayPath,
  replayStep,
  isReplaying,
  onCollapse,
  onExpand,
  onStartReplay,
  onStopReplay,
  onStepReplay,
  onInspectNode,
  onRefreshGraphNeeded,
}: AdvisorSidebarProps) {
  return (
    <aside
      className={`shrink-0 border-l border-border flex flex-col overflow-hidden transition-all duration-200 h-full ${open ? "w-full" : "w-10"}`}
    >
      {open ? (
        <>
          <div className={PANEL_TOOLBAR_CLASS}>
            <div className="flex items-center gap-1.5 min-w-0">
              <SparkleIcon className="h-3 w-3 text-primary shrink-0" />
              <span className="text-[11px] font-bold text-foreground truncate">
                Advisor
              </span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onCollapse}
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
              title="Collapse chat"
            >
              <CaretRightIcon className="h-3 w-3" />
            </Button>
          </div>

          <GroundedChatPanel
            reasoningContext={reasoningContext}
            replayPath={replayPath}
            replayStep={replayStep}
            isReplaying={isReplaying}
            onStartReplay={onStartReplay}
            onStopReplay={onStopReplay}
            onStepReplay={onStepReplay}
            onInspectNode={onInspectNode}
            onRefreshGraphNeeded={onRefreshGraphNeeded}
          />
        </>
      ) : (
        <button
          onClick={onExpand}
          className="flex-1 flex flex-col items-center gap-3 pt-3 pb-4 text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors cursor-pointer"
          title="Expand Knowledge Advisor"
        >
          <CaretRightIcon className="h-4 w-4 shrink-0" />
          <SparkleIcon className="h-4 w-4 shrink-0 text-primary" />
          <span
            className="text-[9px] font-bold tracking-widest uppercase"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            Advisor
          </span>
        </button>
      )}
    </aside>
  );
}
