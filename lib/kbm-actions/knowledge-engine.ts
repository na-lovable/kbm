import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  KnowledgeNode,
  OKFFrontMatter,
  GraphQueryResult,
  ConnectedNodeSummary,
} from "@/types/knowledge";
import {
  getAllMarkdownFiles,
  findAbsolutePath,
  syncIndexIfStale,
  rebuildNestedIndexFile,
} from "./knowledge-writer";

const kbDirectory = path.join(process.cwd(), "knowledge-base");
const indexPath = path.join(kbDirectory, "index.md");

/**
 * LAZY LOADING: Reads and parses index.md or falls back to a deep recursive directory scan.
 * Automatically triggers background reconciliation if any file on disk is newer than index.md.
 */
export async function getInMemoryGraph(): Promise<KnowledgeNode[]> {
  if (!fs.existsSync(kbDirectory)) {
    fs.mkdirSync(kbDirectory, { recursive: true });
    return [];
  }

  // Ensure index is in sync with latest disk changes
  await syncIndexIfStale();

  if (!fs.existsSync(indexPath)) {
    return runRecursiveDirectoryScan();
  }

  try {
    const indexContents = fs.readFileSync(indexPath, "utf8");
    const { content } = matter(indexContents);

    const nodes: KnowledgeNode[] = [];

    // Regex matching registered asset nodes: * [Title](./relPath.md) - Description
    const indexLineRegex = /\*\s+\[([^\]]+)\]\(\.\/([^)]+)\.md\)\s+-\s+(.+)/g;
    let match;

    while ((match = indexLineRegex.exec(content)) !== null) {
      const [_, title, relPath, description] = match;
      const filename = path.parse(relPath).name;

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

    const matchedAbsolutePath = findAbsolutePath(filenameWithoutExt);
    if (!matchedAbsolutePath) return null;

    const fileContents = fs.readFileSync(matchedAbsolutePath, "utf8");
    const { data, content } = matter(fileContents);
    const metadata = data as OKFFrontMatter;

    const relativeTargetData = path.relative(kbDirectory, matchedAbsolutePath);
    const cleanRelPath = relativeTargetData
      .replace(/\\/g, "/")
      .replace(/\.md$/, "");

    const targetNode: KnowledgeNode = {
      filename: path.parse(matchedAbsolutePath).name,
      relPath: cleanRelPath,
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
    const allMarkdownFiles = getAllMarkdownFiles(kbDirectory);
    const connectedNodesMap = new Map<string, ConnectedNodeSummary>();

    for (const absPath of allMarkdownFiles) {
      const fileSlug = path.parse(absPath).name;
      if (
        fileSlug === targetNode.filename ||
        absPath.endsWith("index.md") ||
        absPath.endsWith("log.md")
      ) {
        continue;
      }

      try {
        const raw = fs.readFileSync(absPath, "utf8");
        const isPointingToTarget =
          raw.includes(`./${targetNode.relPath}.md`) ||
          raw.includes(`/${targetNode.relPath}.md`) ||
          raw.includes(`./${targetNode.filename}.md`) ||
          raw.includes(`/${targetNode.filename}.md`) ||
          raw.includes(`(${targetNode.filename}.md)`);

        if (isPointingToTarget) {
          const { data: otherData } = matter(raw);
          const otherRelPath = path
            .relative(kbDirectory, absPath)
            .replace(/\\/g, "/")
            .replace(/\.md$/, "");

          connectedNodesMap.set(fileSlug, {
            filename: fileSlug,
            relPath: otherRelPath,
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
    const matchedPath = findAbsolutePath(filename);
    if (!matchedPath) return null;

    const fileContent = fs.readFileSync(matchedPath, "utf8");

    // Chronological read tracker updates inside root logs
    const timestamp = new Date().toISOString();
    const logPath = path.join(kbDirectory, "log.md");
    const logEntry = `- [${timestamp}] READ [${filename}] - Deep nested content queried autonomously by agent.\n`;

    if (fs.existsSync(logPath)) {
      fs.appendFileSync(logPath, logEntry, "utf8");
    }

    return fileContent;
  } catch {
    return null;
  }
}

function runRecursiveDirectoryScan(): KnowledgeNode[] {
  const allAbsolutePaths = getAllMarkdownFiles(kbDirectory);
  const targetFiles = allAbsolutePaths.filter(
    (p) => !p.endsWith("index.md") && !p.endsWith("log.md"),
  );

  return targetFiles.map((absolutePath) => {
    const fileContents = fs.readFileSync(absolutePath, "utf8");
    const { data } = matter(fileContents);
    const relativeTargetData = path.relative(kbDirectory, absolutePath);
    const cleanRelPath = relativeTargetData
      .replace(/\\/g, "/")
      .replace(/\.md$/, "");

    return {
      filename: path.parse(absolutePath).name,
      relPath: cleanRelPath,
      type: (data as OKFFrontMatter).type || "Unknown",
      metadata: data as OKFFrontMatter,
      rawContent: "",
    };
  });
}
