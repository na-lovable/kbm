"use client";

import React from "react";
import { KnowledgeNode } from "@/types/knowledge";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  fileNode?: KnowledgeNode;
}

// ─── Tree Builder ─────────────────────────────────────────────────────────────

/** Builds a recursive hierarchical file tree from flat KnowledgeNode list. */
export function buildFileTree(nodes: KnowledgeNode[]): TreeNode {
  const root: TreeNode = {
    name: "root",
    path: "",
    isFolder: true,
    children: [],
  };

  nodes.forEach((node) => {
    const rawPath = (node.relPath || node.filename).replace(/\\/g, "/");
    const parts = rawPath.split("/").filter(Boolean);

    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      let existingChild = current.children.find((c) => c.name === part);

      if (!existingChild) {
        existingChild = {
          name: part,
          path: currentPath,
          isFolder: !isFile,
          children: [],
          fileNode: isFile ? node : undefined,
        };
        current.children.push(existingChild);
      } else if (isFile) {
        existingChild.fileNode = node;
      }

      current = existingChild;
    }
  });

  // Sort: folders first (alpha), then files (alpha)
  function sortTree(node: TreeNode) {
    node.children.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortTree);
  }

  sortTree(root);
  return root;
}

/** Folders whose children are all files (no nested subfolders). */
export function isLeafFolder(node: TreeNode): boolean {
  if (!node.isFolder || node.children.length === 0) return false;
  return node.children.every((child) => !child.isFolder);
}

/** Default collapsed paths: leaf folders that hold files directly. */
export function collectLeafFolderPaths(node: TreeNode): Set<string> {
  const collapsed = new Set<string>();

  function walk(item: TreeNode) {
    if (!item.isFolder) return;
    if (isLeafFolder(item)) collapsed.add(item.path);
    item.children.forEach(walk);
  }

  walk(node);
  return collapsed;
}

/** Ancestor folder paths leading to a file, for auto-expanding on selection. */
export function getFolderPathsToFile(
  tree: TreeNode,
  filename: string,
): string[] {
  const paths: string[] = [];

  function walk(node: TreeNode, ancestors: string[]): boolean {
    if (!node.isFolder) {
      if (node.fileNode?.filename === filename) {
        paths.push(...ancestors);
        return true;
      }
      return false;
    }

    for (const child of node.children) {
      const nextAncestors = child.isFolder
        ? [...ancestors, child.path]
        : ancestors;
      if (walk(child, nextAncestors)) return true;
    }
    return false;
  }

  for (const child of tree.children) {
    if (walk(child, child.isFolder ? [child.path] : [])) break;
  }

  return paths;
}

// ─── Tree Filter ──────────────────────────────────────────────────────────────

/** Recursively filters the tree by search query (title / description / filename). */
export function filterTree(node: TreeNode, query: string): TreeNode | null {
  const cleanQ = query.toLowerCase().trim();
  if (!cleanQ) return node;

  if (!node.isFolder) {
    const title = node.fileNode?.metadata?.title || node.name;
    const desc = node.fileNode?.metadata?.description || "";
    const filename = node.fileNode?.filename || node.name;
    const isMatch =
      title.toLowerCase().includes(cleanQ) ||
      desc.toLowerCase().includes(cleanQ) ||
      filename.toLowerCase().includes(cleanQ);
    return isMatch ? node : null;
  }

  const filteredChildren = node.children
    .map((child) => filterTree(child, query))
    .filter((child): child is TreeNode => child !== null);

  if (filteredChildren.length > 0) {
    return { ...node, children: filteredChildren };
  }

  return null;
}

// ─── Tree Item View ───────────────────────────────────────────────────────────

interface TreeItemProps {
  item: TreeNode;
  level: number;
  selectedFilename?: string;
  collapsedPaths: Set<string>;
  onToggleCollapse: (path: string) => void;
  onSelectFile: (filename: string) => void;
}

function TreeItemViewInner({
  item,
  level,
  selectedFilename,
  collapsedPaths,
  onToggleCollapse,
  onSelectFile,
}: TreeItemProps) {
  const isCollapsed = collapsedPaths.has(item.path);

  if (item.isFolder) {
    return (
      <div className="space-y-0.5 select-none">
        <button
          onClick={() => onToggleCollapse(item.path)}
          className="w-full text-left py-1.5 pr-2 rounded-md text-xs font-semibold hover:bg-muted/60 transition-colors flex items-center justify-between text-foreground group"
          style={{ paddingLeft: `${Math.max(6, level * 14 + 6)}px` }}
        >
          <div className="flex items-center gap-1.5 truncate">
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-transform" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-transform" />
            )}
            {isCollapsed ? (
              <Folder className="h-3.5 w-3.5 text-amber-500/90 dark:text-amber-400 shrink-0" />
            ) : (
              <FolderOpen className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
            )}
            <span className="font-mono text-xs truncate font-medium">
              {item.name}
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground px-1 rounded bg-muted/60 shrink-0">
            {item.children.length}
          </span>
        </button>

        {!isCollapsed && (
          <div className="border-l border-border/50 ml-3.5 space-y-0.5">
            {item.children.map((child) => (
              <TreeItemView
                key={child.path}
                item={child}
                level={level + 1}
                selectedFilename={selectedFilename}
                collapsedPaths={collapsedPaths}
                onToggleCollapse={onToggleCollapse}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File row
  const isSelected = selectedFilename === item.fileNode?.filename;
  const title = item.fileNode?.metadata?.title || item.name;

  return (
    <button
      onClick={() => item.fileNode && onSelectFile(item.fileNode.filename)}
      className={`w-full text-left py-1.5 pr-2 rounded-md text-xs transition-all flex items-center justify-between gap-1.5 group ${
        isSelected
          ? "bg-primary text-primary-foreground font-bold shadow-xs"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      }`}
      style={{ paddingLeft: `${Math.max(6, level * 14 + 6)}px` }}
    >
      <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
        <FileText
          className={`h-3.5 w-3.5 shrink-0 ${
            isSelected ? "text-primary-foreground" : "text-zinc-500"
          }`}
        />
        <span className="truncate leading-tight">{title}</span>
      </div>
      <code
        className={`text-[9px] font-mono opacity-50 shrink-0 ${
          isSelected ? "text-primary-foreground opacity-90" : ""
        }`}
      >
        .md
      </code>
    </button>
  );
}

export const TreeItemView = React.memo(TreeItemViewInner);
