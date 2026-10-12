import { handleFetchGraph } from "@/lib/kbm-actions/knowledge-actions";
import { MemoryLocalApp } from "@/components/kbm-elements/memory-local-app";
import { runWithUserGitHub } from "@/lib/github/run-with-user";

export default async function KnowledgeTestPage() {
  let initialNodes: Awaited<ReturnType<typeof handleFetchGraph>> = [];
  try {
    initialNodes = await runWithUserGitHub(() => handleFetchGraph());
  } catch {
    // GitHub credentials not configured — app will show empty state
  }
  return <MemoryLocalApp initialNodes={initialNodes} />;
}
