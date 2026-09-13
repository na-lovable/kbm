import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  WriteOKF,
  PatchOKF,
  MergeOKF,
  SaveRawOKFInput,
  SaveOKFResult,
} from "@/types/knowledge";

const kbDirectory = path.join(process.cwd(), "knowledge-base");

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
    const parentDir = path.dirname(existingPath).replace(/\\/g, "/");
    if (parentDir && parentDir !== "." && parentDir !== "") {
      return parentDir;
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
 * Collects all markdown files within the knowledge base directory recursively.
 */
export function getAllMarkdownFiles(
  dirPath: string = kbDirectory,
  arrayOfFiles: string[] = [],
): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const absolutePath = path.join(dirPath, file);
    if (fs.statSync(absolutePath).isDirectory()) {
      arrayOfFiles = getAllMarkdownFiles(absolutePath, arrayOfFiles);
    } else if (file.endsWith(".md")) {
      arrayOfFiles.push(absolutePath);
    }
  });

  return arrayOfFiles;
}

/**
 * Locates an absolute file path matching a query (slug or relative path).
 */
export function findAbsolutePath(
  filenameQuery: string,
  allPaths?: string[],
): string | undefined {
  const paths = allPaths || getAllMarkdownFiles(kbDirectory);
  const cleanQuery = filenameQuery
    .replace(/\\/g, "/")
    .replace(/\.md$/, "")
    .toLowerCase();

  // 1. Try relative path match (e.g. 'facilities/charging/automated-battery-swap-station')
  const relMatch = paths.find((p) => {
    const rel = path
      .relative(kbDirectory, p)
      .replace(/\\/g, "/")
      .replace(/\.md$/, "")
      .toLowerCase();
    return rel === cleanQuery;
  });
  if (relMatch) return relMatch;

  // 2. Try filename slug match (e.g. 'automated-battery-swap-station')
  return paths.find((p) => path.parse(p).name.toLowerCase() === cleanQuery);
}

/**
 * Scans all markdown files in the repository and updates cross-links pointing from oldSlug to newSlug.
 */
export function rewriteAssetReferences(
  oldSlug: string,
  newSlug: string,
): { updatedFiles: string[] } {
  const allFiles = getAllMarkdownFiles(kbDirectory);
  const updatedFiles: string[] = [];

  const cleanOld = oldSlug.replace(/\\/g, "/").replace(/\.md$/, "");
  const cleanNew = newSlug.replace(/\\/g, "/").replace(/\.md$/, "");
  const oldBaseName = path.parse(cleanOld).name;
  const newBaseName = path.parse(cleanNew).name;

  allFiles.forEach((absPath) => {
    if (absPath.endsWith("log.md")) return;

    try {
      const original = fs.readFileSync(absPath, "utf8");
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
        fs.writeFileSync(absPath, content, "utf8");
        updatedFiles.push(
          path.relative(kbDirectory, absPath).replace(/\\/g, "/"),
        );
      }
    } catch (err) {
      console.warn("Failed to rewrite references in file:", absPath, err);
    }
  });

  return { updatedFiles };
}

/**
 * Removes markdown links pointing to a deleted slug across the repository.
 */
export function removeAssetReferences(deletedSlug: string): {
  updatedFiles: string[];
} {
  const allFiles = getAllMarkdownFiles(kbDirectory);
  const updatedFiles: string[] = [];

  const cleanDeleted = deletedSlug.replace(/\\/g, "/").replace(/\.md$/, "");
  const deletedBaseName = path.parse(cleanDeleted).name;

  const linkPatterns = [
    new RegExp(`\\[[^\\]]*\\]\\(\\./${escapeRegex(cleanDeleted)}\\.md\\)`, "g"),
    new RegExp(`\\[[^\\]]*\\]\\(/${escapeRegex(cleanDeleted)}\\.md\\)`, "g"),
    new RegExp(
      `\\[[^\\]]*\\]\\(\\./${escapeRegex(deletedBaseName)}\\.md\\)`,
      "g",
    ),
    new RegExp(`\\[[^\\]]*\\]\\(/${escapeRegex(deletedBaseName)}\\.md\\)`, "g"),
  ];

  allFiles.forEach((absPath) => {
    if (absPath.endsWith("log.md")) return;

    try {
      const original = fs.readFileSync(absPath, "utf8");
      let content = original;

      for (const pattern of linkPatterns) {
        content = content.replace(pattern, "");
      }

      // Clean up empty list items left behind
      content = content.replace(/^\s*-\s*\n/gm, "");

      if (content !== original) {
        fs.writeFileSync(absPath, content, "utf8");
        updatedFiles.push(
          path.relative(kbDirectory, absPath).replace(/\\/g, "/"),
        );
      }
    } catch (err) {
      console.warn("Failed to remove references in file:", absPath, err);
    }
  });

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

    const existingAbs = findAbsolutePath(oldSlug);
    if (!existingAbs) {
      return {
        success: false,
        message: `Source asset '${oldSlug}' not found.`,
        filename: "",
        relPath: "",
        rewrittenFiles: [],
      };
    }

    const collision = findAbsolutePath(newSlug);
    if (collision && collision !== existingAbs) {
      const collisionRel = path
        .relative(kbDirectory, collision)
        .replace(/\\/g, "/");
      return {
        success: false,
        message: `A concept with slug '${newSlug}' already exists at ${collisionRel}.`,
        filename: "",
        relPath: "",
        rewrittenFiles: [],
      };
    }

    const raw = fs.readFileSync(existingAbs, "utf8");
    const { data, content } = matter(raw);
    const assetType = type || data.type || "Asset";

    let targetFolderDirectory = path.dirname(existingAbs);
    if (type && type !== data.type) {
      const newNamespace = getCanonicalNamespace(type);
      targetFolderDirectory = path.join(kbDirectory, newNamespace);
      if (!fs.existsSync(targetFolderDirectory)) {
        fs.mkdirSync(targetFolderDirectory, { recursive: true });
      }
    }

    const newAbsPath = path.join(targetFolderDirectory, `${newSlug}.md`);
    const newRelPath = path
      .relative(kbDirectory, newAbsPath)
      .replace(/\\/g, "/")
      .replace(/\.md$/, "");

    data.type = assetType;
    data.timestamp = new Date().toISOString();

    const updatedContent = matter.stringify(content.trim() + "\n", data);
    fs.writeFileSync(newAbsPath, updatedContent, "utf8");

    if (newAbsPath !== existingAbs) {
      fs.unlinkSync(existingAbs);
    }

    const oldRelPath = path
      .relative(kbDirectory, existingAbs)
      .replace(/\\/g, "/")
      .replace(/\.md$/, "");

    const rewriteRes = rewriteAssetReferences(oldRelPath, newRelPath);

    const timestamp = new Date().toISOString();
    const logPath = path.join(kbDirectory, "log.md");
    const logEntry = `- [${timestamp}] RENAMED [${oldSlug}] ➔ [${newSlug}] - Updated references in ${rewriteRes.updatedFiles.length} files\n`;
    if (fs.existsSync(logPath)) {
      fs.appendFileSync(logPath, logEntry, "utf8");
    }

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
  if (!fs.existsSync(kbDirectory)) {
    fs.mkdirSync(kbDirectory, { recursive: true });
    return;
  }

  const allMarkdownPaths = getAllMarkdownFiles(kbDirectory).filter(
    (p) => !p.endsWith("index.md") && !p.endsWith("log.md"),
  );

  const categories: Record<
    string,
    Array<{ title: string; relPath: string; description: string; type: string }>
  > = {};

  const topLevelFolders = new Set<string>();

  allMarkdownPaths.forEach((absPath) => {
    try {
      const rawContent = fs.readFileSync(absPath, "utf8");
      const { data } = matter(rawContent);
      const typeKey = data.type || "Uncategorized";

      const relativeTargetData = path.relative(kbDirectory, absPath);
      const cleanRelPath = relativeTargetData
        .replace(/\\/g, "/")
        .replace(/\.md$/, "");

      const topFolder = cleanRelPath.split("/")[0];
      if (topFolder && topFolder !== cleanRelPath) {
        topLevelFolders.add(topFolder);
      }

      if (!categories[typeKey]) categories[typeKey] = [];
      categories[typeKey].push({
        title: data.title || path.parse(absPath).name,
        relPath: cleanRelPath,
        description: data.description || "No descriptive overview available.",
        type: typeKey,
      });
    } catch (e) {
      console.warn("Skipping indexing for corrupt element:", absPath);
    }
  });

  const timestamp = new Date().toISOString();

  // 1. Generate Subfolder Category index.md files for actual physical top-level folders
  topLevelFolders.forEach((topFolder) => {
    const targetFolder = path.join(kbDirectory, topFolder);
    if (!fs.existsSync(targetFolder)) return;

    const folderFiles = allMarkdownPaths.filter((absPath) => {
      const rel = path.relative(kbDirectory, absPath).replace(/\\/g, "/");
      return rel.startsWith(`${topFolder}/`);
    });

    const folderNameFormatted =
      topFolder.charAt(0).toUpperCase() + topFolder.slice(1);

    let subIndexContent = `---
type: CategoryIndex
category: ${folderNameFormatted}
title: ${folderNameFormatted} Domain Operational Map
description: Local category index for ${topFolder} domain assets.
timestamp: ${timestamp}
---
# ${folderNameFormatted} Domain Operational Map

This index outlines all knowledge nodes registered within the ${topFolder} domain.

`;

    folderFiles.forEach((absPath) => {
      const raw = fs.readFileSync(absPath, "utf8");
      const { data } = matter(raw);
      const relToFolder = path
        .relative(targetFolder, absPath)
        .replace(/\\/g, "/");
      const title = data.title || path.parse(absPath).name;
      const description =
        data.description || "No descriptive overview available.";
      subIndexContent += `* [${title}](./${relToFolder}) - ${description}\n`;
    });

    fs.writeFileSync(
      path.join(targetFolder, "index.md"),
      subIndexContent.trim() + "\n",
      "utf8",
    );
  });

  // 2. Generate Master Root index.md
  let masterIndexContent = `---
type: Index
title: Central Operational Registry Map
description: Autogenerated progressive disclosure map grouping active supply chain category indexes and node vectors.
timestamp: ${timestamp}
---
# Central Operational Registry Map

This master index profiles active framework directory category indexes and registered asset nodes.

## Subfolder Category Indexes
`;

  Array.from(topLevelFolders)
    .sort()
    .forEach((topFolder) => {
      const folderNameFormatted =
        topFolder.charAt(0).toUpperCase() + topFolder.slice(1);
      const count = allMarkdownPaths.filter((p) => {
        const rel = path.relative(kbDirectory, p).replace(/\\/g, "/");
        return rel.startsWith(`${topFolder}/`);
      }).length;
      masterIndexContent += `* [${folderNameFormatted} Category Index](./${topFolder}/index.md) - Subfolder operational map containing ${count} asset(s)\n`;
    });

  masterIndexContent += `\n## Registered Asset Nodes\n\n`;

  Object.keys(categories)
    .sort()
    .forEach((category) => {
      masterIndexContent += `### ${category}\n`;
      categories[category]
        .sort((a, b) => a.title.localeCompare(b.title))
        .forEach((item) => {
          masterIndexContent += `* [${item.title}](./${item.relPath}.md) - ${item.description}\n`;
        });
      masterIndexContent += `\n`;
    });

  fs.writeFileSync(
    path.join(kbDirectory, "index.md"),
    masterIndexContent.trim() + "\n",
    "utf8",
  );
}

/**
 * Checks if any markdown file on disk is newer than index.md. If so, runs an auto-rebuild.
 */
export async function syncIndexIfStale(): Promise<boolean> {
  const indexPath = path.join(kbDirectory, "index.md");
  if (!fs.existsSync(indexPath)) {
    await rebuildNestedIndexFile();
    return true;
  }

  try {
    const indexMTime = fs.statSync(indexPath).mtimeMs;
    const allFiles = getAllMarkdownFiles(kbDirectory);

    for (const filePath of allFiles) {
      if (filePath.endsWith("log.md") || filePath.endsWith("index.md"))
        continue;
      const fileMTime = fs.statSync(filePath).mtimeMs;
      if (fileMTime > indexMTime) {
        await rebuildNestedIndexFile();
        return true;
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
    const existingAbs = findAbsolutePath(humanFriendlySlug);
    let targetFolderDirectory: string;
    let namespaceFolder: string;

    if (existingAbs) {
      targetFolderDirectory = path.dirname(existingAbs);
      namespaceFolder = path
        .relative(kbDirectory, targetFolderDirectory)
        .replace(/\\/g, "/");
    } else {
      if (mode === "create") {
        const collision = findAbsolutePath(humanFriendlySlug);
        if (collision) {
          const collisionRel = path
            .relative(kbDirectory, collision)
            .replace(/\\/g, "/");
          return {
            success: false,
            message: `A concept with slug '${humanFriendlySlug}' already exists at ${collisionRel}.`,
            filename: humanFriendlySlug,
            relPath: "",
          };
        }
      }
      namespaceFolder = getCanonicalNamespace(type);
      targetFolderDirectory = path.join(kbDirectory, namespaceFolder);
    }

    if (mode === "create" && existingAbs) {
      const collisionRel = path
        .relative(kbDirectory, existingAbs)
        .replace(/\\/g, "/");
      return {
        success: false,
        message: `A concept with slug '${humanFriendlySlug}' already exists at ${collisionRel}.`,
        filename: humanFriendlySlug,
        relPath: "",
      };
    }

    if (!fs.existsSync(targetFolderDirectory)) {
      fs.mkdirSync(targetFolderDirectory, { recursive: true });
    }

    const fullPath = path.join(
      targetFolderDirectory,
      `${humanFriendlySlug}.md`,
    );
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
    fs.writeFileSync(fullPath, okfContent, "utf8");

    const targetRelPath = namespaceFolder
      ? `${namespaceFolder}/${humanFriendlySlug}`
      : humanFriendlySlug;

    // Log the transaction in the root log
    const logPath = path.join(kbDirectory, "log.md");
    const logEntry = `- [${timestamp}] REGISTERED [${title}](./${targetRelPath}.md) - Namespace: ${namespaceFolder}\n`;

    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(
        logPath,
        `# Knowledge Base Evolution Log\n\n` + logEntry,
        "utf8",
      );
    } else {
      fs.appendFileSync(logPath, logEntry, "utf8");
    }

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
      message: `Filesystem failure: ${error.message}`,
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
    const absPath = findAbsolutePath(filename);
    if (!absPath) {
      return {
        success: false,
        message: `Asset '${filename}' not located in knowledge repository.`,
      };
    }

    const raw = fs.readFileSync(absPath, "utf8");
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

    const relPath = path
      .relative(kbDirectory, absPath)
      .replace(/\\/g, "/")
      .replace(/\.md$/, "");

    const newFrontmatterStr = matter.stringify(newBody.trim() + "\n", data);
    fs.writeFileSync(absPath, newFrontmatterStr, "utf8");

    const timestamp = new Date().toISOString();
    const logPath = path.join(kbDirectory, "log.md");
    const logEntry = `- [${timestamp}] PATCHED [${data.title || filename}](./${relPath}.md) - Non-destructive section/metadata update\n`;
    if (fs.existsSync(logPath)) {
      fs.appendFileSync(logPath, logEntry, "utf8");
    }

    await rebuildNestedIndexFile();

    return {
      success: true,
      message: `Successfully patched asset [${relPath}].`,
      relPath,
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
      const srcSlug = path.parse(src).name.toLowerCase();
      if (srcSlug === targetSlug) continue;

      // Rewrite references across repository
      const rewriteRes = rewriteAssetReferences(srcSlug, targetSlug);
      allRewrittenFiles.push(...rewriteRes.updatedFiles);

      // Decommission source asset
      await deleteOKFMarkdownFile(srcSlug);
    }

    const timestamp = new Date().toISOString();
    const logPath = path.join(kbDirectory, "log.md");
    const logEntry = `- [${timestamp}] CONSOLIDATED [${sourceFilenames.join(", ")}] ➔ [${title}](./${writeRes.relPath}.md) - Rewrote references in ${allRewrittenFiles.length} files\n`;
    if (fs.existsSync(logPath)) {
      fs.appendFileSync(logPath, logEntry, "utf8");
    }

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

    function findAndRemove(dir: string): boolean {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullP = path.join(dir, file);
        if (fs.statSync(fullP).isDirectory()) {
          if (findAndRemove(fullP)) return true;
        } else if (file === `${slug}.md`) {
          fs.unlinkSync(fullP);
          return true;
        }
      }
      return false;
    }

    const foundAndDeleted = findAndRemove(kbDirectory);
    if (!foundAndDeleted)
      return {
        success: false,
        message: "Target file not located in nested structure.",
      };

    let updatedFiles: string[] = [];
    if (options.removeReferences) {
      const removeRes = removeAssetReferences(slug);
      updatedFiles = removeRes.updatedFiles;
    }

    const timestamp = new Date().toISOString();
    fs.appendFileSync(
      path.join(kbDirectory, "log.md"),
      `- [${timestamp}] DECOMMISSIONED [${slug}].md from subfolders.${updatedFiles.length > 0 ? ` Removed references in ${updatedFiles.length} file(s).` : ""}\n`,
      "utf8",
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

    const existingAbs = findAbsolutePath(humanFriendlySlug);
    let targetFolderDirectory: string;
    let namespaceFolder: string;

    if (existingAbs) {
      targetFolderDirectory = path.dirname(existingAbs);
      namespaceFolder = path
        .relative(kbDirectory, targetFolderDirectory)
        .replace(/\\/g, "/");
    } else {
      if (mode === "create") {
        const collision = findAbsolutePath(humanFriendlySlug);
        if (collision) {
          const collisionRel = path
            .relative(kbDirectory, collision)
            .replace(/\\/g, "/");
          return {
            success: false,
            message: `A concept with slug '${humanFriendlySlug}' already exists at ${collisionRel}.`,
            filename: humanFriendlySlug,
            relPath: "",
          };
        }
      }
      namespaceFolder = getCanonicalNamespace(type, relPath);
      targetFolderDirectory = path.join(kbDirectory, namespaceFolder);
    }

    if (mode === "create" && existingAbs) {
      const collisionRel = path
        .relative(kbDirectory, existingAbs)
        .replace(/\\/g, "/");
      return {
        success: false,
        message: `A concept with slug '${humanFriendlySlug}' already exists at ${collisionRel}.`,
        filename: humanFriendlySlug,
        relPath: "",
      };
    }

    if (!fs.existsSync(targetFolderDirectory)) {
      fs.mkdirSync(targetFolderDirectory, { recursive: true });
    }

    const fullPath = path.join(
      targetFolderDirectory,
      `${humanFriendlySlug}.md`,
    );

    // Ensure timestamp is present or updated
    parsedData.timestamp = parsedData.timestamp || new Date().toISOString();
    // Ensure body has a single top-level title H1 heading
    let cleanBody = (markdownBody || "").trim();
    while (/^\s*#[^\n]*(\n+|$)/.test(cleanBody)) {
      cleanBody = cleanBody.replace(/^\s*#[^\n]*(\n+|$)/, "").trim();
    }
    const finalBody = `# ${title}\n\n${cleanBody}\n`;

    const contentToWrite = matter.stringify(finalBody, parsedData);
    fs.writeFileSync(fullPath, contentToWrite, "utf8");

    const targetRelPath = namespaceFolder
      ? `${namespaceFolder}/${humanFriendlySlug}`
      : humanFriendlySlug;

    const timestamp = new Date().toISOString();
    const logPath = path.join(kbDirectory, "log.md");
    const logEntry = `- [${timestamp}] UPDATED [${title}](./${targetRelPath}.md) - Direct Editor Write\n`;

    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(
        logPath,
        `# Knowledge Base Evolution Log\n\n` + logEntry,
        "utf8",
      );
    } else {
      fs.appendFileSync(logPath, logEntry, "utf8");
    }

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
