"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Maximize2,
  X,
  Search,
  Link as LinkIcon,
  Orbit,
  LayoutGrid,
  GitFork,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ChevronDown,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  GraphQueryResult,
  KnowledgeNode as OKFKnowledgeNode,
} from "@/types/knowledge";
import { KnowledgeNode } from "@/components/kbm-elements/knowledge-node";

interface GraphVisualizerProps {
  selectedNode: GraphQueryResult;
  allNodes?: OKFKnowledgeNode[];
  onNodeClick: (filename: string) => void;
  activeTraversalPath?: string[];
  activeStepIndex?: number;
  isReplaying?: boolean;
}

interface EdgeContext {
  sourceTitle: string;
  targetTitle: string;
  relation: string;
  snippet?: string;
  color: string;
}

function extractLinkSnippet(
  rawContent: string,
  targetFilename: string,
  sourceFilename: string,
): string | undefined {
  if (!rawContent) return undefined;
  const lines = rawContent.split("\n");
  const cleanTarget = targetFilename.toLowerCase();
  const cleanSource = sourceFilename.toLowerCase();
  for (const line of lines) {
    const l = line.toLowerCase();
    if (l.includes(cleanTarget) || l.includes(cleanSource)) {
      const trimmed = line.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return undefined;
}

function GraphVisualizerInner({
  selectedNode,
  allNodes = [],
  onNodeClick,
  activeTraversalPath = [],
  activeStepIndex = -1,
  isReplaying: isReplayingProp = false,
}: GraphVisualizerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [visibleDirections, setVisibleDirections] = useState<Set<string>>(
    new Set(["incoming", "outgoing", "mutual"]),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeEdgeContext, setActiveEdgeContext] =
    useState<EdgeContext | null>(null);
  const [viewMode, setViewMode] = useState<"local" | "global">("local");
  const [layoutType, setLayoutType] = useState<"flow" | "radial" | "grid">(
    "flow",
  );
  const [graphDepth, setGraphDepth] = useState<1 | 2>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Clear edge context popover when target core node changes
  useEffect(() => {
    setActiveEdgeContext(null);
  }, [selectedNode.filename]);

  const handleEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    const sourceTitle = (sourceNode?.data?.title as string) || edge.source;
    const targetTitle = (targetNode?.data?.title as string) || edge.target;
    const sourceFile = (sourceNode?.data?.filename as string) || edge.source;
    const targetFile = (targetNode?.data?.filename as string) || edge.target;

    const snippet = extractLinkSnippet(
      selectedNode.rawContent,
      targetFile,
      sourceFile,
    );
    const edgeColor = (edge.style?.stroke as string) || "#6366f1";

    setActiveEdgeContext({
      sourceTitle,
      targetTitle,
      relation: (edge.label as string) || "connected to",
      snippet,
      color: edgeColor,
    });
  };

  const nodeTypes = useMemo(() => ({ knowledgeNode: KnowledgeNode }), []);

  const toggleDirection = (dir: string) => {
    setVisibleDirections((prev) => {
      // Prevent toggling off the last active filter
      if (prev.has(dir) && prev.size === 1) return prev;
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  };

  // Node & Edge positioning engine
  useEffect(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    const incomingAll = selectedNode.connectedNodes || [];
    const outgoingAll = selectedNode.outgoingNodes || [];

    // Deduplicate into distinct categories
    const mutualAll = incomingAll.filter((inc) =>
      outgoingAll.some((out) => out.filename === inc.filename),
    );
    const incomingOnlyAll = incomingAll.filter(
      (inc) => !outgoingAll.some((out) => out.filename === inc.filename),
    );
    const outgoingOnlyAll = outgoingAll.filter(
      (out) => !incomingAll.some((inc) => inc.filename === out.filename),
    );

    // Apply active filter toggles
    const mutual = visibleDirections.has("mutual") ? mutualAll : [];
    const incomingOnly = visibleDirections.has("incoming")
      ? incomingOnlyAll
      : [];
    const outgoingOnly = visibleDirections.has("outgoing")
      ? outgoingOnlyAll
      : [];

    const isSearchActive = searchQuery.trim().length > 0;
    const cleanSearch = searchQuery.trim().toLowerCase();

    const matchesSearch = (title: string, filename: string) => {
      if (!isSearchActive) return false;
      return (
        title.toLowerCase().includes(cleanSearch) ||
        filename.toLowerCase().includes(cleanSearch)
      );
    };

    // ==========================================
    // GLOBAL VIEW MODE
    // ==========================================
    if (viewMode === "global" && allNodes && allNodes.length > 0) {
      const N = allNodes.length;
      const cols = Math.max(3, Math.ceil(Math.sqrt(N * 1.5)));

      allNodes.forEach((node, index) => {
        const isCore = node.filename === selectedNode.filename;
        const nodeId = `${isCore ? "core" : "global"}-${node.filename}`;
        const isMatch = matchesSearch(
          node.metadata?.title || node.filename,
          node.filename,
        );
        let pos = { x: 0, y: 0 };

        if (layoutType === "radial") {
          const R = Math.max(340, N * 38);
          const angle = (index / N) * (2 * Math.PI) - Math.PI / 2;
          pos = {
            x: Math.round(450 + R * Math.cos(angle)),
            y: Math.round(320 + R * Math.sin(angle)),
          };
        } else {
          // Flow & Grid mode: Clean multi-column grid
          const col = index % cols;
          const row = Math.floor(index / cols);
          pos = { x: col * 240 + 40, y: row * 105 + 40 };
        }

        flowNodes.push({
          id: nodeId,
          type: "knowledgeNode",
          position: pos,
          data: {
            title: node.metadata?.title || node.filename,
            filename: node.filename,
            entityType: node.type || "Concept",
            direction: isCore ? "core" : "mutual",
            isSearchActive,
            isSearchMatch: isMatch,
          },
        });
      });

      // Outgoing edges
      const coreId = `core-${selectedNode.filename}`;
      (selectedNode.outgoingNodes || []).forEach((out) => {
        const targetId = `${out.filename === selectedNode.filename ? "core" : "global"}-${out.filename}`;
        if (flowNodes.some((n) => n.id === targetId)) {
          flowEdges.push({
            id: `e-global-${coreId}-${targetId}`,
            source: coreId,
            target: targetId,
            sourceHandle: "right-source",
            targetHandle: "left-target",
            type: "smoothstep",
            animated: true,
            label: "links to",
            labelStyle: { fill: "#f59e0b", fontWeight: 700, fontSize: 10 },
            style: { stroke: "#f59e0b", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
          });
        }
      });

      // Incoming edges
      (selectedNode.connectedNodes || []).forEach((inc) => {
        const sourceId = `${inc.filename === selectedNode.filename ? "core" : "global"}-${inc.filename}`;
        if (flowNodes.some((n) => n.id === sourceId)) {
          flowEdges.push({
            id: `e-global-${sourceId}-${coreId}`,
            source: sourceId,
            target: coreId,
            sourceHandle: "right-source",
            targetHandle: "left-target",
            type: "smoothstep",
            animated: true,
            label: "referenced by",
            labelStyle: { fill: "#10b981", fontWeight: 700, fontSize: 10 },
            style: { stroke: "#10b981", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
          });
        }
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
      return;
    }

    // ==========================================
    // LOCAL NEIGHBORHOOD VIEW MODE
    // ==========================================
    const rowGap = 95; // Card height (72px) + 23px breathing room = guaranteed zero overlap

    // Calculate vertical dimension requirements
    const incCount = incomingOnly.length;
    const outCount = outgoingOnly.length;
    const mutCount = mutual.length;
    const centerCount = 1 + mutCount;

    const maxItems = Math.max(incCount, outCount, centerCount, 1);
    const totalContentHeight = maxItems * rowGap;
    const baselineCenterY = Math.max(260, totalContentHeight / 2);

    const coreId = `core-${selectedNode.filename}`;
    const coreMatch = matchesSearch(
      selectedNode.metadata.title,
      selectedNode.filename,
    );

    if (layoutType === "flow") {
      // 🚀 DIRECTED LEFT-TO-RIGHT PIPELINE LAYOUT
      const colX_Inbound = 40;
      const colX_Center = 340;
      const colX_Outbound = 640;

      // 1. Center Column: Active Core Focus Node + Mutual Peers
      const centerStartY = baselineCenterY - ((centerCount - 1) * rowGap) / 2;
      flowNodes.push({
        id: coreId,
        type: "knowledgeNode",
        position: { x: colX_Center, y: centerStartY },
        data: {
          title: selectedNode.metadata.title,
          filename: selectedNode.filename,
          entityType: selectedNode.type || "Concept",
          direction: "core",
          isSearchActive,
          isSearchMatch: coreMatch || (isSearchActive && !cleanSearch),
        },
      });

      mutual.forEach((conn, index) => {
        const mutId = `mut-${conn.filename}`;
        const isMatch = matchesSearch(conn.title, conn.filename);
        const yPos = centerStartY + (index + 1) * rowGap;

        flowNodes.push({
          id: mutId,
          type: "knowledgeNode",
          position: { x: colX_Center, y: yPos },
          data: {
            title: conn.title,
            filename: conn.filename,
            entityType: conn.type || "Concept",
            direction: "mutual",
            isSearchActive,
            isSearchMatch: isMatch,
          },
        });

        // Mutual link: smooth vertical connection
        flowEdges.push({
          id: `e-${mutId}-${coreId}`,
          source: coreId,
          target: mutId,
          sourceHandle: "bottom-source",
          targetHandle: "top-target",
          type: "smoothstep",
          animated: true,
          label: "↔ mutual link",
          labelStyle: { fill: "#6366f1", fontWeight: 700, fontSize: 10 },
          style: { stroke: "#6366f1", strokeWidth: 2.5 },
          markerStart: { type: MarkerType.ArrowClosed, color: "#6366f1" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
        });
      });

      // 2. Left Column: Inbound / Upstream Nodes (flow rightward into Core)
      const incStartY = baselineCenterY - ((incCount - 1) * rowGap) / 2;
      incomingOnly.forEach((conn, index) => {
        const incId = `inc-${conn.filename}`;
        const isMatch = matchesSearch(conn.title, conn.filename);
        const yPos = incStartY + index * rowGap;

        flowNodes.push({
          id: incId,
          type: "knowledgeNode",
          position: { x: colX_Inbound, y: yPos },
          data: {
            title: conn.title,
            filename: conn.filename,
            entityType: conn.type || "Concept",
            direction: "incoming",
            isSearchActive,
            isSearchMatch: isMatch,
          },
        });

        // Inbound: Left card right-source -> Core left-target
        flowEdges.push({
          id: `e-${incId}-${coreId}`,
          source: incId,
          target: coreId,
          sourceHandle: "right-source",
          targetHandle: "left-target",
          type: "smoothstep",
          animated: true,
          label: "referenced by",
          labelStyle: { fill: "#10b981", fontWeight: 700, fontSize: 10 },
          style: { stroke: "#10b981", strokeWidth: 2.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
        });
      });

      // 3. Right Column: Outbound / Downstream Nodes (flow rightward from Core)
      const outStartY = baselineCenterY - ((outCount - 1) * rowGap) / 2;
      outgoingOnly.forEach((conn, index) => {
        const outId = `out-${conn.filename}`;
        const isMatch = matchesSearch(conn.title, conn.filename);
        const yPos = outStartY + index * rowGap;

        flowNodes.push({
          id: outId,
          type: "knowledgeNode",
          position: { x: colX_Outbound, y: yPos },
          data: {
            title: conn.title,
            filename: conn.filename,
            entityType: conn.type || "Concept",
            direction: "outgoing",
            isSearchActive,
            isSearchMatch: isMatch,
          },
        });

        // Outbound: Core right-source -> Right card left-target
        flowEdges.push({
          id: `e-${coreId}-${outId}`,
          source: coreId,
          target: outId,
          sourceHandle: "right-source",
          targetHandle: "left-target",
          type: "smoothstep",
          animated: true,
          label: "links to",
          labelStyle: { fill: "#f59e0b", fontWeight: 700, fontSize: 10 },
          style: { stroke: "#f59e0b", strokeWidth: 2.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
        });
      });
    } else if (layoutType === "radial") {
      // ⭕ COLLISION-FREE RADIAL ORBIT LAYOUT
      const totalPeripheral = incCount + outCount + mutCount;
      const R = Math.max(300, totalPeripheral * 42);
      const centerX = 400;
      const centerY = 300;

      // Core at center
      flowNodes.push({
        id: coreId,
        type: "knowledgeNode",
        position: { x: centerX - 105, y: centerY - 38 },
        data: {
          title: selectedNode.metadata.title,
          filename: selectedNode.filename,
          entityType: selectedNode.type || "Concept",
          direction: "core",
          isSearchActive,
          isSearchMatch: coreMatch || (isSearchActive && !cleanSearch),
        },
      });

      // Combine peripherals in a clean ordered ring: Inbound on Left, Mutual Top/Bottom, Outbound on Right
      const peripheralItems = [
        ...incomingOnly.map((c) => ({ ...c, dir: "incoming" as const })),
        ...mutual.map((c) => ({ ...c, dir: "mutual" as const })),
        ...outgoingOnly.map((c) => ({ ...c, dir: "outgoing" as const })),
      ];

      peripheralItems.forEach((conn, index) => {
        const angle =
          (index / Math.max(1, peripheralItems.length)) * 2 * Math.PI -
          Math.PI / 2;
        const pos = {
          x: Math.round(centerX + R * Math.cos(angle) - 105),
          y: Math.round(centerY + R * Math.sin(angle) - 38),
        };

        const prefix =
          conn.dir === "incoming"
            ? "inc"
            : conn.dir === "outgoing"
              ? "out"
              : "mut";
        const nodeId = `${prefix}-${conn.filename}`;
        const isMatch = matchesSearch(conn.title, conn.filename);

        flowNodes.push({
          id: nodeId,
          type: "knowledgeNode",
          position: pos,
          data: {
            title: conn.title,
            filename: conn.filename,
            entityType: conn.type || "Concept",
            direction: conn.dir,
            isSearchActive,
            isSearchMatch: isMatch,
          },
        });

        if (conn.dir === "incoming") {
          flowEdges.push({
            id: `e-${nodeId}-${coreId}`,
            source: nodeId,
            target: coreId,
            type: "smoothstep",
            animated: true,
            label: "referenced by",
            labelStyle: { fill: "#10b981", fontWeight: 700, fontSize: 10 },
            style: { stroke: "#10b981", strokeWidth: 2.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
          });
        } else if (conn.dir === "outgoing") {
          flowEdges.push({
            id: `e-${coreId}-${nodeId}`,
            source: coreId,
            target: nodeId,
            type: "smoothstep",
            animated: true,
            label: "links to",
            labelStyle: { fill: "#f59e0b", fontWeight: 700, fontSize: 10 },
            style: { stroke: "#f59e0b", strokeWidth: 2.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
          });
        } else {
          flowEdges.push({
            id: `e-${nodeId}-${coreId}`,
            source: nodeId,
            target: coreId,
            type: "smoothstep",
            animated: true,
            label: "↔ mutual link",
            labelStyle: { fill: "#6366f1", fontWeight: 700, fontSize: 10 },
            style: { stroke: "#6366f1", strokeWidth: 2.5 },
            markerStart: { type: MarkerType.ArrowClosed, color: "#6366f1" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
          });
        }
      });
    } else {
      // 📊 STRUCTURED COLUMN GRID
      const colX1 = 40;
      const colX2 = 300;
      const colX3 = 560;

      flowNodes.push({
        id: coreId,
        type: "knowledgeNode",
        position: { x: colX2, y: 40 },
        data: {
          title: selectedNode.metadata.title,
          filename: selectedNode.filename,
          entityType: selectedNode.type || "Concept",
          direction: "core",
          isSearchActive,
          isSearchMatch: coreMatch || (isSearchActive && !cleanSearch),
        },
      });

      mutual.forEach((conn, index) => {
        const mutId = `mut-${conn.filename}`;
        const isMatch = matchesSearch(conn.title, conn.filename);
        flowNodes.push({
          id: mutId,
          type: "knowledgeNode",
          position: { x: colX2, y: 40 + (index + 1) * rowGap },
          data: {
            title: conn.title,
            filename: conn.filename,
            entityType: conn.type || "Concept",
            direction: "mutual",
            isSearchActive,
            isSearchMatch: isMatch,
          },
        });
        flowEdges.push({
          id: `e-${mutId}-${coreId}`,
          source: mutId,
          target: coreId,
          type: "smoothstep",
          animated: true,
          label: "↔ mutual",
          labelStyle: { fill: "#6366f1", fontWeight: 700, fontSize: 10 },
          style: { stroke: "#6366f1", strokeWidth: 2 },
          markerStart: { type: MarkerType.ArrowClosed, color: "#6366f1" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
        });
      });

      incomingOnly.forEach((conn, index) => {
        const incId = `inc-${conn.filename}`;
        const isMatch = matchesSearch(conn.title, conn.filename);
        flowNodes.push({
          id: incId,
          type: "knowledgeNode",
          position: { x: colX1, y: 40 + index * rowGap },
          data: {
            title: conn.title,
            filename: conn.filename,
            entityType: conn.type || "Concept",
            direction: "incoming",
            isSearchActive,
            isSearchMatch: isMatch,
          },
        });
        flowEdges.push({
          id: `e-${incId}-${coreId}`,
          source: incId,
          target: coreId,
          sourceHandle: "right-source",
          targetHandle: "left-target",
          type: "smoothstep",
          animated: true,
          label: "referenced by",
          labelStyle: { fill: "#10b981", fontWeight: 700, fontSize: 10 },
          style: { stroke: "#10b981", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
        });
      });

      outgoingOnly.forEach((conn, index) => {
        const outId = `out-${conn.filename}`;
        const isMatch = matchesSearch(conn.title, conn.filename);
        flowNodes.push({
          id: outId,
          type: "knowledgeNode",
          position: { x: colX3, y: 40 + index * rowGap },
          data: {
            title: conn.title,
            filename: conn.filename,
            entityType: conn.type || "Concept",
            direction: "outgoing",
            isSearchActive,
            isSearchMatch: isMatch,
          },
        });
        flowEdges.push({
          id: `e-${coreId}-${outId}`,
          source: coreId,
          target: outId,
          sourceHandle: "right-source",
          targetHandle: "left-target",
          type: "smoothstep",
          animated: true,
          label: "links to",
          labelStyle: { fill: "#f59e0b", fontWeight: 700, fontSize: 10 },
          style: { stroke: "#f59e0b", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
        });
      });
    }

    // 2-Hop Extension (Depth 2)
    if (graphDepth === 2 && allNodes && allNodes.length > 0) {
      const oneHopSlugs = new Set([
        selectedNode.filename,
        ...incomingOnly.map((c) => c.filename),
        ...outgoingOnly.map((o) => o.filename),
        ...mutual.map((m) => m.filename),
      ]);

      const twoHopNodes = allNodes.filter((n) => !oneHopSlugs.has(n.filename));
      const colX_2Hop = layoutType === "flow" ? 940 : 800;

      twoHopNodes.forEach((twoHop, idx) => {
        const isMatch = matchesSearch(
          twoHop.metadata?.title || twoHop.filename,
          twoHop.filename,
        );

        let pos = { x: colX_2Hop, y: 40 + idx * rowGap };
        if (layoutType === "radial") {
          const R2 = 480;
          const angle = (idx / Math.max(1, twoHopNodes.length)) * 2 * Math.PI;
          pos = {
            x: Math.round(400 + R2 * Math.cos(angle) - 105),
            y: Math.round(300 + R2 * Math.sin(angle) - 38),
          };
        }

        const twoHopId = `2hop-${twoHop.filename}`;
        flowNodes.push({
          id: twoHopId,
          type: "knowledgeNode",
          position: pos,
          data: {
            title: twoHop.metadata?.title || twoHop.filename,
            filename: twoHop.filename,
            entityType: twoHop.type || "Concept",
            direction: "mutual",
            isSearchActive,
            isSearchMatch: isMatch,
          },
        });

        flowEdges.push({
          id: `e-2hop-${twoHopId}-${coreId}`,
          source: twoHopId,
          target: coreId,
          type: "smoothstep",
          animated: false,
          label: "indirect link",
          labelStyle: { fill: "#a1a1aa", fontWeight: 600, fontSize: 9 },
          style: {
            stroke: "#a1a1aa",
            strokeWidth: 1.5,
            strokeDasharray: "4 4",
          },
        });
      });
    }

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [
    selectedNode,
    allNodes,
    viewMode,
    layoutType,
    graphDepth,
    visibleDirections,
    searchQuery,
    setNodes,
    setEdges,
  ]);

  // Replay path highlight effect
  useEffect(() => {
    if (activeTraversalPath.length === 0 || activeStepIndex < 0) {
      setEdges((prev) =>
        prev.map((edge) => ({
          ...edge,
          style: edge.style ? { ...edge.style, opacity: 1 } : edge.style,
        })),
      );
      setNodes((prev) =>
        prev.map((node) => ({
          ...node,
          data: { ...node.data, isActiveReplay: false },
        })),
      );
      return;
    }

    const activeFilename = activeTraversalPath[activeStepIndex];
    const prevFilename =
      activeStepIndex > 0 ? activeTraversalPath[activeStepIndex - 1] : null;

    setEdges((prev) =>
      prev.map((edge) => {
        const sourceFilename = edge.source.replace(
          /^(inc|out|mut|core|2hop|global)-/,
          "",
        );
        const targetFilename = edge.target.replace(
          /^(inc|out|mut|core|2hop|global)-/,
          "",
        );
        const isActiveEdge =
          prevFilename !== null &&
          ((sourceFilename === prevFilename &&
            targetFilename === activeFilename) ||
            (sourceFilename === activeFilename &&
              targetFilename === prevFilename));

        if (isActiveEdge) {
          return {
            ...edge,
            animated: true,
            style: {
              stroke: "#f59e0b",
              strokeWidth: 3.5,
              filter: "drop-shadow(0 0 6px #f59e0b)",
            },
            labelStyle: { fill: "#f59e0b", fontWeight: 800, fontSize: 11 },
          };
        }
        return {
          ...edge,
          style: edge.style
            ? { ...edge.style, opacity: 0.3 }
            : { opacity: 0.3 },
        };
      }),
    );

    setNodes((prev) =>
      prev.map((node) => {
        const nodeFilename = node.id.replace(
          /^(inc|out|mut|core|2hop|global)-/,
          "",
        );
        const isActiveNode = nodeFilename === activeFilename;
        return {
          ...node,
          data: {
            ...node.data,
            isActiveReplay: isActiveNode,
            replayStep: activeStepIndex + 1,
          },
        };
      }),
    );
  }, [activeTraversalPath, activeStepIndex, setEdges, setNodes]);

  const incomingAll = selectedNode.connectedNodes || [];
  const outgoingAll = selectedNode.outgoingNodes || [];
  const mutualCount = incomingAll.filter((inc) =>
    outgoingAll.some((out) => out.filename === inc.filename),
  ).length;
  const incomingOnlyCount = incomingAll.length - mutualCount;
  const outgoingOnlyCount = outgoingAll.length - mutualCount;

  const showIncoming = visibleDirections.has("incoming");
  const showOutgoing = visibleDirections.has("outgoing");
  const showMutual = visibleDirections.has("mutual");

  const isReplaying =
    isReplayingProp && activeTraversalPath.length > 0 && activeStepIndex >= 0;
  const activeFilenameDisplay = isReplaying
    ? activeTraversalPath[activeStepIndex]
    : null;

  // Escape key for fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFullscreen]);

  // ReactFlow Canvas Block
  const canvasEl = (
    <div className="relative w-full h-full bg-background/50">
      {/* Edge Context Inspector Popover */}
      {activeEdgeContext && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 max-w-md w-[92%] bg-popover/95 backdrop-blur-md border border-border shadow-2xl rounded-xl p-3 text-xs animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-border/60 pb-1.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground truncate">
              <LinkIcon
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: activeEdgeContext.color }}
              />
              <span className="truncate">{activeEdgeContext.sourceTitle}</span>
              <span className="text-muted-foreground text-[10px] shrink-0">
                ➔
              </span>
              <span className="truncate">{activeEdgeContext.targetTitle}</span>
            </div>
            <button
              onClick={() => setActiveEdgeContext(null)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 transition-colors shrink-0"
              title="Dismiss Inspector"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-primary">
              Relation:
            </span>
            <span className="px-1.5 py-0.5 rounded bg-muted/60 border font-medium text-foreground">
              {activeEdgeContext.relation}
            </span>
          </div>
          {activeEdgeContext.snippet ? (
            <div className="bg-muted/40 rounded-lg p-2 text-[11px] font-mono text-muted-foreground border leading-relaxed wrap-break-words italic">
              "{activeEdgeContext.snippet}"
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground/70 italic">
              Direct reference between concepts.
            </div>
          )}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) =>
          onNodeClick(node.id.replace(/^(inc|out|mut|core|2hop|global)-/, ""))
        }
        onEdgeClick={handleEdgeClick}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesConnectable={false}
        nodesDraggable={true}
        className="text-foreground"
      >
        <Background gap={20} size={1} className="opacity-30" />
        <Controls className="bg-background/90 backdrop-blur-xs border rounded-lg shadow-sm scale-90 origin-bottom-left" />
        <MiniMap
          nodeStrokeWidth={2}
          zoomable
          pannable
          className="bg-background/80! backdrop-blur-xs! border! border-border! rounded-lg! shadow-md! scale-90 origin-bottom-right"
          nodeColor={(node) => {
            const dir = (node.data as any)?.direction;
            if (dir === "core") return "hsl(var(--primary))";
            if (dir === "incoming") return "#10b981";
            if (dir === "outgoing") return "#f59e0b";
            if (dir === "mutual") return "#6366f1";
            return "hsl(var(--muted-foreground))";
          }}
        />
      </ReactFlow>
    </div>
  );

  // Consolidated Header Toolbar with Dropdowns (Option 2 - Auto-responsive)
  const headerEl = (
    <div className="bg-muted/30 backdrop-blur-xs border-b px-2.5 py-1.5 flex items-center justify-between gap-1.5 text-xs font-medium text-muted-foreground shrink-0 w-full min-w-0">
      {isReplaying ? (
        <>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" />
            <span className="text-amber-600 dark:text-amber-400 font-bold truncate text-[11px]">
              Tracing Step {activeStepIndex + 1}/{activeTraversalPath.length}
            </span>
            <code className="text-[9.5px] font-mono bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded border border-amber-500/30 truncate">
              {activeFilenameDisplay}
            </code>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <button
              onClick={() => setIsFullscreen((f) => !f)}
              className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
            >
              {isFullscreen ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Left: View Scope + Layout Dropdown + Filters Popover */}
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
            {/* View Scope Switcher */}
            <div className="inline-flex rounded-md border bg-background/90 p-0.5 text-[10.5px] font-medium shadow-2xs shrink-0">
              <button
                onClick={() => setViewMode("local")}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  viewMode === "local"
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "hover:text-foreground"
                }`}
                title="Focus on direct concept neighborhood"
              >
                Neighborhood
              </button>
              <button
                onClick={() => setViewMode("global")}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  viewMode === "global"
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "hover:text-foreground"
                }`}
                title="View full knowledge graph"
              >
                Full ({allNodes?.length || 0})
              </button>
            </div>

            {/* Layout Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md border bg-background/90 text-[10.5px] font-medium hover:bg-accent/60 transition-colors shadow-2xs cursor-pointer shrink-0">
                {layoutType === "flow" && (
                  <GitFork className="h-3 w-3 text-primary shrink-0" />
                )}
                {layoutType === "radial" && (
                  <Orbit className="h-3 w-3 text-primary shrink-0" />
                )}
                {layoutType === "grid" && (
                  <LayoutGrid className="h-3 w-3 text-primary shrink-0" />
                )}
                <span className="capitalize hidden sm:inline">
                  {layoutType}
                </span>
                <ChevronDown className="h-2.5 w-2.5 opacity-60 ml-0.5 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="min-w-36 p-1 rounded-lg border bg-popover text-popover-foreground shadow-xl z-50"
              >
                <DropdownMenuItem
                  onClick={() => setLayoutType("flow")}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer"
                >
                  <GitFork className="h-3.5 w-3.5 text-primary" />
                  <span className="flex-1 font-medium">Directed Flow</span>
                  {layoutType === "flow" && (
                    <Check className="h-3.5 w-3.5 text-primary ml-auto" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLayoutType("radial")}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer"
                >
                  <Orbit className="h-3.5 w-3.5 text-primary" />
                  <span className="flex-1 font-medium">Radial Orbit</span>
                  {layoutType === "radial" && (
                    <Check className="h-3.5 w-3.5 text-primary ml-auto" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLayoutType("grid")}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer"
                >
                  <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                  <span className="flex-1 font-medium">Structured Grid</span>
                  {layoutType === "grid" && (
                    <Check className="h-3.5 w-3.5 text-primary ml-auto" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filters & Depth Popover */}
            {viewMode === "local" && (
              <Popover>
                <PopoverTrigger
                  className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-md border text-[10.5px] font-medium transition-colors shadow-2xs cursor-pointer shrink-0 ${
                    visibleDirections.size < 3 || graphDepth === 2
                      ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                      : "bg-background/90 hover:bg-accent/60 text-muted-foreground"
                  }`}
                >
                  <SlidersHorizontal className="h-3 w-3 shrink-0" />
                  <span className="hidden sm:inline">Filters</span>
                  {visibleDirections.size < 3 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                  <ChevronDown className="h-2.5 w-2.5 opacity-60 ml-0.5 shrink-0" />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-56 p-2.5 rounded-xl border bg-popover/95 backdrop-blur-md shadow-2xl text-xs z-50"
                >
                  {/* Directional visibility toggles */}
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Visible Links
                  </div>
                  <div className="flex flex-col gap-1.5 mb-3">
                    <button
                      onClick={() => toggleDirection("incoming")}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
                        showIncoming
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-medium"
                          : "bg-muted/30 border-border text-muted-foreground line-through opacity-60"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                        Inbound
                      </span>
                      <span className="font-mono text-[10px] bg-background/80 px-1.5 py-0.5 rounded border">
                        {incomingOnlyCount}
                      </span>
                    </button>

                    {mutualCount > 0 && (
                      <button
                        onClick={() => toggleDirection("mutual")}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
                          showMutual
                            ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-300 font-medium"
                            : "bg-muted/30 border-border text-muted-foreground line-through opacity-60"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-500" />
                          Mutual
                        </span>
                        <span className="font-mono text-[10px] bg-background/80 px-1.5 py-0.5 rounded border">
                          {mutualCount}
                        </span>
                      </button>
                    )}

                    <button
                      onClick={() => toggleDirection("outgoing")}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
                        showOutgoing
                          ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 font-medium"
                          : "bg-muted/30 border-border text-muted-foreground line-through opacity-60"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />
                        Outbound
                      </span>
                      <span className="font-mono text-[10px] bg-background/80 px-1.5 py-0.5 rounded border">
                        {outgoingOnlyCount}
                      </span>
                    </button>
                  </div>

                  {/* Depth Horizon Toggle */}
                  <div className="border-t border-border/60 pt-2 mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Depth Horizon
                    </span>
                    <span className="text-[10px] text-primary font-mono font-medium">
                      {graphDepth === 1 ? "1-Hop" : "2-Hop"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-muted/40 p-0.5 rounded-lg border">
                    <button
                      onClick={() => setGraphDepth(1)}
                      className={`py-1 text-center rounded-md font-medium text-[11px] transition-colors cursor-pointer ${
                        graphDepth === 1
                          ? "bg-background shadow-xs text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      1-Hop
                    </button>
                    <button
                      onClick={() => setGraphDepth(2)}
                      className={`py-1 text-center rounded-md font-medium text-[11px] transition-colors cursor-pointer ${
                        graphDepth === 2
                          ? "bg-background shadow-xs text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      2-Hop
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Quick in-graph filter input */}
            <div className="relative flex items-center min-w-0">
              <Search className="absolute left-1.5 h-3 w-3 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter…"
                className="h-6 w-16 sm:w-20 focus:w-28 pl-5 pr-4 text-[10px] bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/50 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 text-muted-foreground hover:text-foreground text-[10px]"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Area: Pinned Fullscreen & optional Concept Badge */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {isFullscreen && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                <span className="font-semibold text-[10.5px] text-foreground truncate max-w-40">
                  {selectedNode.metadata.title}
                </span>
              </div>
            )}
            <button
              onClick={() => setIsFullscreen((f) => !f)}
              className="p-1 rounded-md border bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shadow-2xs shrink-0"
              title={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
            >
              {isFullscreen ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="h-full w-full border rounded-xl bg-card/40 relative overflow-hidden shadow-xs flex flex-col">
        {headerEl}
        <div className="flex-1 min-h-0 relative">{canvasEl}</div>
      </div>

      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-in fade-in-0 duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFullscreen(false);
          }}
        >
          <div className="shrink-0 border-b">{headerEl}</div>
          <div className="flex-1 min-h-0">{canvasEl}</div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground bg-muted/80 backdrop-blur-xs border border-border px-2.5 py-0.5 rounded-full shadow-md">
            Press <kbd className="font-mono font-bold">Esc</kbd> or click
            outside to exit
          </div>
        </div>
      )}
    </>
  );
}

export default React.memo(GraphVisualizerInner);
