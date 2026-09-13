"use client";

import { useCallback, useState, useTransition } from "react";
import {
  handleFetchGraph,
  handleQueryNode,
} from "@/lib/kbm-actions/knowledge-actions";
import { GraphQueryResult, KnowledgeNode } from "@/types/knowledge";

interface UseKnowledgeGraphOptions {
  initialNodes?: KnowledgeNode[];
}

export function useKnowledgeGraph(options: UseKnowledgeGraphOptions = {}) {
  const { initialNodes = [] } = options;

  const [nodes, setNodes] = useState<KnowledgeNode[]>(initialNodes);
  const [selectedNode, setSelectedNode] = useState<GraphQueryResult | null>(
    null,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [error, setError] = useState<string | null>(
    initialNodes.length === 0
      ? 'No concepts found. Add markdown files to your "/knowledge-base" directory to get started.'
      : null,
  );
  const [, startTransition] = useTransition();

  const loadGraph = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const data = await handleFetchGraph();
      startTransition(() => {
        setNodes(data);
        if (data.length === 0) {
          setError(
            'No concepts found. Add markdown files to your "/knowledge-base" directory to get started.',
          );
        }
      });
      return data;
    } catch {
      setError("Unable to load concept graph. Please try again.");
      return [];
    } finally {
      setIsSyncing(false);
    }
  }, [startTransition]);

  const inspectNode = useCallback(
    async (filename: string) => {
      setIsInspecting(true);
      setError(null);
      try {
        const details = await handleQueryNode(filename);
        startTransition(() => {
          setSelectedNode(details);
        });
      } catch {
        setError(`Failed to inspect connections for concept: ${filename}`);
      } finally {
        setIsInspecting(false);
      }
    },
    [startTransition],
  );

  return {
    nodes,
    selectedNode,
    isSyncing,
    isInspecting,
    error,
    setError,
    loadGraph,
    inspectNode,
    clearSelectedNode: () => setSelectedNode(null),
  };
}
