import matter from "gray-matter";
import {
  KnowledgeNode,
  OKFFrontMatter,
  GraphQueryResult,
  ConnectedNodeSummary,
} from "@/types/knowledge";
import { listFiles, readFile, writeFile } from "@/lib/github/file-store";
import {
  rebuildAllIndexes,
  appendToLog,
} from "@/lib/github/index-manager";
import {
  getAllMarkdownFiles,
  findAbsolutePath,
  syncIndexIfStale,
  rebuildNestedIndexFile,
} from "./knowledge-writer";

/**
 * LAZY LOADING: Reads and parses index.md or falls back to a deep recursive directory scan.
 * Automatically triggers background reconciliation if any file on disk is newer than index.md.
 */
export async function getInMemoryGraph(): Promise<KnowledgeNode[]> {
  // Ensure index is in sync with latest disk changes
  await syncIndexIfStale();

  const indexContent = await readFile("index");
  if (!indexContent) {
    return runRecursiveDirectoryScan();
  }

  try {
    const { content } = matter(indexContent);

    const nodes: KnowledgeNode[] = [];

    // Regex matching registered asset nodes: * [Title](./relPath.md) - Description
    const indexLineRegex = /\*\s+\[([^\]]+)\]\(\.\/([^)]+)\.md\)\s+-\s+(.+)/g;
    let match;

    while ((match = indexLineRegex.exec(content)) !== null) {
      const [_, title, relPath, description] = match;
      const filename = relPath.split("/").pop() || relPath;

      // Filter out subfolder category index files
      if (filename === "index" || relPath.endsWith("/index")) {
        continue;
      }

      // Calculate entity category type from the immediate parent markdown header block
      const sectionSnippet = content.substring(0, match.index);
      const headers = [...sectionSnippet.matchAll(/###?\s+(.+)/g)];
      const rawHeader =
        headers.length > 0 ? headers[headers.length - 1]?.[1].trim() : "Asset";
      const entityType = rawHeader.endsWith("s")
        ? rawHeader.slice(0, -1)
        : rawHeader;

      nodes.push({
        filename,
        relPath,
        type: entityType,
        metadata: {
          title,
          type: entityType,
          description,
        },
        rawContent: "", // Kept empty for lazy loading optimization
      });
    }

    return nodes.length > 0 ? nodes : runRecursiveDirectoryScan();
  } catch (error) {
    console.error(
      "Index tracking failure, falling back to full recursive scan:",
      error,
    );
    return runRecursiveDirectoryScan();
  }
}

/**
 * Lazy Loads a single specific file by searching nested locations and computing outgoing/incoming connections.
 */
export async function queryGraphById(
  filenameWithoutExt: string,
): Promise<GraphQueryResult | null> {
  try {
    await syncIndexIfStale();

    const matchedPath = await findAbsolutePath(filenameWithoutExt);
    if (!matchedPath) return null;

    const fileContents = await readFile(matchedPath);
    if (!fileContents) return null;

    const { data, content } = matter(fileContents);
    const metadata = data as OKFFrontMatter;

    const targetNode: KnowledgeNode = {
      filename: matchedPath.split("/").pop() || matchedPath,
      relPath: matchedPath,
      type: metadata.type || "Unknown",
      metadata,
      rawContent: content.trim(),
    };

    const allSummaryNodes = await getInMemoryGraph();

    // 1. Check outgoing relative path references (target node points to other nodes)
    const outgoingNodes = allSummaryNodes.filter((node) => {
      if (node.filename === targetNode.filename) return false;
      return (
        targetNode.rawContent.includes(`./${node.relPath}.md`) ||
        targetNode.rawContent.includes(`/${node.relPath}.md`) ||
        targetNode.rawContent.includes(`./${node.filename}.md`) ||
        targetNode.rawContent.includes(`/${node.filename}.md`) ||
        targetNode.rawContent.includes(`(${node.filename}.md)`)
      );
    });

    // 2. Check incoming relative path references (other nodes point to target node)
    const allFiles = await listFiles();
    const connectedNodesMap = new Map<string, ConnectedNodeSummary>();

    for (const relPath of allFiles) {
      const fileSlug = relPath.split("/").pop() || relPath;
      if (
        fileSlug === targetNode.filename ||
        relPath.endsWith("/index") ||
        relPath === "log"
      ) {
        continue;
      }

      try {
        const raw = await readFile(relPath);
        if (!raw) continue;

        const isPointingToTarget =
          raw.includes(`./${targetNode.relPath}.md`) ||
          raw.includes(`/${targetNode.relPath}.md`) ||
          raw.includes(`./${targetNode.filename}.md`) ||
          raw.includes(`/${targetNode.filename}.md`) ||
          raw.includes(`(${targetNode.filename}.md)`);

        if (isPointingToTarget) {
          const { data: otherData } = matter(raw);

          connectedNodesMap.set(fileSlug, {
            filename: fileSlug,
            relPath: relPath,
            type: otherData.type || "Unknown",
            title: otherData.title || fileSlug,
          });
        }
      } catch {
        // Skip unreadable element
      }
    }

    return {
      ...targetNode,
      connectedNodes: Array.from(connectedNodesMap.values()),
      outgoingNodes: outgoingNodes.map((r) => ({
        filename: r.filename,
        relPath: r.relPath,
        type: r.type,
        title: r.metadata.title,
      })),
    };
  } catch (err) {
    console.error("Single node deep lookup failure:", err);
    return null;
  }
}

export async function readSingleFileRaw(
  filename: string,
): Promise<string | null> {
  try {
    const matchedPath = await findAbsolutePath(filename);
    if (!matchedPath) return null;

    const fileContent = await readFile(matchedPath);
    if (!fileContent) return null;

    // Chronological read tracker updates inside root logs
    const timestamp = new Date().toISOString();
    const logEntry = `READ [${filename}] - Deep nested content queried autonomously by agent.`;

    await appendToLog(logEntry);

    return fileContent;
  } catch {
    return null;
  }
}

async function runRecursiveDirectoryScan(): Promise<KnowledgeNode[]> {
  const allRelPaths = await listFiles();
  const targetFiles = allRelPaths.filter(
    (p) => !p.endsWith("/index") && p !== "index" && p !== "log",
  );

  const nodes: KnowledgeNode[] = [];

  for (const relPath of targetFiles) {
    try {
      const fileContents = await readFile(relPath);
      if (!fileContents) continue;

      const { data } = matter(fileContents);

      nodes.push({
        filename: relPath.split("/").pop() || relPath,
        relPath: relPath,
        type: (data as OKFFrontMatter).type || "Unknown",
        metadata: data as OKFFrontMatter,
        rawContent: "",
      });
    } catch {
      // Skip unreadable files
    }
  }

  return nodes;
}
