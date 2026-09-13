"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  handleLintKnowledgeBase,
  handleReconcileKnowledgeBase,
} from "@/lib/kbm-actions/knowledge-actions";
import { LintReport } from "@/lib/kbm-actions/knowledge-linter";
import { KnowledgeNode } from "@/types/knowledge";
import { categorizeConnections } from "@/lib/connection-categories";
import { useKnowledgeGraph } from "@/lib/hooks/use-knowledge-graph";
import { useReplayEngine } from "@/lib/hooks/use-replay-engine";
import { useResponsivePanels } from "@/lib/hooks/use-responsive-panels";
import { AppHeader } from "@/components/kbm-elements/app-header";
import { AdvisorSidebar } from "@/components/kbm-elements/advisor-sidebar";
import {
  CenterViewToolbar,
  CenterView,
} from "@/components/kbm-elements/center-view-toolbar";
import { ConceptEditorPanel } from "@/components/kbm-elements/concept-editor-panel";
import { ConceptReaderPanel } from "@/components/kbm-elements/concept-reader-panel";
import { ConceptSidebar } from "@/components/kbm-elements/concept-sidebar";
import { LinterDialog } from "@/components/kbm-elements/linter-dialog";
import { TemplatePickerDialog } from "@/components/kbm-elements/template-picker-dialog";
import { ConceptTemplate } from "@/lib/concept-templates";
import { ReplayControlsBar } from "@/components/kbm-elements/replay-controls-bar";
import { GraphPanelSkeleton } from "@/components/kbm-elements/panel-skeletons";
import { UnsavedChangesDialog } from "@/components/kbm-elements/unsaved-changes-dialog";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes-guard";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Network } from "lucide-react";

const GraphVisualizer = dynamic(
  () => import("@/components/kbm-elements/graph-visualizer"),
  {
    ssr: false,
    loading: () => <GraphPanelSkeleton />,
  },
);

interface MemoryLocalAppProps {
  initialNodes: KnowledgeNode[];
}

export function MemoryLocalApp({ initialNodes }: MemoryLocalAppProps) {
  const {
    nodes,
    selectedNode,
    isSyncing,
    isInspecting,
    error,
    setError,
    loadGraph,
    inspectNode,
  } = useKnowledgeGraph({ initialNodes });

  const {
    replayPath,
    replayStep,
    isReplaying,
    handleStartReplay,
    handleStepForward,
    handleStepBack,
    handleStopReplay,
    handleStepReplay,
    clearReplay,
    resumeReplay,
  } = useReplayEngine({ inspectNode });

  const {
    sidebarOpen,
    rightOpen,
    collapseSidebar,
    expandSidebar,
    collapseRight,
    expandRight,
  } = useResponsivePanels();

  const [lintReport, setLintReport] = useState<LintReport | null>(null);
  const [isLinting, setIsLinting] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [showLinterModal, setShowLinterModal] = useState(false);
  const [centerView, setCenterView] = useState<CenterView>("reader");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [activeNewTemplate, setActiveNewTemplate] =
    useState<ConceptTemplate | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [isEditorDirty, setIsEditorDirty] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const editorSaveRef = useRef<() => Promise<boolean>>(async () => false);
  const editorDiscardDraftRef = useRef<() => void>(() => {});
  const {
    pendingNav,
    isSaving: isSavingBeforeNavigation,
    guardNavigation,
    resolveGuard,
  } = useUnsavedChangesGuard({
    isDirty: isEditorDirty,
    isActive: centerView === "editor",
    onSave: () => editorSaveRef.current(),
    onDiscard: () => editorDiscardDraftRef.current(),
  });

  const { mutualNodes, strictOutgoingNodes, strictIncomingNodes, totalCount } =
    useMemo(() => categorizeConnections(selectedNode), [selectedNode]);

  const runLinter = async () => {
    setIsLinting(true);
    try {
      const report = await handleLintKnowledgeBase();
      setLintReport(report);
      setShowLinterModal(true);
    } catch {
      setError("Health check failed. Please try again.");
    } finally {
      setIsLinting(false);
    }
  };

  const runReconcile = async () => {
    setIsReconciling(true);
    try {
      const report = await handleReconcileKnowledgeBase();
      setLintReport(report);
      await loadGraph();
    } catch {
      setError("Reconciliation failed. Please try again.");
    } finally {
      setIsReconciling(false);
    }
  };

  const handleInspectNodeFromChat = useCallback(
    (filename: string) => {
      guardNavigation({
        id: `chat:${filename}`,
        label: "opening another concept",
        execute: () => {
          setIsCreatingNew(false);
          setActiveNewTemplate(null);
          inspectNode(filename);
          setCenterView("reader");
        },
      });
    },
    [guardNavigation, inspectNode],
  );

  const handleSelectFileFromSidebar = useCallback(
    (filename: string) => {
      guardNavigation({
        id: `sidebar:${filename}`,
        label: "opening another concept",
        execute: () => {
          setIsCreatingNew(false);
          setActiveNewTemplate(null);
          inspectNode(filename);
        },
      });
    },
    [guardNavigation, inspectNode],
  );

  const handleSelectConceptFromLinter = useCallback(
    (file: string) => {
      const conceptPath = file.replace(/\\/g, "/").replace(/\.md$/, "");
      const matchingNode = nodes.find(
        (node) => node.relPath === conceptPath || node.filename === conceptPath,
      );

      if (!matchingNode) return;

      guardNavigation({
        id: `linter:${matchingNode.filename}`,
        label: "opening a reported concept",
        execute: () => {
          setIsCreatingNew(false);
          setActiveNewTemplate(null);
          setShowLinterModal(false);
          inspectNode(matchingNode.filename);
          setCenterView("reader");
        },
      });
    },
    [guardNavigation, inspectNode, nodes],
  );

  const handleStartNewConcept = useCallback(() => {
    setShowTemplatePicker(true);
  }, []);

  const handleSelectTemplate = useCallback(
    (template: ConceptTemplate) => {
      guardNavigation({
        id: `template:${template.id}`,
        label: "creating a new concept",
        execute: () => {
          setActiveNewTemplate(template);
          setIsCreatingNew(true);
          setCenterView("editor");
        },
      });
    },
    [guardNavigation],
  );

  const handleCenterViewChange = useCallback(
    (view: CenterView) => {
      if (view === centerView) return;
      guardNavigation({
        id: `view:${view}`,
        label: `switching to ${view === "reader" ? "Brief" : "Graph"}`,
        execute: () => setCenterView(view),
      });
    },
    [centerView, guardNavigation],
  );

  const handleSaveSuccess = useCallback(
    async (savedFilename: string) => {
      setIsCreatingNew(false);
      setActiveNewTemplate(null);
      setIsEditorDirty(false);
      await loadGraph();
      inspectNode(savedFilename);
    },
    [loadGraph, inspectNode],
  );

  const handleDeleteSuccess = useCallback(
    async (deletedFilename: string, replacementFilename?: string) => {
      setIsCreatingNew(false);
      setActiveNewTemplate(null);
      setIsEditorDirty(false);
      const updatedNodes = await loadGraph();
      const nextNode = updatedNodes.find(
        (n) =>
          n.filename === replacementFilename || n.filename !== deletedFilename,
      );
      if (nextNode) {
        inspectNode(nextNode.filename);
      }
      setCenterView("reader");
    },
    [loadGraph, inspectNode],
  );

  const effectiveSidebarOpen = isZenMode ? false : sidebarOpen;
  const effectiveRightOpen = isZenMode ? false : rightOpen;

  return (
    <main className="h-dvh flex flex-col overflow-hidden">
      <UnsavedChangesDialog
        open={Boolean(pendingNav)}
        pendingNav={pendingNav}
        isSaving={isSavingBeforeNavigation}
        onSaveAndContinue={() => void resolveGuard("save")}
        onDiscard={() => void resolveGuard("discard")}
        onCancel={() => void resolveGuard("cancel")}
      />
      <AppHeader
        error={error}
        isSyncing={isSyncing}
        isLinting={isLinting}
        onRunLinter={runLinter}
        onSync={loadGraph}
      />

      <LinterDialog
        open={showLinterModal}
        onOpenChange={setShowLinterModal}
        lintReport={lintReport}
        onReconcile={runReconcile}
        isReconciling={isReconciling}
        onSelectConcept={handleSelectConceptFromLinter}
      />

      <TemplatePickerDialog
        open={showTemplatePicker}
        onOpenChange={setShowTemplatePicker}
        onSelectTemplate={handleSelectTemplate}
      />

      <ResizablePanelGroup
        key={`${effectiveSidebarOpen}-${effectiveRightOpen}-${isZenMode}`}
        orientation="horizontal"
        className="flex-1 overflow-hidden min-h-0"
      >
        {!isZenMode && (
          <>
            <ResizablePanel
              id="panel-left-sidebar"
              defaultSize={effectiveSidebarOpen ? "260px" : "40px"}
              minSize={effectiveSidebarOpen ? "200px" : "40px"}
              maxSize={effectiveSidebarOpen ? "450px" : "40px"}
            >
              <ConceptSidebar
                open={effectiveSidebarOpen}
                nodes={nodes}
                isSyncing={isSyncing}
                selectedFilename={
                  isCreatingNew ? undefined : selectedNode?.filename
                }
                onCollapse={collapseSidebar}
                onExpand={expandSidebar}
                onSelectFile={handleSelectFileFromSidebar}
                onNewConcept={handleStartNewConcept}
              />
            </ResizablePanel>

            {effectiveSidebarOpen && <ResizableHandle withHandle />}
          </>
        )}

        <ResizablePanel id="panel-center" minSize="30%">
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 h-full">
            <CenterViewToolbar
              centerView={centerView}
              onCenterViewChange={handleCenterViewChange}
              selectedNode={isCreatingNew ? null : selectedNode}
              totalConnectionsCount={totalCount}
              isDirty={isEditorDirty}
            />

            {centerView === "reader" ? (
              <ConceptReaderPanel
                selectedNode={selectedNode}
                isInspecting={isInspecting}
                mutualNodes={mutualNodes}
                strictOutgoingNodes={strictOutgoingNodes}
                strictIncomingNodes={strictIncomingNodes}
                totalConnectionsCount={totalCount}
                onSelectNode={handleSelectFileFromSidebar}
                onOpenGraph={() => handleCenterViewChange("graph")}
                onOpenEditor={() => handleCenterViewChange("editor")}
              />
            ) : centerView === "editor" ? (
              <ConceptEditorPanel
                selectedNode={isCreatingNew ? null : selectedNode}
                allNodes={nodes}
                isCreatingNew={isCreatingNew}
                initialTemplate={activeNewTemplate}
                onSaveSuccess={handleSaveSuccess}
                onDeleteSuccess={handleDeleteSuccess}
                onCancelCreate={() => {
                  guardNavigation({
                    id: "cancel-create",
                    label: "cancelling this new concept",
                    execute: () => {
                      setIsCreatingNew(false);
                      setActiveNewTemplate(null);
                      setCenterView("reader");
                    },
                  });
                }}
                onIsDirtyChange={setIsEditorDirty}
                onSaveRequest={(save) => {
                  editorSaveRef.current = save;
                }}
                onDiscardDraftRequest={(discard) => {
                  editorDiscardDraftRef.current = discard;
                }}
                isZenMode={isZenMode}
                onToggleZenMode={() => setIsZenMode((prev) => !prev)}
              />
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-background/50 relative">
                <ReplayControlsBar
                  replayPath={replayPath}
                  replayStep={replayStep}
                  isReplaying={isReplaying}
                  onStepBack={handleStepBack}
                  onStepForward={handleStepForward}
                  onTogglePlay={resumeReplay}
                  onStopReplay={handleStopReplay}
                  onClose={clearReplay}
                />

                <div className="flex-1 min-h-0 p-2">
                  {selectedNode ? (
                    <GraphVisualizer
                      selectedNode={selectedNode}
                      allNodes={nodes}
                      onNodeClick={handleSelectFileFromSidebar}
                      activeTraversalPath={replayPath}
                      activeStepIndex={replayStep}
                      isReplaying={isReplaying}
                    />
                  ) : (
                    <div className="h-full w-full rounded-xl border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Network className="h-10 w-10 opacity-20" />
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          No concept selected
                        </p>
                        <p className="text-xs opacity-60 mt-0.5">
                          Select a concept from the registry to visualize its
                          connection network
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>

        {!isZenMode && (
          <>
            {effectiveRightOpen && <ResizableHandle withHandle />}

            <ResizablePanel
              id="panel-right-sidebar"
              defaultSize={effectiveRightOpen ? "360px" : "40px"}
              minSize={effectiveRightOpen ? "280px" : "40px"}
              maxSize={effectiveRightOpen ? "650px" : "40px"}
            >
              <AdvisorSidebar
                open={effectiveRightOpen}
                reasoningContext={
                  selectedNode?.metadata.title ?? selectedNode?.filename ?? null
                }
                replayPath={replayPath}
                replayStep={replayStep}
                isReplaying={isReplaying}
                onCollapse={collapseRight}
                onExpand={expandRight}
                onStartReplay={handleStartReplay}
                onStopReplay={handleStopReplay}
                onStepReplay={handleStepReplay}
                onInspectNode={handleInspectNodeFromChat}
                onRefreshGraphNeeded={loadGraph}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </main>
  );
}
