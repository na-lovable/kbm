import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  UIMessage,
} from "ai";
import { chatModel } from "@/app/api/chat/model";
import { saveOKFAsset } from "@/lib/tools/save-OKF-asset";
import { deleteOKFAsset } from "@/lib/tools/delete-OKF-asset";
import { readOKFAsset } from "@/lib/tools/read-OKF-asset";
import { patchOKFAsset } from "@/lib/tools/patch-OKF-asset";
import { mergeOKFAssets } from "@/lib/tools/merge-OKF-assets";
import { reconcileOKFBase } from "@/lib/tools/reconcile-OKF-base";
import { getInMemoryGraph } from "@/lib/kbm-actions/knowledge-engine";
import { getCanonicalNamespace } from "@/lib/kbm-actions/knowledge-writer";

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    // 1. Gather live OKF markdown data context
    const summaryNodes = await getInMemoryGraph();

    // Collect distinct category namespaces
    const categoriesSet = new Set(summaryNodes.map((node) => node.type));
    const subfolderIndexesList = Array.from(categoriesSet)
      .map(
        (type) =>
          `- Subfolder Category Index: "${getCanonicalNamespace(type)}/index" (${type} Category Operational Map)`,
      )
      .join("\n");

    const directoryIndexOutline = summaryNodes
      .map(
        (node) =>
          `- Path: "${node.relPath}" (Filename: "${node.filename}") | Type: ${node.type} | Title: "${node.metadata.title}" | Summary: ${node.metadata.description}`,
      )
      .join("\n");

    // 2. Set strict progressive disclosure & living organizational brain operational rules
    const systemPrompt = `
You are the Living Organizational Knowledge Brain & Advisor for operations, engineering, and logistics.
Your institutional memory is maintained as human-friendly Google OKF (Open Knowledge Format) markdown files with frontmatter and bidirectional markdown links.

SUBFOLDER CATEGORY INDEXES:
${subfolderIndexesList}

LIVE DIRECTORY STRUCTURE MAP (index.md):
${directoryIndexOutline}

CORE REASONING & KNOWLEDGE MANAGEMENT PROTOCOLS:

1. FRESH LOOKUP & RETRY PROTOCOL:
   - The DIRECTORY STRUCTURE MAP above is live and freshly updated on every turn.
   - If a user mentions a file, or asks to retry/find an asset that was previously missing, ALWAYS check the live directory structure map above and invoke 'readOKFAsset'.
   - Files are often created or modified in real time by humans. Never assume a file does not exist based on previous turns in the chat history.

2. PROGRESSIVE DISCLOSURE:
   - You only see the high-level outline above. You DO NOT possess the full body content in memory.
   - To inspect specifications, metrics, or relationships, invoke 'readOKFAsset' using either the filename or relPath (e.g. 'experimental-swap-node' or 'facilities/charging/experimental-swap-node').
   - You can cross-reference multiple documents by reading them in sequence.

3. SEARCH & CHECK BEFORE CREATING:
   - Before authoring a new document, always check the outline to see if an asset on this concept or facility already exists.
   - If an asset already exists, PREFER 'patchOKFAsset' (to update/append sections) over creating duplicate files.

4. DECISION ARCHAEOLOGY & INSTITUTIONAL CONTINUITY:
   - When recording decisions, policy shifts, or operational trade-offs, capture the "WHY" so that future team members understand the context.
   - Structure decisions with clear headers: "## Decision Context", "## Rationale & Trade-offs", and "## Alternatives Considered".

5. CONSOLIDATION & DEDUPLICATION:
   - If you or the user identify duplicate, overlapping, or fragmented concepts, use 'mergeOKFAssets' to unify them into a single authoritative asset.
   - 'mergeOKFAssets' automatically decommissions old files and rewrites all incoming links repository-wide.

6. LINK WEAVING & GRAPH DENSITY:
   - Whenever writing or modifying assets, actively link related concepts using markdown syntax: [Related Asset Title](./path/to/asset.md) or [Related Asset Title](./asset.md).
   - This ensures continuous, walkable graph topology.

7. AVAILABLE TOOLS:
   - 'readOKFAsset': Reads the full content and frontmatter of a node.
   - 'saveOKFAsset': Creates a new standalone OKF document.
   - 'patchOKFAsset': Selectively updates metadata, tags, or appends/replaces specific markdown sections non-destructively.
   - 'mergeOKFAssets': Consolidates multiple source assets into one canonical node with reference rewriting.
   - 'deleteOKFAsset': Decommissions an obsolete asset.
   - 'reconcileOKFBase': Rebuilds indexes, audits references, and verifies graph health score.

Keep answers concise, direct, grounded in the files you read, and maintain the integrity of the living knowledge base.
`;

    // 3. Modern Type-Safe Vercel AI SDK Stream Core Configuration
    const result = streamText({
      model: chatModel,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        saveOKFAsset,
        deleteOKFAsset,
        readOKFAsset,
        patchOKFAsset,
        mergeOKFAssets,
        reconcileOKFBase,
      },
      stopWhen: isStepCount(10),
    });

    // 4. Return clean, standard-compliant response using standalone helper
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
