import { handleFetchGraph } from "@/lib/kbm-actions/knowledge-actions";
import { MemoryLocalApp } from "@/components/kbm-elements/memory-local-app";

export default async function KnowledgeTestPage() {
  const initialNodes = await handleFetchGraph();
  return <MemoryLocalApp initialNodes={initialNodes} />;
}
