"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import matter from "gray-matter";
import {
  AlertCircle,
  AlertTriangle,
  Bold,
  Check,
  Code,
  Code2,
  Columns,
  Eye,
  FileCode,
  FileEdit,
  FolderTree,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Plus,
  Quote,
  RotateCcw,
  Save,
  Search,
  Sliders,
  Sparkles,
  Table,
  Tag,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  GraphQueryResult,
  KnowledgeNode,
  SaveOKFResult,
} from "../types/knowledge";
import {
  handleSaveOKFAsset,
  handleSaveRawOKFFile,
} from "@/lib/kbm-actions/knowledge-actions";
import { stripLeadingH1 } from "@/lib/markdown-links";
import { ConceptTemplate } from "@/lib/concept-templates";
import {
  clearDraft,
  ConceptDraft,
  loadDraft,
  saveDraft,
} from "@/lib/draft-storage";
import { DeleteConceptDialog } from "@/components/delete-concept-dialog";
import { DraftRecoveryDialog } from "@/components/draft-recovery-dialog";
import { KnowledgeMarkdown } from "./knowledge-markdown";

export const CANONICAL_TYPES = [
  "Facility",
  "Hub",
  "Charging",
  "Avionics",
  "FlightControl",
  "Navigation",
  "Safety",
  "Protocol",
  "Regulation",
  "Operation",
  "Fleet",
  "UAV",
  "HeavyLift",
  "Power",
  "EnergyStorage",
  "Propulsion",
];

export const CANONICAL_NAMESPACE_FOLDERS: Record<string, string> = {
  Facility: "facilities",
  Hub: "facilities/hubs",
  Charging: "facilities/charging",
  Avionics: "avionics",
  FlightControl: "avionics/flight-control",
  Navigation: "avionics/navigation",
  Safety: "safety",
  Protocol: "safety/protocols",
  Regulation: "safety/regulations",
  Operation: "operations",
  Fleet: "fleet",
  UAV: "fleet/urban-courier",
  HeavyLift: "fleet/heavy-lift",
  Power: "power",
  EnergyStorage: "power/energy-storage",
  Propulsion: "power/propulsion",
};

export function getEstimatedNamespace(type: string, relPath?: string): string {
  if (relPath) {
    const parts = relPath.split("/");
    if (parts.length > 1) {
      return parts.slice(0, -1).join("/");
    }
  }
  return (
    CANONICAL_NAMESPACE_FOLDERS[type] ||
    type.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "s"
  );
}

type EditorMode = "form" | "raw";
type PreviewMode = "editor" | "split" | "preview";

interface ConceptEditorPanelProps {
  selectedNode: GraphQueryResult | null;
  allNodes: KnowledgeNode[];
  isCreatingNew?: boolean;
  initialTemplate?: ConceptTemplate | null;
  onSaveSuccess: (savedFilename: string) => Promise<void> | void;
  onDeleteSuccess?: (
    deletedFilename: string,
    replacementFilename?: string,
  ) => Promise<void> | void;
  onCancelCreate?: () => void;
  onIsDirtyChange?: (isDirty: boolean) => void;
  onSaveRequest?: (save: () => Promise<boolean>) => void;
  onDiscardDraftRequest?: (discard: () => void) => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export function ConceptEditorPanel({
  selectedNode,
  allNodes,
  isCreatingNew = false,
  initialTemplate = null,
  onSaveSuccess,
  onDeleteSuccess,
  onCancelCreate,
  onIsDirtyChange,
  onSaveRequest,
  onDiscardDraftRequest,
  isZenMode = false,
  onToggleZenMode,
}: ConceptEditorPanelProps) {
  // Mode States
  const [editorMode, setEditorMode] = useState<EditorMode>("form");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("split");

  // Form Fields State
  const [filename, setFilename] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Facility");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [markdownBody, setMarkdownBody] = useState("");

  // Raw Content State
  const [rawContent, setRawContent] = useState("");
  const [rawParseError, setRawParseError] = useState<string | null>(null);

  // Operation States
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "idle" | "success" | "error";
    message?: string;
  }>({ type: "idle" });

  // Dialog States
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ConceptDraft | null>(null);
  const [isDraftReady, setIsDraftReady] = useState(false);

  // Link Inserter State
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);

  // Inline Autocomplete State ([[ or @ trigger)
  const [inlineSearchQuery, setInlineSearchQuery] = useState<string | null>(
    null,
  );
  const [inlineTriggerIndex, setInlineTriggerIndex] = useState<number>(-1);
  const [inlineActiveIndex, setInlineActiveIndex] = useState<number>(0);

  // References for textarea cursor tracking
  const markdownTextareaRef = useRef<HTMLTextAreaElement>(null);
  const rawTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Extract all existing tags across repository for smart auto-completion
  const existingTagsPool = useMemo(() => {
    const pool = new Set<string>();
    allNodes.forEach((n) => {
      if (Array.isArray(n.metadata.tags)) {
        n.metadata.tags.forEach((t) => pool.add(t.toLowerCase().trim()));
      }
    });
    return Array.from(pool).sort();
  }, [allNodes]);

  // Initial State Snapshot for Dirty Check
  const initialSnapshot = useMemo(() => {
    if (isCreatingNew || !selectedNode) {
      if (initialTemplate) {
        return {
          filename: initialTemplate.slugPlaceholder || "new-concept",
          title: initialTemplate.titlePlaceholder || initialTemplate.name,
          type: initialTemplate.type || "Facility",
          description: initialTemplate.description || "",
          tags: initialTemplate.defaultTags || [],
          markdownBody: stripLeadingH1(initialTemplate.bodyTemplate),
          rawContent: matter.stringify(
            `# ${initialTemplate.titlePlaceholder || initialTemplate.name}\n\n${stripLeadingH1(initialTemplate.bodyTemplate)}\n`,
            {
              type: initialTemplate.type,
              title: initialTemplate.titlePlaceholder || initialTemplate.name,
              description: initialTemplate.description,
              tags: initialTemplate.defaultTags,
            },
          ),
        };
      }

      return {
        filename: "",
        title: "",
        type: "Facility",
        description: "",
        tags: [],
        markdownBody: `## 1. Overview\n\nProvide the architectural overview and specifications here.\n\n## 2. Interconnections\n\n- Connects to [Central Operational Registry Map](./index.md)\n`,
        rawContent: `---\ntype: Facility\ntitle: New Concept\ndescription: Summary overview of the concept.\ntags: []\n---\n# New Concept\n\n## 1. Overview\n\nProvide the architectural overview and specifications here.\n`,
      };
    }

    const currentTags = Array.isArray(selectedNode.metadata.tags)
      ? selectedNode.metadata.tags
      : [];

    const nodeTitle = selectedNode.metadata.title || selectedNode.filename;
    const cleanBody = stripLeadingH1(selectedNode.rawContent || "");

    const builtRaw = matter.stringify(
      `# ${nodeTitle}\n\n${cleanBody}\n`,
      {
        type: selectedNode.type || "Asset",
        title: nodeTitle,
        description: selectedNode.metadata.description || "",
        tags: currentTags,
      },
    );

    return {
      filename: selectedNode.filename,
      title: nodeTitle,
      type: selectedNode.type || "Facility",
      description: selectedNode.metadata.description || "",
      tags: currentTags,
      markdownBody: cleanBody,
      rawContent: builtRaw,
    };
  }, [selectedNode, isCreatingNew, initialTemplate]);

  const draftSourceKey = useMemo(
    () =>
      isCreatingNew
        ? `new:${initialTemplate?.id || "blank"}`
        : selectedNode?.filename || "new:blank",
    [initialTemplate?.id, isCreatingNew, selectedNode?.filename],
  );

  // Reset form when active node or template changes
  useEffect(() => {
    setIsDraftReady(false);
    setFilename(initialSnapshot.filename);
    setTitle(initialSnapshot.title);
    setType(initialSnapshot.type);
    setDescription(initialSnapshot.description);
    setTags(initialSnapshot.tags);
    setMarkdownBody(initialSnapshot.markdownBody);
    setRawContent(initialSnapshot.rawContent);
    setSaveStatus({ type: "idle" });
    setRawParseError(null);
    setInlineSearchQuery(null);
    setPendingDraft(loadDraft(draftSourceKey));
    setIsDraftReady(true);
  }, [draftSourceKey, initialSnapshot]);

  // Calculate if current draft is dirty
  const isDirty = useMemo(() => {
    if (editorMode === "form") {
      const tagsChanged =
        tags.length !== initialSnapshot.tags.length ||
        tags.some((t, i) => t !== initialSnapshot.tags[i]);
      return (
        filename !== initialSnapshot.filename ||
        title !== initialSnapshot.title ||
        type !== initialSnapshot.type ||
        description !== initialSnapshot.description ||
        markdownBody !== initialSnapshot.markdownBody ||
        tagsChanged
      );
    } else {
      return rawContent !== initialSnapshot.rawContent;
    }
  }, [
    editorMode,
    filename,
    title,
    type,
    description,
    tags,
    markdownBody,
    rawContent,
    initialSnapshot,
  ]);

  useEffect(() => {
    onIsDirtyChange?.(isDirty);
  }, [isDirty, onIsDirtyChange]);

  useEffect(() => {
    if (!isDraftReady || !isDirty || pendingDraft) return;

    const timeoutId = window.setTimeout(() => {
      saveDraft(draftSourceKey, {
        filename,
        title,
        type,
        description,
        tags,
        markdownBody,
        rawContent,
        editorMode,
      });
    }, 750);

    return () => window.clearTimeout(timeoutId);
  }, [
    description,
    draftSourceKey,
    editorMode,
    filename,
    isDirty,
    isDraftReady,
    markdownBody,
    pendingDraft,
    rawContent,
    tags,
    title,
    type,
  ]);

  const discardDraft = useCallback(() => {
    clearDraft(draftSourceKey);
    setPendingDraft(null);
  }, [draftSourceKey]);

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) return;
    setFilename(pendingDraft.filename);
    setTitle(pendingDraft.title);
    setType(pendingDraft.type);
    setDescription(pendingDraft.description);
    setTags(pendingDraft.tags);
    setMarkdownBody(pendingDraft.markdownBody);
    setRawContent(pendingDraft.rawContent);
    setEditorMode(pendingDraft.editorMode);
    setPendingDraft(null);
  }, [pendingDraft]);

  // Switch between Form and Raw mode with bidirectional data sync
  const handleSwitchMode = useCallback(
    (newMode: EditorMode) => {
      if (newMode === "raw" && editorMode === "form") {
        // Sync Form -> Raw
        const cleanBody = stripLeadingH1(markdownBody);
        const stringified = matter.stringify(
          `# ${title || "Untitled Concept"}\n\n${cleanBody}\n`,
          {
            type,
            title,
            description,
            tags,
          },
        );
        setRawContent(stringified);
        setRawParseError(null);
      } else if (newMode === "form" && editorMode === "raw") {
        // Sync Raw -> Form
        try {
          const parsed = matter(rawContent);
          const data = parsed.data || {};
          if (data.title) setTitle(data.title);
          if (data.type) setType(data.type);
          if (data.description) setDescription(data.description);
          if (Array.isArray(data.tags)) setTags(data.tags);

          const cleanBody = stripLeadingH1(parsed.content || "");
          setMarkdownBody(cleanBody);
          setRawParseError(null);
        } catch (err: any) {
          setRawParseError(err.message || "Failed to parse YAML frontmatter");
          return; // Don't switch if broken
        }
      }
      setEditorMode(newMode);
    },
    [editorMode, title, markdownBody, type, description, tags, rawContent],
  );

  // Validate Raw Content on keystroke
  const handleRawChange = (value: string) => {
    setRawContent(value);
    try {
      matter(value);
      setRawParseError(null);
    } catch (err: any) {
      setRawParseError(err.message || "Invalid YAML frontmatter");
    }
  };

  // Tag Management
  const handleAddTag = (tagToAdd?: string) => {
    const candidate = (tagToAdd || tagInput).trim().toLowerCase();
    if (!candidate) return;
    if (!tags.includes(candidate)) {
      setTags([...tags, candidate]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Filtered Tag Suggestions based on tagInput
  const tagSuggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    if (!q) return [];
    return existingTagsPool
      .filter((t) => t.includes(q) && !tags.includes(t))
      .slice(0, 6);
  }, [existingTagsPool, tagInput, tags]);

  // Quick Format Helper for Markdown Editor
  const insertFormatting = (
    prefix: string,
    suffix: string = "",
    defaultText: string = "",
  ) => {
    const textarea =
      editorMode === "form"
        ? markdownTextareaRef.current
        : rawTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;

    const updated =
      text.substring(0, start) + replacement + text.substring(end);

    if (editorMode === "form") {
      setMarkdownBody(updated);
    } else {
      handleRawChange(updated);
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length,
      );
    }, 0);
  };

  // Snippet Inserters
  const insertTableSnippet = () => {
    insertFormatting(
      `\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Data A | Data B | Data C |\n| Data D | Data E | Data F |\n\n`,
      "",
      "",
    );
  };

  const insertDiagramSnippet = (
    type: "flowchart" | "sequence" | "stateDiagram",
  ) => {
    if (type === "flowchart") {
      insertFormatting(
        `\n\`\`\`mermaid\ngraph TD\n  A[Start Task] --> B{Condition Check}\n  B -- Yes --> C[Execute Flight Action]\n  B -- No --> D[Trigger Failsafe]\n\`\`\`\n\n`,
        "",
        "",
      );
    } else if (type === "sequence") {
      insertFormatting(
        `\n\`\`\`mermaid\nsequenceDiagram\n  autonumber\n  participant UAV as Logistics Drone\n  participant Hub as Ground Vertiport\n  UAV->>Hub: Request Landing Clearance\n  Hub-->>UAV: Assigned Bay #2 (Conditioned Pack Ready)\n\`\`\`\n\n`,
        "",
        "",
      );
    } else {
      insertFormatting(
        `\n\`\`\`mermaid\nstateDiagram-v2\n  [*] --> Idle\n  Idle --> Armed: Remote Pre-Flight OK\n  Armed --> InFlight: Takeoff Thrust Verified\n  InFlight --> Landed: Touchdown Latched\n  Landed --> [*]\n\`\`\`\n\n`,
        "",
        "",
      );
    }
  };

  const insertCalloutSnippet = (
    alertType: "NOTE" | "IMPORTANT" | "WARNING",
  ) => {
    insertFormatting(
      `\n> [!${alertType}]\n> Specify critical operational notes or safety guidelines here.\n\n`,
      "",
      "",
    );
  };

  // Concept Cross-Link Insertion
  const handleInsertConceptLink = (node: KnowledgeNode) => {
    const nodeTitle = node.metadata.title || node.filename;
    const linkPath = node.relPath
      ? `./${node.relPath}.md`
      : `./${node.filename}.md`;
    const linkMarkdown = `[${nodeTitle}](${linkPath})`;

    const textarea =
      editorMode === "form"
        ? markdownTextareaRef.current
        : rawTextareaRef.current;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;

      let replaceStart = start;
      let replaceEnd = end;

      // Check if this was an inline [[ or @ replacement
      if (inlineTriggerIndex >= 0 && inlineTriggerIndex <= start) {
        replaceStart = inlineTriggerIndex;
        replaceEnd = start;
      }

      const updated =
        text.substring(0, replaceStart) +
        linkMarkdown +
        text.substring(replaceEnd);

      if (editorMode === "form") {
        setMarkdownBody(updated);
      } else {
        handleRawChange(updated);
      }

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          replaceStart + linkMarkdown.length,
          replaceStart + linkMarkdown.length,
        );
      }, 0);
    } else {
      if (editorMode === "form") {
        setMarkdownBody((prev) => `${prev}\n- Cross-reference: ${linkMarkdown}`);
      } else {
        setRawContent((prev) => `${prev}\n- Cross-reference: ${linkMarkdown}`);
      }
    }

    setLinkPopoverOpen(false);
    setLinkSearchQuery("");
    setInlineSearchQuery(null);
    setInlineTriggerIndex(-1);
  };

  // Filter nodes for the link inserter
  const filteredNodesForLink = useMemo(() => {
    const q = (inlineSearchQuery !== null
      ? inlineSearchQuery
      : linkSearchQuery
    )
      .trim()
      .toLowerCase();

    return allNodes
      .filter((n) => n.filename !== "index" && !n.relPath?.endsWith("/index"))
      .filter(
        (n) =>
          !q ||
          n.filename.toLowerCase().includes(q) ||
          n.metadata.title?.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [allNodes, linkSearchQuery, inlineSearchQuery]);

  // Handle Inline Typing for [[ and @ triggers
  const handleTextareaKeyUp = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    const textarea = e.currentTarget;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);

    const doubleBracketIndex = textBeforeCursor.lastIndexOf("[[");
    const atIndex = textBeforeCursor.lastIndexOf("@");

    const activeTrigger = Math.max(doubleBracketIndex, atIndex);

    if (activeTrigger >= 0) {
      const triggerLength = activeTrigger === doubleBracketIndex ? 2 : 1;
      const query = textBeforeCursor.substring(activeTrigger + triggerLength);

      // Trigger only if query contains no newline and is reasonable length
      if (!query.includes("\n") && query.length <= 30) {
        setInlineSearchQuery(query);
        setInlineTriggerIndex(activeTrigger);
        setInlineActiveIndex(0);
        return;
      }
    }

    setInlineSearchQuery(null);
    setInlineTriggerIndex(-1);
  };

  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (inlineSearchQuery !== null && filteredNodesForLink.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setInlineActiveIndex((prev) =>
          prev < filteredNodesForLink.length - 1 ? prev + 1 : 0,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setInlineActiveIndex((prev) =>
          prev > 0 ? prev - 1 : filteredNodesForLink.length - 1,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = filteredNodesForLink[inlineActiveIndex];
        if (selected) {
          handleInsertConceptLink(selected);
        }
        return;
      }
      if (e.key === "Escape") {
        setInlineSearchQuery(null);
        setInlineTriggerIndex(-1);
        return;
      }
    }
  };

  // Save Execution
  const handleSave = useCallback(async (): Promise<boolean> => {
    const targetSlug = filename
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    if (!targetSlug) {
      setSaveStatus({
        type: "error",
        message: "Filename / Slug is required.",
      });
      return false;
    }

    setIsSaving(true);
    setSaveStatus({ type: "idle" });

    try {
      let result: SaveOKFResult;

      if (editorMode === "form") {
        const cleanBody = stripLeadingH1(markdownBody);
        result = await handleSaveOKFAsset({
          filename: targetSlug,
          type: type.trim() || "Asset",
          title: title.trim() || targetSlug,
          description: description.trim(),
          tags,
          markdownBody: cleanBody,
        });
      } else {
        if (rawParseError) {
          throw new Error("Please resolve YAML syntax errors before saving.");
        }
        result = await handleSaveRawOKFFile({
          filename: targetSlug,
          rawContent,
          relPath: selectedNode?.relPath,
        });
      }

      if (result.success) {
        setSaveStatus({
          type: "success",
          message: result.message || "Asset saved successfully!",
        });
        await onSaveSuccess(result.filename);
        clearDraft(draftSourceKey);
        setPendingDraft(null);
        return true;
      } else {
        setSaveStatus({
          type: "error",
          message: result.message || "Failed to save asset.",
        });
        return false;
      }
    } catch (err: any) {
      setSaveStatus({
        type: "error",
        message: err.message || "An unexpected error occurred during save.",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    filename,
    editorMode,
    type,
    title,
    description,
    tags,
    markdownBody,
    rawParseError,
    rawContent,
    selectedNode?.relPath,
    onSaveSuccess,
    draftSourceKey,
  ]);

  useEffect(() => {
    onSaveRequest?.(handleSave);
  }, [handleSave, onSaveRequest]);

  useEffect(() => {
    onDiscardDraftRequest?.(discardDraft);
  }, [discardDraft, onDiscardDraftRequest]);

  // Keyboard shortcut listener (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  // Revert changes back to initial state
  const handleRevert = () => {
    setFilename(initialSnapshot.filename);
    setTitle(initialSnapshot.title);
    setType(initialSnapshot.type);
    setDescription(initialSnapshot.description);
    setTags(initialSnapshot.tags);
    setMarkdownBody(initialSnapshot.markdownBody);
    setRawContent(initialSnapshot.rawContent);
    setSaveStatus({ type: "idle" });
    setRawParseError(null);
    discardDraft();
  };

  // Active Markdown Content for Live Preview
  const previewMarkdown = useMemo(() => {
    if (editorMode === "form") {
      return stripLeadingH1(markdownBody);
    } else {
      try {
        const parsed = matter(rawContent);
        return stripLeadingH1(parsed.content || rawContent);
      } catch {
        return stripLeadingH1(rawContent);
      }
    }
  }, [editorMode, markdownBody, rawContent]);

  // Estimated physical filesystem path
  const estimatedNamespace = useMemo(() => {
    return getEstimatedNamespace(type, selectedNode?.relPath);
  }, [type, selectedNode?.relPath]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-background/50 relative">
      <DraftRecoveryDialog
        draft={pendingDraft}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
      />
      {/* Delete Confirmation Modal */}
      {selectedNode && (
        <DeleteConceptDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          node={selectedNode}
          allNodes={allNodes}
          onDeleteSuccess={async (deletedSlug, replacementFilename) => {
            await onDeleteSuccess?.(deletedSlug, replacementFilename);
          }}
        />
      )}

      {/* Inline [[ and @ Autocomplete Popup */}
      {inlineSearchQuery !== null && (
        <div className="absolute left-8 bottom-16 z-50 w-72 p-2 rounded-lg bg-card border border-primary/40 shadow-2xl space-y-1.5 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between px-1 pb-1 border-b border-border text-[10px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1 text-primary font-semibold">
              <Link2 className="h-3 w-3" />
              Link Concept
            </span>
            <span>Use ↑↓ & Enter</span>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {filteredNodesForLink.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-2">
                No matching concepts found
              </p>
            ) : (
              filteredNodesForLink.map((node, idx) => (
                <button
                  key={node.filename}
                  type="button"
                  onClick={() => handleInsertConceptLink(node)}
                  className={`w-full text-left px-2 py-1 rounded-sm text-xs flex items-center justify-between transition-colors ${
                    idx === inlineActiveIndex
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px]">
                      {node.metadata.title || node.filename}
                    </p>
                    <p
                      className={`text-[9px] font-mono truncate ${
                        idx === inlineActiveIndex
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {node.relPath || node.filename}.md
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[8px] px-1 py-0 h-3.5 ml-1 shrink-0 ${
                      idx === inlineActiveIndex
                        ? "border-primary-foreground/30 text-primary-foreground"
                        : "border-primary/20 text-primary"
                    }`}
                  >
                    {node.type}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Editor Main Sub-Toolbar */}
      <div className="border-b border-border/70 bg-card/40 px-3 py-1.5 flex items-center justify-between gap-2 flex-wrap shrink-0">
        {/* Left Side: Mode & Layout Toggles */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher: Form vs Raw */}
          <div className="inline-flex rounded-md border border-border/70 bg-background/80 p-0.5 text-[11px] font-medium shadow-2xs">
            <button
              onClick={() => handleSwitchMode("form")}
              className={`px-2 py-0.5 rounded-xs transition-all flex items-center gap-1 cursor-pointer ${
                editorMode === "form"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sliders className="h-2.5 w-2.5" />
              <span>Form Mode</span>
            </button>
            <button
              onClick={() => handleSwitchMode("raw")}
              className={`px-2 py-0.5 rounded-xs transition-all flex items-center gap-1 cursor-pointer ${
                editorMode === "raw"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileCode className="h-2.5 w-2.5" />
              <span>Raw Markdown</span>
            </button>
          </div>

          {/* Preview Layout Switcher */}
          <div className="hidden sm:inline-flex rounded-md border border-border/70 bg-background/80 p-0.5 text-[11px] font-medium shadow-2xs">
            <button
              onClick={() => setPreviewMode("editor")}
              title="Editor only"
              className={`px-1.5 py-0.5 rounded-xs transition-all cursor-pointer ${
                previewMode === "editor"
                  ? "bg-muted text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileEdit className="h-3 w-3" />
            </button>
            <button
              onClick={() => setPreviewMode("split")}
              title="Split side-by-side preview"
              className={`px-1.5 py-0.5 rounded-xs transition-all cursor-pointer ${
                previewMode === "split"
                  ? "bg-muted text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Columns className="h-3 w-3" />
            </button>
            <button
              onClick={() => setPreviewMode("preview")}
              title="Preview only"
              className={`px-1.5 py-0.5 rounded-xs transition-all cursor-pointer ${
                previewMode === "preview"
                  ? "bg-muted text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Right Side: Quick Inserters, Actions & Save */}
        <div className="flex items-center gap-1.5">
          {/* Quick Concept Link Inserter */}
          <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-7 text-xs gap-1 px-2 border-border/70 bg-background/80 cursor-pointer",
              )}
            >
              <Link2 className="h-3 w-3 text-primary" />
              <span className="hidden md:inline">Link Concept</span>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-72 p-2 bg-card border-border shadow-lg"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 border-b border-border pb-1.5 px-1">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    placeholder="Search concepts to cross-link..."
                    value={linkSearchQuery}
                    onChange={(e) => setLinkSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredNodesForLink.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center py-2">
                      No concepts found
                    </p>
                  ) : (
                    filteredNodesForLink.map((node) => (
                      <button
                        key={node.filename}
                        type="button"
                        onClick={() => handleInsertConceptLink(node)}
                        className="w-full text-left px-2 py-1 rounded-sm text-xs hover:bg-muted/70 flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate text-[11px]">
                            {node.metadata.title || node.filename}
                          </p>
                          <p className="text-[9px] text-muted-foreground font-mono truncate">
                            {node.relPath || node.filename}.md
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-3.5 ml-1 text-primary/80 border-primary/20 shrink-0"
                        >
                          {node.type}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Revert Button (Only if dirty) */}
          {isDirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRevert}
              className="h-7 text-xs gap-1 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Discard draft changes"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="hidden lg:inline">Revert</span>
            </Button>
          )}

          {/* Zen / Fullscreen Toggle */}
          {onToggleZenMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleZenMode}
              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              title={isZenMode ? "Exit Zen Mode" : "Zen / Fullscreen Mode"}
            >
              {isZenMode ? (
                <Minimize2 className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
          )}

          {/* Delete Concept Button (Only for existing concepts) */}
          {!isCreatingNew && selectedNode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              title="Delete Concept"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Cancel New Button */}
          {isCreatingNew && onCancelCreate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelCreate}
              className="h-7 text-xs px-2 text-muted-foreground cursor-pointer"
            >
              Cancel
            </Button>
          )}

          {/* Primary Save Button */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={
              isSaving || (editorMode === "raw" && Boolean(rawParseError))
            }
            className="h-7 text-xs gap-1 px-3 shadow-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90 cursor-pointer"
          >
            <Save className={`h-3 w-3 ${isSaving ? "animate-spin" : ""}`} />
            <span>{isSaving ? "Saving…" : "Save"}</span>
            <kbd className="hidden xl:inline text-[9px] opacity-70 bg-primary-foreground/20 px-1 rounded-xs font-mono ml-0.5">
              ⌘S
            </kbd>
          </Button>
        </div>
      </div>

      {/* Save Status Notification Banner */}
      {saveStatus.type !== "idle" && saveStatus.message && (
        <div
          className={`px-4 py-1.5 text-xs flex items-center justify-between border-b ${
            saveStatus.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {saveStatus.type === "success" ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="font-medium">{saveStatus.message}</span>
          </div>
          <button
            onClick={() => setSaveStatus({ type: "idle" })}
            className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Raw Parse Error Banner */}
      {editorMode === "raw" && rawParseError && (
        <div className="px-4 py-1.5 text-xs flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-b border-amber-500/20">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="font-mono text-[11px] truncate">
            {rawParseError}
          </span>
        </div>
      )}

      {/* Main Workspace Area (Split or Full) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Editor Column */}
        {previewMode !== "preview" && (
          <div
            className={`flex flex-col min-h-0 overflow-hidden ${
              previewMode === "split"
                ? "w-full md:w-1/2 border-r border-border/70"
                : "w-full"
            }`}
          >
            {editorMode === "form" ? (
              /* FORM MODE */
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 sm:p-5 space-y-4 max-w-2xl mx-auto w-full">
                  {/* Slug / Filename & Live Path Preview */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="node-slug"
                        className="text-xs font-semibold text-foreground flex items-center gap-1"
                      >
                        <span>File Slug / ID</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                        <FolderTree className="h-3 w-3 text-primary/70" />
                        <span>knowledge-base/{estimatedNamespace}/</span>
                        <span className="font-bold text-foreground">
                          {filename ? `${filename}.md` : "untitled.md"}
                        </span>
                      </div>
                    </div>
                    <Input
                      id="node-slug"
                      value={filename}
                      onChange={(e) =>
                        setFilename(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "-"),
                        )
                      }
                      placeholder="e.g. automated-battery-swap-station"
                      disabled={!isCreatingNew && Boolean(selectedNode)}
                      className="font-mono text-xs h-8 bg-background/80"
                    />
                  </div>

                  {/* Title & Domain Category Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="node-title"
                        className="text-xs font-semibold text-foreground"
                      >
                        Display Title
                      </Label>
                      <Input
                        id="node-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Automated Battery Swap Station"
                        className="text-xs h-8 bg-background/80 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="node-type"
                        className="text-xs font-semibold text-foreground"
                      >
                        Domain Category (Type)
                      </Label>
                      <div className="flex gap-1.5">
                        <select
                          id="node-type"
                          value={type}
                          onChange={(e) => setType(e.target.value)}
                          className="flex-1 h-8 rounded-md border border-input bg-background/80 px-2 py-1 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                        >
                          {CANONICAL_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                          {!CANONICAL_TYPES.includes(type) && (
                            <option value={type}>{type} (Custom)</option>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Description Overview */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="node-desc"
                      className="text-xs font-semibold text-foreground"
                    >
                      Executive Summary / Description
                    </Label>
                    <Textarea
                      id="node-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="High-level summary of this operational node..."
                      rows={2}
                      className="text-xs bg-background/80 resize-none"
                    />
                  </div>

                  {/* Smart Tags Manager */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3 text-primary" />
                      <span>Categorization Tags</span>
                    </Label>
                    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-md border border-border/70 bg-background/50 min-h-9">
                      {tags.map((t) => (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="text-[10px] gap-1 px-1.5 py-0 h-5 font-mono bg-muted text-foreground"
                        >
                          <span>{t}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t)}
                            className="hover:text-destructive p-0.5 cursor-pointer"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))}
                      <div className="flex items-center gap-1 flex-1 min-w-28">
                        <input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder="Type tag & hit Enter..."
                          className="bg-transparent text-xs outline-none w-full placeholder:text-muted-foreground/60"
                        />
                        {tagInput.trim() && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAddTag()}
                            className="h-5 px-1.5 text-[10px] text-primary cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Tag Suggestions Pills */}
                    {tagSuggestions.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Suggestions:
                        </span>
                        {tagSuggestions.map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleAddTag(st)}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors cursor-pointer"
                          >
                            +{st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Markdown Body Section with Formatting Toolbar & Quick Inserters */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Label
                        htmlFor="node-body"
                        className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                      >
                        <span>Document Markdown Body</span>
                        <span className="text-[10px] text-muted-foreground font-mono font-normal">
                          (Type <code className="text-primary font-bold">[[</code> or <code className="text-primary font-bold">@</code> to link)
                        </span>
                      </Label>

                      {/* Formatting Helper Buttons */}
                      <div className="flex items-center gap-0.5 border border-border/70 rounded-xs bg-background/80 p-0.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => insertFormatting("**", "**", "bold")}
                          className="p-1 hover:bg-muted rounded-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Bold"
                        >
                          <Bold className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting("*", "*", "italic")}
                          className="p-1 hover:bg-muted rounded-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Italic"
                        >
                          <Italic className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            insertFormatting("\n## ", "\n", "Heading")
                          }
                          className="p-1 hover:bg-muted rounded-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Heading 2"
                        >
                          <Heading2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            insertFormatting("\n### ", "\n", "Subheading")
                          }
                          className="p-1 hover:bg-muted rounded-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Heading 3"
                        >
                          <Heading3 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            insertFormatting("\n- ", "", "List item")
                          }
                          className="p-1 hover:bg-muted rounded-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Bullet List"
                        >
                          <List className="h-3 w-3" />
                        </button>

                        <div className="h-3 w-px bg-border/80 mx-0.5" />

                        {/* Insert Table */}
                        <button
                          type="button"
                          onClick={insertTableSnippet}
                          className="p-1 hover:bg-muted rounded-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Insert Markdown Table"
                        >
                          <Table className="h-3 w-3" />
                        </button>

                        {/* Insert Mermaid Diagram */}
                        <button
                          type="button"
                          onClick={() => insertDiagramSnippet("flowchart")}
                          className="p-1 hover:bg-muted rounded-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Insert Mermaid Flowchart"
                        >
                          <Workflow className="h-3 w-3" />
                        </button>

                        {/* Insert Alert Callout */}
                        <button
                          type="button"
                          onClick={() => insertCalloutSnippet("NOTE")}
                          className="p-1 hover:bg-muted rounded-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Insert Callout Note"
                        >
                          <Quote className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <Textarea
                      ref={markdownTextareaRef}
                      id="node-body"
                      value={markdownBody}
                      onChange={(e) => setMarkdownBody(e.target.value)}
                      onKeyUp={handleTextareaKeyUp}
                      onKeyDown={handleTextareaKeyDown}
                      placeholder="Write markdown documentation here. Type [[ or @ to trigger concept cross-linking..."
                      rows={14}
                      className="font-mono text-xs bg-background/80 leading-relaxed min-h-64 resize-y"
                    />
                  </div>
                </div>
              </ScrollArea>
            ) : (
              /* RAW MARKDOWN CODE MODE */
              <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4">
                <div className="flex items-center justify-between pb-2 text-xs text-muted-foreground font-mono">
                  <span>Full File (YAML Frontmatter + Body)</span>
                  <span>{rawContent.split("\n").length} lines</span>
                </div>
                <Textarea
                  ref={rawTextareaRef}
                  value={rawContent}
                  onChange={(e) => handleRawChange(e.target.value)}
                  onKeyUp={handleTextareaKeyUp}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder="---&#10;type: Facility&#10;title: Example&#10;description: ...&#10;tags: []&#10;---&#10;# Example&#10;..."
                  className="flex-1 font-mono text-xs bg-background/90 resize-none leading-relaxed p-3 rounded-md border-border/80 min-h-0"
                  spellCheck={false}
                />
              </div>
            )}
          </div>
        )}

        {/* Live Preview Column */}
        {previewMode !== "editor" && (
          <div
            className={`flex flex-col min-h-0 overflow-hidden bg-background/40 ${
              previewMode === "split" ? "hidden md:flex md:w-1/2" : "w-full"
            }`}
          >
            <div className="border-b border-border/50 px-4 py-1.5 flex items-center justify-between text-xs text-muted-foreground bg-muted/20 shrink-0">
              <span className="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                <Eye className="h-3 w-3 text-primary" />
                Live Rendered Preview
              </span>
              <span className="font-mono text-[10px]">
                {type} &bull; {tags.length} tag(s)
              </span>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-4">
                {/* Simulated Frontmatter Header in Preview */}
                <div className="border-b border-border/60 pb-4 space-y-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                    {title || "Untitled Concept"}
                  </h1>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] bg-primary/10 text-primary border-primary/30"
                    >
                      {type}
                    </Badge>
                    {tags.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="text-[10px] font-mono"
                      >
                        #{t}
                      </Badge>
                    ))}
                  </div>

                  {description && (
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>

                {/* Markdown Body Preview */}
                <KnowledgeMarkdown content={previewMarkdown} />
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
