"use client";

import React, { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Building2,
  Truck,
  Package,
  Target,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Database,
  MousePointerClick,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface KnowledgeNodeData {
  title: string;
  filename: string;
  entityType: string;
  direction: "core" | "incoming" | "outgoing" | "mutual";
  isActiveReplay?: boolean;
  replayStep?: number;
  isSearchActive?: boolean;
  isSearchMatch?: boolean;
}

function getEntityIcon(entityType: string, direction: string, size = "sm") {
  const typeLower = (entityType || "").toLowerCase();
  const cls = size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";

  if (direction === "core") {
    return <Target className={`${cls} text-primary animate-pulse`} />;
  }
  if (
    typeLower.includes("facility") ||
    typeLower.includes("hub") ||
    typeLower.includes("warehouse")
  ) {
    return <Building2 className={cls} />;
  }
  if (
    typeLower.includes("route") ||
    typeLower.includes("transit") ||
    typeLower.includes("path")
  ) {
    return <Truck className={cls} />;
  }
  if (
    typeLower.includes("inventory") ||
    typeLower.includes("fleet") ||
    typeLower.includes("stock")
  ) {
    return <Package className={cls} />;
  }
  if (typeLower.includes("system") || typeLower.includes("database")) {
    return <Database className={cls} />;
  }
  return <FileText className={cls} />;
}

export function KnowledgeNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as KnowledgeNodeData;
  const {
    title,
    filename,
    entityType,
    direction,
    isActiveReplay,
    replayStep,
    isSearchActive,
    isSearchMatch,
  } = nodeData;
  const [hovered, setHovered] = useState(false);

  const isCore = direction === "core";
  const isIncoming = direction === "incoming";
  const isOutgoing = direction === "outgoing";
  const isMutual = direction === "mutual";

  // Search filter styles
  let searchStyles = "";
  if (isSearchActive) {
    if (isSearchMatch) {
      searchStyles =
        "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02] opacity-100 shadow-lg";
    } else {
      searchStyles = "opacity-20 grayscale-[50%]";
    }
  }

  // Refined card styling
  let cardBgBorder =
    "bg-card/90 backdrop-blur-xs border-border/80 text-card-foreground shadow-xs hover:shadow-md";
  let badgeStyles = "bg-muted text-muted-foreground";
  let directionBadge = null;

  if (isCore) {
    cardBgBorder =
      "bg-primary/10 dark:bg-primary/15 border-2 border-primary text-foreground font-semibold shadow-lg ring-4 ring-primary/20";
    badgeStyles = "bg-primary text-primary-foreground font-bold";
    directionBadge = (
      <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-primary">
        <Target className="h-2.5 w-2.5" /> Focus
      </span>
    );
  } else if (isIncoming) {
    cardBgBorder =
      "bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/50 hover:border-emerald-500 text-foreground hover:bg-emerald-500/10 shadow-xs";
    badgeStyles =
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    directionBadge = (
      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        <ArrowDownLeft className="h-2.5 w-2.5" /> Inbound
      </span>
    );
  } else if (isOutgoing) {
    cardBgBorder =
      "bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/50 hover:border-amber-500 text-foreground hover:bg-amber-500/10 shadow-xs";
    badgeStyles =
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    directionBadge = (
      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
        <ArrowUpRight className="h-2.5 w-2.5" /> Outbound
      </span>
    );
  } else if (isMutual) {
    cardBgBorder =
      "bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/50 hover:border-indigo-500 text-foreground hover:bg-indigo-500/10 shadow-xs";
    badgeStyles =
      "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30";
    directionBadge = (
      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
        <ArrowLeftRight className="h-2.5 w-2.5" /> Mutual
      </span>
    );
  }

  return (
    <div
      className={`group relative w-52.5 rounded-lg p-2.5 transition-all duration-150 cursor-pointer ${
        isActiveReplay
          ? "ring-3 ring-amber-400 ring-offset-2 ring-offset-background shadow-[0_0_18px_rgba(251,191,36,0.4)] scale-105"
          : ""
      } ${searchStyles} ${cardBgBorder}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover Inspector Tooltip */}
      {!isCore && hovered && (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-50 w-60 rounded-lg border shadow-xl p-2.5 pointer-events-none bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Tooltip arrow */}
          <div className="absolute -bottom-1.25 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-popover border-r border-b border-border" />

          <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-border">
            <div className="p-1 rounded bg-muted/60">
              {getEntityIcon(entityType, direction, "lg")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-tight line-clamp-2">
                {title || filename}
              </p>
              <Badge
                variant="outline"
                className={`text-[8px] px-1 py-0 mt-0.5 capitalize font-mono ${badgeStyles}`}
              >
                {entityType || "Concept"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-1 mb-1.5 text-[10px] font-mono text-muted-foreground truncate">
            <Info className="h-3 w-3 shrink-0" />
            <span className="truncate">{filename}.md</span>
          </div>

          <div className="text-[10px] font-medium mb-1.5 text-muted-foreground">
            {isIncoming && "↗ Points to active focus concept"}
            {isOutgoing && "↘ Referenced by active focus concept"}
            {isMutual && "↔ Mutually linked with focus concept"}
          </div>

          <div className="flex items-center gap-1 text-[9px] text-muted-foreground/80 border-t border-border/50 pt-1">
            <MousePointerClick className="h-2.5 w-2.5 shrink-0" />
            <span>Click node to shift focus</span>
          </div>
        </div>
      )}

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="w-2! h-2! bg-muted-foreground/60! group-hover:bg-primary! transition-colors border-2 border-background"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="w-2! h-2! bg-muted-foreground/60! group-hover:bg-primary! transition-colors border-2 border-background"
      />

      {/* Card Header: Direction indicator + Entity Tag */}
      <div className="flex items-center justify-between gap-1 mb-1 border-b border-border/40 pb-0.5">
        {directionBadge}
        <span className="text-[8.5px] uppercase font-mono tracking-tight text-muted-foreground font-semibold truncate max-w-20">
          {entityType || "Concept"}
        </span>
      </div>

      {/* Card Content: Icon + Title + Slug */}
      <div className="flex items-start gap-2 pt-0.5">
        <div className="p-1 rounded-md bg-background/80 shadow-2xs border border-border/40 shrink-0 mt-0.5">
          {getEntityIcon(entityType, direction)}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[11px] font-semibold leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {title || filename}
          </h4>
          <span className="text-[9px] font-mono text-muted-foreground/70 truncate block mt-0.5">
            {filename}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="w-2! h-2! bg-muted-foreground/60! group-hover:bg-primary! transition-colors border-2 border-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="w-2! h-2! bg-muted-foreground/60! group-hover:bg-primary! transition-colors border-2 border-background"
      />

      {/* Replay step marker */}
      {isActiveReplay && replayStep !== undefined && (
        <div className="absolute -top-2.5 -right-2.5 h-5 w-5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black flex items-center justify-center shadow-md border-2 border-background z-50">
          {replayStep}
        </div>
      )}
    </div>
  );
}

export const KnowledgeNode = memo(KnowledgeNodeComponent);
