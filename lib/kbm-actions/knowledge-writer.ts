import matter from "gray-matter";
import {
  WriteOKF,
  PatchOKF,
  MergeOKF,
  SaveRawOKFInput,
  SaveOKFResult,
} from "@/types/knowledge";
import {
  listFiles,
  readFile,
  writeFile,
  deleteFile,
  renameFile,
  batchCommit,
  FileChange,
} from "@/lib/github/file-store";
import { rebuildAllIndexes, appendToLog } from "@/lib/github/index-manager";

/**
 * Canonical domain dictionary mapping OKF type labels to normalized filesystem folders.
 */
export const CANONICAL_NAMESPACE_MAP: Record<string, string> = {
  Facility: "facilities",
  Facilities: "facilities",
  Hub: "facilities/hubs",
  Charging: "facilities/charging",
  Avionics: "avionics",
  FlightControl: "avionics/flight-control",
  Navigation: "avionics/navigation",
  Safety: "safety",
  Protocol: "safety/protocols",
  Regulation: "safety/regulations",
  Operation: "operations",
  Operations: "operations",
  Fleet: "fleet",
  UAV: "fleet/urban-courier",
  HeavyLift: "fleet/heavy-lift",
  Power: "power",
  EnergyStorage: "power/energy-storage",
  Propulsion: "power/propulsion",
  CategoryIndex: "facilities",
};

/**
 * Returns canonical folder path for an entity type or existing relative location.
 */
export function getCanonicalNamespace(
  type: string,
  existingPath?: string,
): string {
  if (existingPath) {
    const parts = existingPath.split("/");
    if (parts.length > 1) {
      return parts.slice(0, -1).join("/");
    }
  }

  const cleanType = (type || "Asset").trim();
  if (CANONICAL_NAMESPACE_MAP[cleanType]) {
    return CANONICAL_NAMESPACE_MAP[cleanType];
  }

  // Handle plural / singular standard forms cleanly
  const lower = cleanType.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (lower.endsWith("s")) return lower;
  return `${lower}s`;
}

/**
 * Collects all markdown files within the knowledge base from GitHub.
 */
export async function getAllMarkdownFiles(): Promise<string[]> {
  return listFiles();
}

/**
 * Locates a relative file path matching a query (slug or relative path).
 */
export async function findAbsolutePath(
  filenameQuery: string,
): Promise<string | null> {
  const allPaths = await listFiles();
  const cleanQuery = filenameQuery
    .replace(/\\/g, "/")
    .replace(/\.md$/, "")
    .toLowerCase();

  // 1. Try relative path match
  const relMatch = allPaths.find(
    (p) => p.toLowerCase() === cleanQuery,
  );
  if (relMatch) return relMatch;

  // 2. Try filename slug match
  return allPaths.find((p) => {
    const name = p.split("/").pop() || p;
    return name.toLowerCase() === cleanQuery;
  }) || null;
}

/**
 * Scans all markdown files in the repository and updates cross-links pointing from oldSlug to newSlug.
 */
export async function rewriteAssetReferences(
  oldSlug: string,
  newSlug: string,
): Promise<{ updatedFiles: string[] }> {
  const allFiles = await listFiles();
  const updatedFiles: string[] = [];

  const cleanOld = oldSlug.replace(/\\/g, "/").replace(/\.md$/, "");
  const cleanNew = newSlug.replace(/\\/g, "/").replace(/\.md$/, "");
  const oldBaseName = cleanOld.split("/").pop() || cleanOld;
  const newBaseName = cleanNew.split("/").pop() || cleanNew;

  const changes: FileChange[] = [];

  for (const relPath of allFiles) {
    if (relPath === "log") continue;

    try {
      const original = await readFile(relPath);
      if (!original) continue;

      let content = original;

      // Replace explicit full paths
      content = content.replaceAll(`./${cleanOld}.md`, `./${cleanNew}.md`);
      content = content.replaceAll(`/${cleanOld}.md`, `/${cleanNew}.md`);

      // Replace basenames in relative links
      if (oldBaseName !== newBaseName) {
        content = content.replaceAll(
          `./${oldBaseName}.md`,
          `./${newBaseName}.md`,
        );
        content = content.replaceAll(
          `/${oldBaseName}.md`,
          `/${newBaseName}.md`,
        );
      }

      if (content !== original) {
        changes.push({ path: relPath, content });
        updatedFiles.push(relPath);
      }
    } catch (err) {
      console.warn("Failed to rewrite references in file:", relPath, err);
    }
  }

  // Batch commit all changes
  if (changes.length > 0) {
    await batchCommit(
      changes,
      [],
      `Rewrite references: ${oldSlug} → ${newSlug}`,
    );
  }

  return { updatedFiles };
}

/**
 * Removes markdown links pointing to a deleted slug across the repository.
 */
export async function removeAssetReferences(deletedSlug: string): Promise<{
  updatedFiles: string[];
}> {
  const allFiles = await listFiles();
  const updatedFiles: string[] = [];

  const cleanDeleted = deletedSlug.replace(/\\/g, "/").replace(/\.md$/, "");
  const deletedBaseName = cleanDeleted.split("/").pop() || cleanDeleted;

  const linkPatterns = [
    new RegExp(`\\[[^\\]]*\\]\\(\\./${escapeRegex(cleanDeleted)}\\.md\\)`, "g"),
    new RegExp(`\\[[^\\]]*\\]\\(/${escapeRegex(cleanDeleted)}\\.md\\)`, "g"),
    new RegExp(
      `\\[[^\\]]*\\]\\(\\./${escapeRegex(deletedBaseName)}\\.md\\)`,
      "g",
    ),
    new RegExp(`\\[[^\\]]*\\]\\(/${escapeRegex(deletedBaseName)}\\.md\\)`, "g"),
  ];

  const changes: FileChange[] = [];

  for (const relPath of allFiles) {
    if (relPath === "log") continue;

    try {
      const original = await readFile(relPath);
      if (!original) continue;

      let content = original;

      for (const pattern of linkPatterns) {
        content = content.replace(pattern, "");
      }

      // Clean up empty list items left behind
      content = content.replace(/^\s*-\s*\n/gm, "");

      if (content !== original) {
        changes.push({ path: relPath, content });
        updatedFiles.push(relPath);
      }
    } catch (err) {
      console.warn("Failed to remove references in file:", relPath, err);
    }
  }

  // Batch commit all changes
  if (changes.length > 0) {
    await batchCommit(
      changes,
      [],
      `Remove references to deleted asset: ${deletedSlug}`,
    );
  }

  return { updatedFiles };
}

/**
 * Renames an OKF asset, rewriting cross-references across the repository.
 */
export async function renameOKFAsset({
  oldFilename,
  newFilename,
  type,
}: {
  oldFilename: string;
  newFilename: string;
  type?: string;
}): Promise<{
  success: boolean;
  message: string;
  filename: string;
  relPath: string;
  rewrittenFiles: string[];
}> {
  try {
    const oldSlug = oldFilename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const newSlug = newFilename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    if (!oldSlug || !newSlug) {
      return {
        success: false,
        message: "Both old and new slugs are required.",
        filename: "",
        relPath: "",
        rewrittenFiles: [],
      };
    }

    if (oldSlug === newSlug) {
      return {
        success: true,
        message: "Slug unchanged.",
        filename: oldSlug,
        relPath: "",
        rewrittenFiles: [],
      };
    }

    const existingPath = await findAbsolutePath(oldSlug);
    if (!existingPath) {
      return {
        success: false,
        message: `Source asset '${oldSlug}' not found.`,
        filename: "",
        relPath: "",
        rewrittenFiles: [],
      };
    }

    const collision = await findAbsolutePath(newSlug);
    if (collision && collision !== existingPath) {
      return {
        success: false,
        message: `A concept with slug '${newSlug}' already exists at ${collision}.`,
        filename: "",
        relPath: "",
        rewrittenFiles: [],
      };
    }

    const raw = await readFile(existingPath);
    if (!raw) {
      return {
        success: false,
        message: `Source asset '${oldSlug}' not found.`,
        filename: "",
        relPath: "",
        rewrittenFiles: [],
      };
    }

    const { data, content } = matter(raw);
    const assetType = type || data.type || "Asset";

    let targetFolder = existingPath.split("/").slice(0, -1).join("/");
    if (type && type !== data.type) {
      const newNamespace = getCanonicalNamespace(type);
      targetFolder = newNamespace;
    }

    const newRelPath = targetFolder
      ? `${targetFolder}/${newSlug}`
      : newSlug;

    data.type = assetType;
    data.timestamp = new Date().toISOString();

    const updatedContent = matter.stringify(content.trim() + "\n", data);

    // Delete old file and create new one
    const deletions = existingPath !== newRelPath ? [existingPath] : [];
    const changes: FileChange[] = [{ path: newRelPath, content: updatedContent }];

    await batchCommit(
      changes,
      deletions,
      `Rename: ${oldSlug} → ${newSlug}`,
    );

    const oldRelPath = existingPath;

    const rewriteRes = await rewriteAssetReferences(oldRelPath, newRelPath);

    const timestamp = new Date().toISOString();
    await appendToLog(
      `RENAMED [${oldSlug}] → [${newSlug}] - Updated references in ${rewriteRes.updatedFiles.length} files`,
    );

    await rebuildNestedIndexFile();

    return {
      success: true,
      message: `Renamed '${oldSlug}' to '${newSlug}'. Updated ${rewriteRes.updatedFiles.length} referencing file(s).`,
      filename: newSlug,
      relPath: newRelPath,
      rewrittenFiles: rewriteRes.updatedFiles,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Rename failed: ${err.message}`,
      filename: "",
      relPath: "",
      rewrittenFiles: [],
    };
  }
}

/**
 * Crawls nested sub-directories to re-compile subfolder index.md files and master root index.md.
 */
export async function rebuildNestedIndexFile(): Promise<void> {
  const allRelPaths = await listFiles();
  const assetFiles = allRelPaths.filter(
    (p) => !p.endsWith("/index") && p !== "index" && p !== "log",
  );

  // Read all files to get frontmatter
  const filesWithFrontmatter: Array<{
    relPath: string;
    frontmatter: Record<string, any>;
  }> = [];

  for (const relPath of assetFiles) {
    try {
      const raw = await readFile(relPath);
      if (!raw) continue;
      const { data } = matter(raw);
      filesWithFrontmatter.push({ relPath, frontmatter: data });
    } catch (e) {
      console.warn("Skipping indexing for file:", relPath, e);
    }
  }

  await rebuildAllIndexes(filesWithFrontmatter);
}

/**
 * Checks if any markdown file on disk is newer than index.md. If so, runs an auto-rebuild.
 */
export async function syncIndexIfStale(): Promise<boolean> {
  const indexContent = await readFile("index");
  if (!indexContent) {
    await rebuildNestedIndexFile();
    return true;
  }

  try {
    // Get the index file's last commit date
    const { getFileHistory } = await import("@/lib/github/file-store");
    const history = await getFileHistory("index");
    const indexDate = history.length > 0 ? new Date(history[0].date).getTime() : 0;

    const allFiles = await listFiles();

    for (const relPath of allFiles) {
      if (relPath === "log" || relPath.endsWith("/index")) continue;

      const fileHistory = await getFileHistory(relPath);
      if (fileHistory.length > 0) {
        const fileDate = new Date(fileHistory[0].date).getTime();
        if (fileDate > indexDate) {
          await rebuildNestedIndexFile();
          return true;
        }
      }
    }
  } catch (err) {
    console.warn("Auto-sync check failed, rebuilding index:", err);
    await rebuildNestedIndexFile();
    return true;
  }

  return false;
}

/**
 * Saves or creates an OKF markdown file with canonical namespace routing.
 */
export async function writeOKFMarkdownFile({
  filename,
  type,
  title,
  description,
  tags,
  markdownBody,
  mode = "update",
  originalFilename,
}: WriteOKF): Promise<{
  success: boolean;
  message: string;
  filename: string;
  relPath: string;
}> {
  try {
    const humanFriendlySlug = filename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const originalSlug = originalFilename
      ? originalFilename
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "")
      : humanFriendlySlug;

    const isRename =
      mode === "update" && originalSlug && originalSlug !== humanFriendlySlug;

    if (isRename) {
      const renameRes = await renameOKFAsset({
        oldFilename: originalSlug,
        newFilename: humanFriendlySlug,
        type,
      });
      if (!renameRes.success) {
        return {
          success: false,
          message: renameRes.message,
          filename: humanFriendlySlug,
          relPath: "",
        };
      }
    }

    // Check if the file already exists anywhere in the repository
    const existingPath = await findAbsolutePath(humanFriendlySlug);
    let targetFolder: string;
    let namespaceFolder: string;

    if (existingPath) {
      const parts = existingPath.split("/");
      targetFolder = parts.slice(0, -1).join("/");
      namespaceFolder = targetFolder;
    } else {
      if (mode === "create") {
        const collision = await findAbsolutePath(humanFriendlySlug);
        if (collision) {
          return {
            success: false,
            message: `A concept with slug '${humanFriendlySlug}' already exists at ${collision}.`,
            filename: humanFriendlySlug,
            relPath: "",
          };
        }
      }
      namespaceFolder = getCanonicalNamespace(type);
      targetFolder = namespaceFolder;
    }

    if (mode === "create" && existingPath) {
      return {
        success: false,
        message: `A concept with slug '${humanFriendlySlug}' already exists at ${existingPath}.`,
        filename: humanFriendlySlug,
        relPath: "",
      };
    }

    const timestamp = new Date().toISOString();
    const cleanTags = (tags || []).map((t) => t.trim().toLowerCase());

    // Strip any leading H1 headings from markdownBody to prevent duplicate titles
    let cleanBody = (markdownBody || "").trim();
    while (/^\s*#[^\n]*(\n+|$)/.test(cleanBody)) {
      cleanBody = cleanBody.replace(/^\s*#[^\n]*(\n+|$)/, "").trim();
    }

    const okfContent = `---
type: ${type}
title: ${title}
description: ${description}
tags: [${cleanTags.join(", ")}]
timestamp: ${timestamp}
---
# ${title}

${cleanBody}
`;

    const targetRelPath = namespaceFolder
      ? `${namespaceFolder}/${humanFriendlySlug}`
      : humanFriendlySlug;

    await writeFile(
      targetRelPath,
      okfContent,
      `${mode === "create" ? "Create" : "Update"} asset: ${title}`,
    );

    await appendToLog(
      `REGISTERED [${title}](./${targetRelPath}.md) - Namespace: ${namespaceFolder}`,
    );

    await rebuildNestedIndexFile();

    return {
      success: true,
      message: `Successfully structured inside namespace [${namespaceFolder}].`,
      filename: humanFriendlySlug,
      relPath: targetRelPath,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Storage failure: ${error.message}`,
      filename,
      relPath: "",
    };
  }
}

/**
 * Selectively patches frontmatter or appends/replaces markdown sections non-destructively.
 */
export async function patchOKFMarkdownFile({
  filename,
  title,
  description,
  tagsToAdd,
  tagsToRemove,
  appendSection,
  replaceSection,
  updatedMarkdownBody,
}: PatchOKF): Promise<{
  success: boolean;
  message: string;
  relPath?: string;
}> {
  try {
    const absPath = await findAbsolutePath(filename);
    if (!absPath) {
      return {
        success: false,
        message: `Asset '${filename}' not located in knowledge repository.`,
      };
    }

    const raw = await readFile(absPath);
    if (!raw) {
      return {
        success: false,
        message: `Asset '${filename}' not located in knowledge repository.`,
      };
    }

    const { data, content } = matter(raw);

    // Update frontmatter fields if provided
    if (title) data.title = title;
    if (description) data.description = description;

    let currentTags: string[] = Array.isArray(data.tags) ? [...data.tags] : [];
    if (tagsToAdd && tagsToAdd.length > 0) {
      const toAdd = tagsToAdd.map((t) => t.trim().toLowerCase());
      currentTags = Array.from(new Set([...currentTags, ...toAdd]));
    }
    if (tagsToRemove && tagsToRemove.length > 0) {
      const toRemove = new Set(tagsToRemove.map((t) => t.trim().toLowerCase()));
      currentTags = currentTags.filter((t) => !toRemove.has(t));
    }
    data.tags = currentTags;
    data.timestamp = new Date().toISOString();

    let newBody = content;

    if (updatedMarkdownBody) {
      newBody = updatedMarkdownBody;
    } else {
      // Replace section if requested
      if (replaceSection) {
        const headerPattern = new RegExp(
          `(^|\\n)##\\s+${escapeRegex(replaceSection.heading)}[\\s\\S]*?(?=(\\n##\\s+|$))`,
          "g",
        );
        const replacement = `\n## ${replaceSection.heading}\n\n${replaceSection.content.trim()}\n`;
        if (headerPattern.test(newBody)) {
          newBody = newBody.replace(headerPattern, replacement);
        } else {
          newBody = `${newBody.trim()}\n\n## ${replaceSection.heading}\n\n${replaceSection.content.trim()}\n`;
        }
      }

      // Append section if requested
      if (appendSection) {
        newBody = `${newBody.trim()}\n\n## ${appendSection.heading}\n\n${appendSection.content.trim()}\n`;
      }
    }

    const newContent = matter.stringify(newBody.trim() + "\n", data);
    await writeFile(absPath, newContent, `Patch asset: ${data.title || filename}`);

    await appendToLog(
      `PATCHED [${data.title || filename}](./${absPath}.md) - Non-destructive section/metadata update`,
    );

    await rebuildNestedIndexFile();

    return {
      success: true,
      message: `Successfully patched asset [${absPath}].`,
      relPath: absPath,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to patch asset: ${err.message}`,
    };
  }
}

/**
 * Consolidates multiple source assets into a single canonical target asset and rewrites cross-references.
 */
export async function mergeOKFMarkdownFiles({
  sourceFilenames,
  targetFilename,
  type,
  title,
  description,
  tags,
  markdownBody,
}: MergeOKF): Promise<{
  success: boolean;
  message: string;
  targetRelPath: string;
  rewrittenFiles: string[];
}> {
  try {
    // 1. Write the canonical target file
    const writeRes = await writeOKFMarkdownFile({
      filename: targetFilename,
      type,
      title,
      description,
      tags,
      markdownBody,
    });

    if (!writeRes.success) {
      throw new Error(writeRes.message);
    }

    const targetSlug = writeRes.filename;
    const allRewrittenFiles: string[] = [];

    // 2. For each source file, rewrite incoming references to point to targetSlug, then delete source
    for (const src of sourceFilenames) {
      const srcSlug = src.split("/").pop()?.toLowerCase() || src.toLowerCase();
      if (srcSlug === targetSlug) continue;

      // Rewrite references across repository
      const rewriteRes = await rewriteAssetReferences(srcSlug, targetSlug);
      allRewrittenFiles.push(...rewriteRes.updatedFiles);

      // Decommission source asset
      await deleteOKFMarkdownFile(srcSlug);
    }

    await appendToLog(
      `CONSOLIDATED [${sourceFilenames.join(", ")}] → [${title}](./${writeRes.relPath}.md) - Rewrote references in ${allRewrittenFiles.length} files`,
    );

    await rebuildNestedIndexFile();

    return {
      success: true,
      message: `Successfully merged [${sourceFilenames.join(", ")}] into [${writeRes.relPath}].`,
      targetRelPath: writeRes.relPath,
      rewrittenFiles: Array.from(new Set(allRewrittenFiles)),
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Consolidation failure: ${err.message}`,
      targetRelPath: "",
      rewrittenFiles: [],
    };
  }
}

/**
 * Searches and removes a file out of any nested subdirectory matching its name.
 */
export async function deleteOKFMarkdownFile(
  filename: string,
  options: { removeReferences?: boolean } = {},
): Promise<{ success: boolean; message: string; updatedFiles?: string[] }> {
  try {
    const slug = filename.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const foundPath = await findAbsolutePath(slug);
    if (!foundPath) {
      return {
        success: false,
        message: "Target file not located in nested structure.",
      };
    }

    await deleteFile(foundPath, `Decommission asset: ${slug}.md`);

    let updatedFiles: string[] = [];
    if (options.removeReferences) {
      const removeRes = await removeAssetReferences(slug);
      updatedFiles = removeRes.updatedFiles;
    }

    await appendToLog(
      `DECOMMISSIONED [${slug}].md from subfolders.${updatedFiles.length > 0 ? ` Removed references in ${updatedFiles.length} file(s).` : ""}`,
    );

    await rebuildNestedIndexFile();
    return {
      success: true,
      message:
        updatedFiles.length > 0
          ? `Removed file and cleaned references in ${updatedFiles.length} file(s).`
          : "Successfully removed file from nested directories and recomputed index mappings.",
      updatedFiles,
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Saves a raw markdown string with YAML frontmatter, ensuring valid namespace placement and indexing.
 */
export async function saveRawOKFMarkdownFile({
  filename,
  rawContent,
  relPath,
  mode = "update",
  originalFilename,
}: SaveRawOKFInput): Promise<SaveOKFResult> {
  try {
    let parsedData: Record<string, any> = {};
    let markdownBody = rawContent;

    try {
      const parsed = matter(rawContent);
      parsedData = parsed.data || {};
      markdownBody = parsed.content || "";
    } catch (parseErr: any) {
      return {
        success: false,
        message: `YAML frontmatter parsing error: ${parseErr.message}`,
        filename,
        relPath: relPath || filename,
      };
    }

    const title = parsedData.title || filename;
    const type = parsedData.type || "Asset";
    const humanFriendlySlug = filename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const originalSlug = originalFilename
      ? originalFilename
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "")
      : humanFriendlySlug;

    const isRename =
      mode === "update" && originalSlug && originalSlug !== humanFriendlySlug;

    if (isRename) {
      const renameRes = await renameOKFAsset({
        oldFilename: originalSlug,
        newFilename: humanFriendlySlug,
        type,
      });
      if (!renameRes.success) {
        return {
          success: false,
          message: renameRes.message,
          filename: humanFriendlySlug,
          relPath: "",
        };
      }
    }

    const existingPath = await findAbsolutePath(humanFriendlySlug);
    let targetFolder: string;
    let namespaceFolder: string;

    if (existingPath) {
      const parts = existingPath.split("/");
      targetFolder = parts.slice(0, -1).join("/");
      namespaceFolder = targetFolder;
    } else {
      if (mode === "create") {
        const collision = await findAbsolutePath(humanFriendlySlug);
        if (collision) {
          return {
            success: false,
            message: `A concept with slug '${humanFriendlySlug}' already exists at ${collision}.`,
            filename: humanFriendlySlug,
            relPath: "",
          };
        }
      }
      namespaceFolder = getCanonicalNamespace(type, relPath);
      targetFolder = namespaceFolder;
    }

    if (mode === "create" && existingPath) {
      return {
        success: false,
        message: `A concept with slug '${humanFriendlySlug}' already exists at ${existingPath}.`,
        filename: humanFriendlySlug,
        relPath: "",
      };
    }

    // Ensure timestamp is present or updated
    parsedData.timestamp = parsedData.timestamp || new Date().toISOString();
    // Ensure body has a single top-level title H1 heading
    let cleanBody = (markdownBody || "").trim();
    while (/^\s*#[^\n]*(\n+|$)/.test(cleanBody)) {
      cleanBody = cleanBody.replace(/^\s*#[^\n]*(\n+|$)/, "").trim();
    }
    const finalBody = `# ${title}\n\n${cleanBody}\n`;

    const contentToWrite = matter.stringify(finalBody, parsedData);

    const targetRelPath = namespaceFolder
      ? `${namespaceFolder}/${humanFriendlySlug}`
      : humanFriendlySlug;

    await writeFile(
      targetRelPath,
      contentToWrite,
      `${mode === "create" ? "Create" : "Update"} asset: ${title}`,
    );

    await appendToLog(
      `UPDATED [${title}](./${targetRelPath}.md) - Direct Editor Write`,
    );

    await rebuildNestedIndexFile();

    return {
      success: true,
      message: `Saved ${humanFriendlySlug}.md successfully.`,
      filename: humanFriendlySlug,
      relPath: targetRelPath,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to save file: ${err.message}`,
      filename,
      relPath: relPath || filename,
    };
  }
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
