"use client";

import React, { useState } from "react";
import matter from "gray-matter";
import {
  AlertTriangle,
  FileCode,
  Link2,
  Loader2,
  Merge,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraphQueryResult, KnowledgeNode } from "../types/knowledge";
import {
  handleDeleteOKFAsset,
  handleMergeOKFAssets,
  handleQueryNode,
} from "@/lib/kbm-actions/knowledge-actions";

interface DeleteConceptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: (KnowledgeNode | GraphQueryResult) | null;
  allNodes?: KnowledgeNode[];
  onDeleteSuccess: (
    deletedFilename: string,
    replacementFilename?: string,
  ) => Promise<void> | void;
}

function getMarkdownBody(rawContent: string): string {
  try {
    const content = matter(rawContent).content;
    return content.replace(/^\s*#[^\n]*(\n+|$)/, "").trim();
  } catch {
    return rawContent.replace(/^\s*#[^\n]*(\n+|$)/, "").trim();
  }
}

export function DeleteConceptDialog({
  open,
  onOpenChange,
  node,
  allNodes = [],
  onDeleteSuccess,
}: DeleteConceptDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeReferences, setRemoveReferences] = useState(false);
  const [showMergePicker, setShowMergePicker] = useState(false);
  const [mergeSearch, setMergeSearch] = useState("");
  const [selectedMergeTarget, setSelectedMergeTarget] =
    useState<KnowledgeNode | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  if (!node) return null;

  const incomingConnections =
    "connectedNodes" in node && Array.isArray(node.connectedNodes)
      ? node.connectedNodes
      : [];

  const filteredMergeTargets = allNodes
    .filter((n) => n.filename !== node.filename)
    .filter((n) => {
      const q = mergeSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        n.filename.toLowerCase().includes(q) ||
        n.metadata.title?.toLowerCase().includes(q)
      );
    })
    .slice(0, 8);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await handleDeleteOKFAsset({
        filename: node.filename,
        removeReferences,
      });
      if (res.success) {
        handleOpenChange(false);
        setRemoveReferences(false);
        await onDeleteSuccess(node.filename);
      } else {
        setError(res.message || "Failed to delete concept.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during deletion.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMergeInto = async (targetFilename: string) => {
    setIsMerging(true);
    setError(null);
    try {
      const targetDetails = await handleQueryNode(targetFilename);
      if (!targetDetails) {
        setError("Target concept not found.");
        return;
      }

      const sourceBody = getMarkdownBody(node.rawContent || "");
      const targetBody = getMarkdownBody(targetDetails.rawContent || "");
      const sourceTitle = node.metadata.title || node.filename;
      const mergedBody = `${targetBody}\n\n---\n\n## Merged from ${sourceTitle}\n\n${sourceBody}\n`;
      const targetTags = Array.isArray(targetDetails.metadata.tags)
        ? targetDetails.metadata.tags
        : [];
      const sourceTags = Array.isArray(node.metadata.tags)
        ? node.metadata.tags
        : [];

      const res = await handleMergeOKFAssets({
        sourceFilenames: [node.filename],
        targetFilename,
        type: targetDetails.type,
        title: targetDetails.metadata.title || targetFilename,
        description: targetDetails.metadata.description || "",
        tags: Array.from(new Set([...targetTags, ...sourceTags])),
        markdownBody: mergedBody,
      });

      if (res.success) {
        handleOpenChange(false);
        setShowMergePicker(false);
        setSelectedMergeTarget(null);
        await onDeleteSuccess(node.filename, targetFilename);
      } else {
        setError(res.message || "Merge failed.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during merge.");
    } finally {
      setIsMerging(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setShowMergePicker(false);
      setSelectedMergeTarget(null);
      setMergeSearch("");
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md bg-card border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive font-bold text-base">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            Delete Knowledge Concept
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-xs">
                {node.metadata.title || node.filename}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {node.type}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
              <FileCode className="h-3 w-3 text-muted-foreground shrink-0" />
              <span>{node.relPath || node.filename}.md</span>
            </p>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            This removes the markdown file from disk, logs the decommission in{" "}
            <code className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded">
              log.md
            </code>
            , and rebuilds index files.
          </p>

          {incomingConnections.length > 0 && (
            <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
              <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                <Link2 className="h-3.5 w-3.5" />
                <span>
                  Impact: {incomingConnections.length} incoming reference(s)
                </span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                {incomingConnections.map((conn) => (
                  <div
                    key={conn.filename}
                    className="flex items-center justify-between px-2 py-0.5 rounded bg-background/60 font-mono text-[10px]"
                  >
                    <span className="truncate">
                      {conn.title || conn.filename}
                    </span>
                    <span className="text-muted-foreground opacity-70">
                      {conn.relPath || conn.filename}.md
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-start gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={removeReferences}
              onChange={(e) => setRemoveReferences(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Remove broken links from referencing files after deletion
            </span>
          </label>

          {!showMergePicker && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMergePicker(true)}
              className="w-full text-xs gap-1.5"
            >
              <Merge className="h-3.5 w-3.5" />
              Merge into another concept instead
            </Button>
          )}

          {showMergePicker && (
            <div className="space-y-2 rounded-md border border-border p-2.5">
              <Label className="text-[11px] font-semibold">
                Select merge target
              </Label>
              <Input
                value={mergeSearch}
                onChange={(e) => setMergeSearch(e.target.value)}
                placeholder="Search concepts..."
                className="h-7 text-xs"
              />
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filteredMergeTargets.length === 0 ? (
                  <p className="py-2 text-center text-[11px] text-muted-foreground">
                    No matching concepts found.
                  </p>
                ) : (
                  filteredMergeTargets.map((target) => (
                    <button
                      key={target.filename}
                      type="button"
                      onClick={() => setSelectedMergeTarget(target)}
                      disabled={isMerging}
                      className={`w-full text-left px-2 py-1 rounded-sm text-xs hover:bg-muted/70 flex items-center justify-between cursor-pointer ${
                        selectedMergeTarget?.filename === target.filename
                          ? "bg-primary/10 ring-1 ring-primary/30"
                          : ""
                      }`}
                    >
                      <span className="truncate">
                        {target.metadata.title || target.filename}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] ml-1 shrink-0"
                      >
                        {target.type}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
              {selectedMergeTarget && (
                <div className="space-y-2 rounded-md border border-primary/25 bg-primary/5 p-2 text-xs">
                  <p className="font-semibold text-foreground">Merge preview</p>
                  <p className="text-muted-foreground leading-relaxed">
                    The content and tags from{" "}
                    <strong>{node.metadata.title || node.filename}</strong> will
                    be appended to{" "}
                    <strong>
                      {selectedMergeTarget.metadata.title ||
                        selectedMergeTarget.filename}
                    </strong>
                    . References to the source will be rewritten and the source
                    file will be removed.
                  </p>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleMergeInto(selectedMergeTarget.filename)
                    }
                    disabled={isMerging}
                    className="w-full h-7 text-xs gap-1.5"
                  >
                    {isMerging ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Merge className="h-3.5 w-3.5" />
                    )}
                    {isMerging ? "Merging…" : "Confirm merge"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-2 rounded bg-destructive/10 text-destructive text-xs flex items-center gap-1.5 border border-destructive/20 font-medium">
              <X className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isDeleting || isMerging}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting || isMerging}
              className="text-xs gap-1.5 shadow-sm"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span>{isDeleting ? "Deleting…" : "Confirm Delete"}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
