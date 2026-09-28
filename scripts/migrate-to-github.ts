/**
 * Migration Script: Push local knowledge-base/ files to GitHub repository.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-to-github.ts
 *
 * Prerequisites:
 *   - GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME env vars must be set
 *   - knowledge-base/ directory must exist with .md files
 */

import "@/lib/env";
import fs from "fs";
import path from "path";
import { writeFile, listFiles, healthCheck } from "@/lib/github/file-store";
import { rebuildAllIndexes } from "@/lib/github/index-manager";
import matter from "gray-matter";

const KB_DIRECTORY = path.join(process.cwd(), "knowledge-base");

interface MigrationResult {
  total: number;
  success: number;
  failed: number;
  failures: Array<{ path: string; error: string }>;
}

function getAllMarkdownFiles(
  dirPath: string,
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

async function migrate(): Promise<void> {
  console.log("=== Knowledge Base GitHub Migration ===\n");

  // 1. Check GitHub connectivity
  console.log("Checking GitHub connection...");
  const health = await healthCheck();
  if (!health.connected) {
    console.error(
      "ERROR: Cannot connect to GitHub. Check your credentials.\n",
      health.error,
    );
    process.exit(1);
  }
  console.log(`Connected to: ${health.repo}\n`);

  // 2. Check local directory
  if (!fs.existsSync(KB_DIRECTORY)) {
    console.error(
      `ERROR: ${KB_DIRECTORY} directory not found. Nothing to migrate.`,
    );
    process.exit(1);
  }

  // 3. Collect local files
  const allMarkdownFiles = getAllMarkdownFiles(KB_DIRECTORY);
  if (allMarkdownFiles.length === 0) {
    console.log("No .md files found in knowledge-base/. Nothing to migrate.");
    process.exit(0);
  }

  console.log(`Found ${allMarkdownFiles.length} markdown files to migrate.\n`);

  // 4. Push each file to GitHub
  const result: MigrationResult = {
    total: allMarkdownFiles.length,
    success: 0,
    failed: 0,
    failures: [],
  };

  for (const absPath of allMarkdownFiles) {
    const relPath = path
      .relative(KB_DIRECTORY, absPath)
      .replace(/\\/g, "/")
      .replace(/\.md$/, "");

    try {
      const content = fs.readFileSync(absPath, "utf8");
      await writeFile(relPath, content, `Migrate: ${relPath}.md`);
      console.log(`  OK  ${relPath}.md`);
      result.success++;
    } catch (err: any) {
      console.error(`  FAIL ${relPath}.md — ${err.message}`);
      result.failed++;
      result.failures.push({ path: relPath, error: err.message });
    }
  }

  // 5. Rebuild indexes on GitHub
  console.log("\nRebuilding index files on GitHub...");
  try {
    const allRelPaths = await listFiles();
    const filesWithFrontmatter: Array<{
      relPath: string;
      frontmatter: Record<string, any>;
    }> = [];

    for (const relPath of allRelPaths) {
      const { readFile } = await import("@/lib/github/file-store");
      const raw = await readFile(relPath);
      if (!raw) continue;
      const { data } = matter(raw);
      filesWithFrontmatter.push({ relPath, frontmatter: data });
    }

    const changedIndexes = await rebuildAllIndexes(filesWithFrontmatter);
    console.log(`  Rebuilt ${changedIndexes.length} index file(s)`);
  } catch (err: any) {
    console.error(`  Index rebuild failed: ${err.message}`);
  }

  // 6. Summary
  console.log("\n=== Migration Summary ===");
  console.log(`  Total files:   ${result.total}`);
  console.log(`  Successful:    ${result.success}`);
  console.log(`  Failed:        ${result.failed}`);

  if (result.failures.length > 0) {
    console.log("\n  Failed files:");
    result.failures.forEach((f) => console.log(`    - ${f.path}: ${f.error}`));
  }

  console.log(
    "\nNext steps:",
  );
  console.log(
    "  1. Verify files in your GitHub repo web interface",
  );
  console.log(
    "  2. Remove or archive the local knowledge-base/ directory",
  );
  console.log(
    "  3. Update your .env and Vercel env vars with real credentials",
  );
  console.log(
    "  4. Deploy and test the app end-to-end\n",
  );

  if (result.failed > 0) {
    process.exit(1);
  }
}

migrate().catch((err) => {
  console.error("Migration failed with error:", err);
  process.exit(1);
});
