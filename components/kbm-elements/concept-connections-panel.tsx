"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ConnectedNodeSummary } from "@/types/knowledge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronRight,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ConnectionTabId = "mutual" | "out" | "in";

interface ConnectionTab {
  id: ConnectionTabId;
  label: string;
  nodes: ConnectedNodeSummary[];
  chipClassName: string;
  icon: React.ComponentType<{ className?: string }>;
  titlePrefix: string;
}

interface ConceptConnectionsPanelProps {
  conceptKey: string;
  mutualNodes: ConnectedNodeSummary[];
  strictOutgoingNodes: ConnectedNodeSummary[];
  strictIncomingNodes: ConnectedNodeSummary[];
  onSelectNode: (filename: string) => void;
}

function ConnectionChip({
  node,
  tab,
  onSelect,
}: {
  node: ConnectedNodeSummary;
  tab: ConnectionTab;
  onSelect: (filename: string) => void;
}) {
  const Icon = tab.icon;

  return (
    <button
      onClick={() => onSelect(node.filename)}
      className={cn(
        "group inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all shadow-2xs font-medium cursor-pointer",
        tab.chipClassName,
      )}
      title={`${tab.titlePrefix} ${node.title || node.filename}`}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-70 group-hover:opacity-100" />
      <span className={tab.id === "mutual" ? "font-semibold" : undefined}>
        {node.title || node.filename}
      </span>
      <span className="text-[9px] uppercase tracking-wider font-mono opacity-60 group-hover:opacity-100">
        {node.type}
      </span>
    </button>
  );
}

function ConceptConnectionsPanelInner({
  conceptKey,
  mutualNodes,
  strictOutgoingNodes,
  strictIncomingNodes,
  onSelectNode,
}: ConceptConnectionsPanelProps) {
  const [open, setOpen] = useState(false);

  const tabs = useMemo<ConnectionTab[]>(
    () =>
      [
        {
          id: "mutual" as const,
          label: "Mutual Links",
          nodes: mutualNodes,
          icon: ArrowLeftRight,
          titlePrefix: "Mutual connection with",
          chipClassName:
            "bg-primary/10 text-primary border-primary/25 hover:bg-primary/20 hover:border-primary/50",
        },
        {
          id: "out" as const,
          label: "References Out",
          nodes: strictOutgoingNodes,
          icon: ArrowUpRight,
          titlePrefix: "Points to",
          chipClassName:
            "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25 hover:bg-amber-500/20 hover:border-amber-500/50",
        },
        {
          id: "in" as const,
          label: "Referenced By",
          nodes: strictIncomingNodes,
          icon: ArrowDownLeft,
          titlePrefix: "Referenced by",
          chipClassName:
            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20 hover:border-emerald-500/50",
        },
      ].filter((tab) => tab.nodes.length > 0),
    [mutualNodes, strictOutgoingNodes, strictIncomingNodes],
  );

  const defaultTab = tabs[0]?.id ?? "mutual";
  const totalCount = tabs.reduce((sum, tab) => sum + tab.nodes.length, 0);

  useEffect(() => {
    setOpen(false);
  }, [conceptKey]);

  if (totalCount === 0) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs shadow-2xs"
    >
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3.5 py-3 text-left transition-colors hover:bg-muted/30 rounded-xl cursor-pointer">
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground min-w-0">
          <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Concept Connections</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {tabs.map((tab) => (
            <Badge
              key={tab.id}
              variant="outline"
              className="text-[9px] font-mono px-1.5 py-0 hidden sm:inline-flex"
            >
              {tab.nodes.length}{" "}
              {tab.id === "mutual" ? "mutual" : tab.id === "out" ? "out" : "in"}
            </Badge>
          ))}
          <Badge
            variant="secondary"
            className="text-[10px] font-mono px-1.5 py-0"
          >
            {totalCount}
          </Badge>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-border/60 px-3.5 pb-3.5 pt-2.5">
        <Tabs key={`${conceptKey}-${defaultTab}`} defaultValue={defaultTab}>
          <TabsList
            variant="line"
            className="w-full justify-start gap-0.5 mb-2.5"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="gap-1 px-2 py-1 text-[11px]"
                >
                  <Icon className="h-3 w-3" />
                  <span>{tab.label}</span>
                  <span className="text-[9px] font-mono opacity-60">
                    ({tab.nodes.length})
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              <div className="flex flex-wrap gap-1.5">
                {tab.nodes.map((node) => (
                  <ConnectionChip
                    key={`${tab.id}-${node.filename}`}
                    node={node}
                    tab={tab}
                    onSelect={onSelectNode}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
        <p className="text-[10px] text-muted-foreground font-mono mt-2.5">
          Click a concept to inspect
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const ConceptConnectionsPanel = React.memo(ConceptConnectionsPanelInner);
