"use server";

import { headers } from "next/headers";
import { runWithUserGitHub } from "@/lib/github/run-with-user";
import { handleFetchGraph } from "@/lib/kbm-actions/knowledge-actions";
import { KnowledgeNode } from "@/types/knowledge";

export async function getUserGraph(): Promise<{
  nodes: KnowledgeNode[];
  error: string | null;
}> {
  try {
    const nodes = await runWithUserGitHub(() => handleFetchGraph());
    return { nodes, error: null };
  } catch (err) {
    return {
      nodes: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
