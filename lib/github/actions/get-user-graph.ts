"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { runWithUserGitHub } from "@/lib/github/run-with-user";
import { handleFetchGraph } from "@/lib/kbm-actions/knowledge-actions";
import { KnowledgeNode } from "@/types/knowledge";

export async function getUserGraph(): Promise<{
  nodes: KnowledgeNode[];
  status: "success" | "unauth" | "authError" | "error";
  error: string | null;
}> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // No better-auth session at all — user needs to sign in first
  if (!session?.user?.id) {
    return { nodes: [], status: "unauth", error: null };
  }

  try {
    const nodes = await runWithUserGitHub(() => handleFetchGraph());
    return { nodes, status: "success", error: null };
  } catch (err) {
    // Session exists but GitHub token is missing/invalid/expired ("Bad credentials")
    return {
      nodes: [],
      status: "authError",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
