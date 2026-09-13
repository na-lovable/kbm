import fs from "fs";
import path from "path";
import matter from "gray-matter";

const kbDirectory = path.join(process.cwd(), "knowledge-base");

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

function getAllMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      fileList = getAllMarkdownFiles(p, fileList);
    } else if (file.endsWith(".md")) {
      fileList.push(p);
    }
  });
  return fileList;
}

/**
 * Knowledge Base Integrity & Schema Linter Core Engine
 */
export async function lintKnowledgeBase(): Promise<LintReport> {
  const issues: LintIssue[] = [];
  const allFiles = getAllMarkdownFiles(kbDirectory);

  // Map of lowercase slugs -> relative path
  const slugMap = new Map<string, string>();
  allFiles.forEach((absPath) => {
    const slug = path.parse(absPath).name.toLowerCase();
    const rel = path.relative(kbDirectory, absPath).replace(/\\/g, "/");
    slugMap.set(slug, rel);
  });

  const nodeContentMap = new Map<string, { raw: string; data: any }>();

  allFiles.forEach((absPath) => {
    const relPath = path.relative(kbDirectory, absPath).replace(/\\/g, "/");
    const filename = path.parse(absPath).name;

    // Skip root log file
    if (relPath === "log.md") return;

    try {
      const raw = fs.readFileSync(absPath, "utf8");
      const { data, content } = matter(raw);
      nodeContentMap.set(filename, { raw, data });

      // Rule 1: Frontmatter Schema Validation (OKF Compliance)
      if (filename !== "index" && !relPath.endsWith("/index.md")) {
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
        const targetSlug = path.parse(targetHref).name.toLowerCase();

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
  });

  // Rule 4: Orphan Node Detection (0 incoming and 0 outgoing references)
  allFiles.forEach((absPath) => {
    const filename = path.parse(absPath).name;
    const relPath = path.relative(kbDirectory, absPath).replace(/\\/g, "/");

    if (filename === "index" || relPath.endsWith("/index.md") || relPath === "log.md") {
      return;
    }

    const current = nodeContentMap.get(filename);
    if (!current) return;

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
  });

  const errors = issues.filter((i) => i.level === "ERROR").length;
  const warnings = issues.filter((i) => i.level === "WARNING").length;

  const totalAssetNodes = allFiles.filter(
    (f) => !f.endsWith("index.md") && !f.endsWith("log.md")
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
