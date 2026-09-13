"use client";

import { Badge } from "@/components/ui/badge";
import { GraphQueryResult } from "../types/knowledge";
import { PANEL_TOOLBAR_CLASS } from "@/lib/layout-classes";
import {
  BookOpenIcon,
  FolderIcon,
  NetworkIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";

export type CenterView = "reader" | "editor" | "graph";

interface CenterViewToolbarProps {
  centerView: CenterView;
  onCenterViewChange: (view: CenterView) => void;
  selectedNode: GraphQueryResult | null;
  totalConnectionsCount: number;
  isDirty?: boolean;
}

export function CenterViewToolbar({
  centerView,
  onCenterViewChange,
  selectedNode,
  totalConnectionsCount,
  isDirty,
}: CenterViewToolbarProps) {
  return (
    <div className={`${PANEL_TOOLBAR_CLASS} min-w-0`}>
      <div className="inline-flex rounded-md border bg-background/80 p-0.5 text-[11px] font-medium shadow-2xs min-w-0 shrink">
        <button
          onClick={() => onCenterViewChange("reader")}
          className={`px-1.5 sm:px-2 py-1 rounded-sm transition-all flex items-center gap-1 ${
            centerView === "reader"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpenIcon className="h-3 w-3 shrink-0" />
          <span className="hidden sm:inline">Brief</span>
        </button>
        <button
          onClick={() => onCenterViewChange("editor")}
          className={`px-1.5 sm:px-2 py-1 rounded-sm transition-all flex items-center gap-1 relative ${
            centerView === "editor"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PencilSimpleIcon className="h-3 w-3 shrink-0" />
          <span className="hidden sm:inline">Edit</span>
          {isDirty && (
            <span
              className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background animate-pulse"
              title="Unsaved changes"
            />
          )}
        </button>
        <button
          onClick={() => onCenterViewChange("graph")}
          className={`px-1.5 sm:px-2 py-1 rounded-sm transition-all flex items-center gap-1 ${
            centerView === "graph"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <NetworkIcon className="h-3 w-3 shrink-0" />
          <span className="hidden sm:inline">Graph</span>
        </button>
      </div>
      <div className="flex items-center gap-1 min-w-0 shrink-0">
        {selectedNode ? (
          <>
            <Badge
              variant="outline"
              className="text-[9px] font-mono bg-muted/60 text-muted-foreground border-border/70 hidden lg:inline-flex items-center gap-0.5 truncate max-w-24 xl:max-w-32 px-1 py-0 h-4"
            >
              <FolderIcon className="h-2.5 w-2.5 text-primary/70 shrink-0" />
              <span className="truncate">{selectedNode.type}</span>
            </Badge>
            <Badge
              variant="outline"
              className="text-[9px] font-mono bg-primary/5 text-primary border-primary/20 px-1 py-0 h-4 shrink-0"
            >
              {totalConnectionsCount}
            </Badge>
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
            Select a concept
          </span>
        )}
      </div>
    </div>
  );
}
