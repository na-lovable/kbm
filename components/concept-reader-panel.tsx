"use client";

import { useEffect, useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Compass,
  Edit3,
  Folder,
  Layers,
  Network,
} from "lucide-react";
import { ConnectedNodeSummary, GraphQueryResult } from "../types/knowledge";
import { getBreadcrumbSegments } from "@/lib/connection-categories";
import { stripLeadingH1 } from "@/lib/markdown-links";
import { ConceptConnectionsPanel } from "@/components/concept-connections-panel";
import { KnowledgeMarkdown } from "./knowledge-markdown";

interface ConceptReaderPanelProps {
  selectedNode: GraphQueryResult | null;
  isInspecting: boolean;
  mutualNodes: ConnectedNodeSummary[];
  strictOutgoingNodes: ConnectedNodeSummary[];
  strictIncomingNodes: ConnectedNodeSummary[];
  totalConnectionsCount: number;
  onSelectNode: (filename: string) => void;
  onOpenGraph: () => void;
  onOpenEditor?: () => void;
}

export function ConceptReaderPanel({
  selectedNode,
  isInspecting,
  mutualNodes,
  strictOutgoingNodes,
  strictIncomingNodes,
  totalConnectionsCount,
  onSelectNode,
  onOpenGraph,
  onOpenEditor,
}: ConceptReaderPanelProps) {
  const readerScrollTopRef = useRef<HTMLDivElement>(null);
  const readerScrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedNode) return;
    const viewport = readerScrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    ) as HTMLElement | null;
    viewport?.scrollTo({ top: 0 });
  }, [selectedNode?.filename]);

  if (!selectedNode) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-8 text-center">
        <Layers className="h-10 w-10 opacity-20" />
        <div>
          <p className="text-sm font-medium text-foreground">
            No concept selected
          </p>
          <p className="text-xs opacity-60 mt-1">
            Select a concept from the registry to inspect its documentation and
            trace relationships.
          </p>
        </div>
      </div>
    );
  }

  const breadcrumbSegments = getBreadcrumbSegments(selectedNode);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
      <div ref={readerScrollAreaRef} className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div
            ref={readerScrollTopRef}
            className={`px-4 py-4 sm:px-6 md:px-8 max-w-3xl mx-auto w-full space-y-5 pb-16 transition-opacity ${
              isInspecting ? "opacity-70" : "opacity-100"
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap font-mono">
                <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-muted-foreground/70">knowledge-base</span>
                {breadcrumbSegments.map((segment, idx) => (
                  <span key={idx} className="contents">
                    <span className="text-muted-foreground/30 font-sans">
                      /
                    </span>
                    <span className="text-muted-foreground/90 font-medium">
                      {segment}
                    </span>
                  </span>
                ))}
                <span className="text-muted-foreground/30 font-sans">/</span>
                <span className="font-semibold text-foreground">
                  {selectedNode.filename}.md
                </span>
              </div>

              {onOpenEditor && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenEditor}
                  className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                >
                  <Edit3 className="h-3 w-3 text-primary" />
                  <span>Edit File</span>
                </Button>
              )}
            </div>

            <div className="space-y-2 border-b border-border/60 pb-5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {selectedNode.metadata.title || selectedNode.filename}
              </h1>

              <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                <Badge
                  variant="outline"
                  className="capitalize font-mono text-[10px] bg-primary/10 text-primary border-primary/30 flex items-center gap-1"
                >
                  <Folder className="h-3 w-3" />
                  <span>{selectedNode.type}</span>
                </Badge>
                <code className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded border border-border/60">
                  {selectedNode.relPath || selectedNode.filename}.md
                </code>
                {totalConnectionsCount > 0 && (
                  <span className="text-[11px] text-muted-foreground/80 font-mono">
                    · {totalConnectionsCount}{" "}
                    {totalConnectionsCount === 1 ? "connection" : "connections"}
                  </span>
                )}
              </div>

              {selectedNode.metadata.description && (
                <p className="text-sm text-muted-foreground leading-relaxed pt-1.5 italic">
                  {selectedNode.metadata.description}
                </p>
              )}
            </div>

            <ConceptConnectionsPanel
              conceptKey={selectedNode.filename}
              mutualNodes={mutualNodes}
              strictOutgoingNodes={strictOutgoingNodes}
              strictIncomingNodes={strictIncomingNodes}
              onSelectNode={onSelectNode}
            />

            <KnowledgeMarkdown
              content={stripLeadingH1(selectedNode.rawContent)}
              onInternalLink={onSelectNode}
            />

            <div className="pt-8 space-y-6">
              <div className="flex items-center justify-center gap-3 text-muted-foreground/50">
                <div className="h-px bg-border/80 flex-1" />
                <span className="px-3 py-1 rounded-full border border-border/70 bg-muted/30 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/80" />
                  End of Concept Brief
                </span>
                <div className="h-px bg-border/80 flex-1" />
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-primary" />
                    Next in Memory Exploration
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Edit concept source markdown or trace topological relations
                    in graph view.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {onOpenEditor && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onOpenEditor}
                      className="gap-1.5 text-xs font-semibold hover:border-primary cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-primary" />
                      Edit Source
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onOpenGraph}
                    className="gap-1.5 text-xs font-semibold hover:border-primary cursor-pointer"
                  >
                    <Network className="h-3.5 w-3.5 text-primary" />
                    Open in Graph
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      readerScrollTopRef.current?.scrollIntoView({
                        behavior: "smooth",
                      })
                    }
                    className="gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Scroll to top"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                    <span>Top</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
