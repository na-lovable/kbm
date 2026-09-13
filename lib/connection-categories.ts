import { ConnectedNodeSummary, GraphQueryResult } from "../types/knowledge";

export interface ConnectionCategories {
  mutualNodes: ConnectedNodeSummary[];
  strictOutgoingNodes: ConnectedNodeSummary[];
  strictIncomingNodes: ConnectedNodeSummary[];
  totalCount: number;
}

export function categorizeConnections(
  selectedNode: GraphQueryResult | null,
): ConnectionCategories {
  if (!selectedNode) {
    return {
      mutualNodes: [],
      strictOutgoingNodes: [],
      strictIncomingNodes: [],
      totalCount: 0,
    };
  }

  const mutualNodes = selectedNode.connectedNodes.filter((c) =>
    selectedNode.outgoingNodes.some((o) => o.filename === c.filename),
  );

  const strictOutgoingNodes = selectedNode.outgoingNodes.filter(
    (o) => !selectedNode.connectedNodes.some((c) => c.filename === o.filename),
  );

  const strictIncomingNodes = selectedNode.connectedNodes.filter(
    (c) => !selectedNode.outgoingNodes.some((o) => o.filename === c.filename),
  );

  const unique = new Set([
    ...selectedNode.connectedNodes.map((n) => n.filename),
    ...selectedNode.outgoingNodes.map((n) => n.filename),
  ]);

  return {
    mutualNodes,
    strictOutgoingNodes,
    strictIncomingNodes,
    totalCount: unique.size,
  };
}

export function getBreadcrumbSegments(selectedNode: GraphQueryResult | null): string[] {
  if (!selectedNode) return [];
  const rel = (selectedNode.relPath || selectedNode.filename).replace(/\\/g, "/");
  return rel.split("/").filter(Boolean).slice(0, -1);
}
