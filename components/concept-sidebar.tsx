"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Network,
  Plus,
  Search,
  X,
} from "lucide-react";
import { KnowledgeNode } from "@/types/knowledge";
import { PANEL_TOOLBAR_CLASS } from "@/lib/layout-classes";
import {
  buildFileTree,
  collectLeafFolderPaths,
  filterTree,
  getFolderPathsToFile,
  TreeItemView,
} from "@/components/file-tree";

interface ConceptSidebarProps {
  open: boolean;
  nodes: KnowledgeNode[];
  isSyncing: boolean;
  selectedFilename?: string;
  onCollapse: () => void;
  onExpand: () => void;
  onSelectFile: (filename: string) => void;
  onNewConcept?: () => void;
}

export function ConceptSidebar({
  open,
  nodes,
  isSyncing,
  selectedFilename,
  onCollapse,
  onExpand,
  onSelectFile,
  onNewConcept,
}: ConceptSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const fileTree = useMemo(() => buildFileTree(nodes), [nodes]);
  const filteredTree = useMemo(
    () => filterTree(fileTree, deferredSearchQuery),
    [fileTree, deferredSearchQuery],
  );

  const toggleCollapse = (path: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  useEffect(() => {
    if (nodes.length === 0) return;
    setCollapsedPaths(collectLeafFolderPaths(fileTree));
  }, [nodes, fileTree]);

  useEffect(() => {
    if (!selectedFilename || nodes.length === 0) return;
    const expandPaths = getFolderPathsToFile(fileTree, selectedFilename);
    if (expandPaths.length === 0) return;

    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const path of expandPaths) {
        if (next.has(path)) {
          next.delete(path);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedFilename, fileTree, nodes.length]);

  return (
    <aside
      className={`shrink-0 border-r border-border flex flex-col overflow-hidden bg-card/30 transition-all duration-200 h-full ${open ? "w-full" : "w-10"}`}
    >
      {open ? (
        <>
          <div className={PANEL_TOOLBAR_CLASS}>
            <span className="text-[11px] font-bold tracking-tight text-foreground flex items-center gap-1 min-w-0 truncate">
              <BookOpen className="h-3 w-3 text-primary shrink-0" />
              <span className="hidden sm:inline">Concept Registry</span>
              <span className="sm:hidden">Registry</span>
            </span>
            <div className="flex items-center gap-0.5 shrink-0">
              {onNewConcept && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onNewConcept}
                  className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                  title="Create New Concept"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
              {nodes.length > 0 && (
                <Badge
                  variant="secondary"
                  className="font-mono text-[9px] px-1 py-0 h-4"
                >
                  {nodes.length}
                </Badge>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={onCollapse}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm px-2 py-1.5 border-b border-border/40">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search…"
                  className="pl-7 pr-6 h-7 text-[11px]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="p-1.5">
              {nodes.length === 0 && !isSyncing ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <Network className="h-8 w-8 mx-auto opacity-20 mb-2" />
                  <p>No concepts loaded.</p>
                  <p className="opacity-60 mt-1">
                    Click &quot;Sync Knowledge Base&quot; to initialize.
                  </p>
                </div>
              ) : !filteredTree || filteredTree.children.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No matching concepts found.
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredTree.children.map((child) => (
                    <TreeItemView
                      key={child.path}
                      item={child}
                      level={0}
                      selectedFilename={selectedFilename}
                      collapsedPaths={collapsedPaths}
                      onToggleCollapse={toggleCollapse}
                      onSelectFile={onSelectFile}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      ) : (
        <button
          onClick={onExpand}
          className="flex-1 flex flex-col items-center gap-3 pt-3 text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4 shrink-0" />
          <BookOpen className="h-4 w-4 shrink-0 text-primary" />
          <span
            className="text-[9px] font-bold tracking-widest uppercase"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            Concepts
          </span>
        </button>
      )}
    </aside>
  );
}
