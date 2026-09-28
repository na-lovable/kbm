import { handleFetchGraph } from "@/lib/kbm-actions/knowledge-actions";
import { MemoryLocalApp } from "@/components/kbm-elements/memory-local-app";

export default async function KnowledgeTestPage() {
  let initialNodes: Awaited<ReturnType<typeof handleFetchGraph>> = [];
  try {
    initialNodes = await handleFetchGraph();
  } catch {
    // GitHub credentials not configured — app will show empty state
  }
  return <MemoryLocalApp initialNodes={initialNodes} />;
}
