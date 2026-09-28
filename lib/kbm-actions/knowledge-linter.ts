import matter from "gray-matter";
import { listFiles, readFile } from "@/lib/github/file-store";

export interface LintIssue {
  file: string;
  level: "ERROR" | "WARNING" | "INFO";
  rule: string;
  message: string;
}

export interface LintReport {
  timestamp: string;
  summary: {
    totalFiles: number;
    errors: number;
    warnings: number;
    healthScore: number; // 0 - 100%
  };
  issues: LintIssue[];
}

/**
 * Knowledge Base Integrity & Schema Linter Core Engine
 */
export async function lintKnowledgeBase(): Promise<LintReport> {
  const issues: LintIssue[] = [];
  const allFiles = await listFiles();

  // Map of lowercase slugs -> relative path
  const slugMap = new Map<string, string>();
  allFiles.forEach((relPath) => {
    const slug = relPath.split("/").pop()?.toLowerCase() || relPath;
    slugMap.set(slug, relPath);
  });

  const nodeContentMap = new Map<string, { raw: string; data: any }>();

  for (const relPath of allFiles) {
    const filename = relPath.split("/").pop() || relPath;

    // Skip root log file
    if (relPath === "log") continue;

    try {
      const raw = await readFile(relPath);
      if (!raw) continue;

      const { data, content } = matter(raw);
      nodeContentMap.set(filename, { raw, data });

      // Rule 1: Frontmatter Schema Validation (OKF Compliance)
      if (filename !== "index" && !relPath.endsWith("/index")) {
        if (!data.type) {
          issues.push({
            file: relPath,
            level: "ERROR",
            rule: "schema/missing-type",
            message: "Missing mandatory 'type' field in YAML frontmatter.",
          });
        }
        if (!data.title) {
          issues.push({
            file: relPath,
            level: "ERROR",
            rule: "schema/missing-title",
            message: "Missing mandatory 'title' field in YAML frontmatter.",
          });
        }
        if (!data.description) {
          issues.push({
            file: relPath,
            level: "WARNING",
            rule: "schema/missing-description",
            message: "Missing 'description' summary overview.",
          });
        }
        if (!Array.isArray(data.tags) || data.tags.length === 0) {
          issues.push({
            file: relPath,
            level: "WARNING",
            rule: "schema/missing-tags",
            message: "Asset has no descriptive tags array.",
          });
        }
      }

      // Rule 2: Filename Naming Convention (Kebab-Case)
      if (filename !== "index" && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(filename)) {
        issues.push({
          file: relPath,
          level: "WARNING",
          rule: "naming/kebab-case",
          message: `Filename '${filename}' is not in clean kebab-case.`,
        });
      }

      // Rule 3: Broken Relative Link Checking
      const linkRegex = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
      let match;
      while ((match = linkRegex.exec(content)) !== null) {
        const targetHref = match[2];
        const targetSlug = targetHref.split("/").pop()?.replace(/\.md$/, "").toLowerCase() || "";

        if (!slugMap.has(targetSlug)) {
          issues.push({
            file: relPath,
            level: "ERROR",
            rule: "links/broken-reference",
            message: `Broken reference: '${targetHref}' (target asset '${targetSlug}' does not exist).`,
          });
        }
      }
    } catch (err: any) {
      issues.push({
        file: relPath,
        level: "ERROR",
        rule: "parser/corrupt-markdown",
        message: `Failed to parse YAML/Markdown content: ${err.message}`,
      });
    }
  }

  // Rule 4: Orphan Node Detection (0 incoming and 0 outgoing references)
  for (const relPath of allFiles) {
    const filename = relPath.split("/").pop() || relPath;

    if (filename === "index" || relPath.endsWith("/index") || relPath === "log") {
      continue;
    }

    const current = nodeContentMap.get(filename);
    if (!current) continue;

    // Check outgoing
    const linkRegex = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
    const hasOutgoing = linkRegex.test(current.raw);

    // Check incoming
    let hasIncoming = false;
    for (const [otherSlug, otherData] of Array.from(nodeContentMap.entries())) {
      if (otherSlug === filename) continue;
      if (
        otherData.raw.includes(`./${filename}.md`) ||
        otherData.raw.includes(`/${filename}.md`) ||
        otherData.raw.includes(`/${relPath}.md`)
      ) {
        hasIncoming = true;
        break;
      }
    }

    if (!hasOutgoing && !hasIncoming) {
      issues.push({
        file: relPath,
        level: "WARNING",
        rule: "graph/orphan-node",
        message: `Orphan asset node: '${filename}' has no incoming or outgoing graph links.`,
      });
    }
  }

  const errors = issues.filter((i) => i.level === "ERROR").length;
  const warnings = issues.filter((i) => i.level === "WARNING").length;

  const totalAssetNodes = allFiles.filter(
    (f) => !f.endsWith("/index") && f !== "log",
  ).length;

  // Health Score Calculation: 100 - (20 * errors + 5 * warnings) / total
  const penalty = errors * 15 + warnings * 3;
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: totalAssetNodes,
      errors,
      warnings,
      healthScore,
    },
    issues,
  };
}
