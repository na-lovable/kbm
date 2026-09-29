import env from "@/lib/env";
import { Octokit } from "@octokit/rest";
import matter from "gray-matter";

const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
const OWNER = env.GITHUB_REPO_OWNER;
const REPO = env.GITHUB_REPO_NAME;
const BRANCH = env.GITHUB_REPO_BRANCH;

// ─── Types ───────────────────────────────────────────

export interface GitHubFile {
  path: string;
  sha: string;
  content: string;
  size: number;
}

export interface FileChange {
  path: string;
  content: string;
}

// ─── Path Helpers ────────────────────────────────────

function toRepoPath(relPath: string): string {
  return relPath.endsWith(".md") ? relPath : `${relPath}.md`;
}

function fromRepoPath(path: string): string {
  return path.replace(/\.md$/, "");
}

// ─── Base64 Helpers ──────────────────────────────────

function encodeContent(content: string): string {
  return Buffer.from(content, "utf-8").toString("base64");
}

function decodeContent(encoded: string): string {
  return Buffer.from(encoded, "base64").toString("utf-8");
}

// ─── Core CRUD Operations ───────────────────────────

/**
 * List all markdown files in the repository recursively.
 * Uses Git Trees API for efficient single-request listing.
 */
export async function listFiles(): Promise<string[]> {
  try {
    // Get the latest commit SHA on the branch
    const { data: refData } = await octokit.git.getRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${BRANCH}`,
    });

    const commitSha = refData.object.sha;

    // Get the tree recursively
    const { data: treeData } = await octokit.git.getTree({
      owner: OWNER,
      repo: REPO,
      tree_sha: commitSha,
      recursive: "1",
    });

    // Filter for .md files only, return paths without .md extension
    return treeData.tree
      .filter(
        (item) =>
          item.type === "blob" &&
          item.path?.endsWith(".md") &&
          !item.path.endsWith("log.md"),
      )
      .map((item) => fromRepoPath(item.path!))
      .sort();
  } catch (error: any) {
    console.error("Failed to list files from GitHub:", error.message);
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

/**
 * Read a single file's content from the repository.
 * Returns null if file not found.
 */
export async function readFile(relPath: string): Promise<string | null> {
  try {
    const repoPath = toRepoPath(relPath);
    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: repoPath,
      ref: BRANCH,
    });

    if ("content" in data && data.content) {
      return decodeContent(data.content);
    }
    return null;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    console.error(`Failed to read file ${relPath}:`, error.message);
    throw new Error(`Failed to read file ${relPath}: ${error.message}`);
  }
}

/**
 * Read a file's frontmatter and content separately.
 */
export async function readFileWithFrontMatter(
  relPath: string,
): Promise<{ data: Record<string, any>; content: string } | null> {
  const raw = await readFile(relPath);
  if (!raw) return null;

  const { data, content } = matter(raw);
  return { data, content };
}

/**
 * Write or update a file in the repository.
 * If the file exists, it updates; otherwise creates new.
 */
export async function writeFile(
  relPath: string,
  content: string,
  message: string,
): Promise<{ success: boolean; sha?: string }> {
  try {
    const repoPath = toRepoPath(relPath);

    // Try to get existing file SHA (needed for updates)
    let existingSha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: repoPath,
        ref: BRANCH,
      });
      if ("sha" in data) {
        existingSha = data.sha;
      }
    } catch {
      // File doesn't exist yet — that's fine for creation
    }

    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: repoPath,
      message,
      content: encodeContent(content),
      sha: existingSha,
      branch: BRANCH,
    });

    return {
      success: true,
      sha: data.commit?.sha,
    };
  } catch (error: any) {
    console.error(`Failed to write file ${relPath}:`, error.message);
    throw new Error(`Failed to write file ${relPath}: ${error.message}`);
  }
}

/**
 * Delete a file from the repository.
 */
export async function deleteFile(
  relPath: string,
  message: string,
): Promise<{ success: boolean }> {
  try {
    const repoPath = toRepoPath(relPath);

    // Get the file SHA (required for deletion)
    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: repoPath,
      ref: BRANCH,
    });

    if (!("sha" in data)) {
      throw new Error(`File ${relPath} not found`);
    }

    await octokit.repos.deleteFile({
      owner: OWNER,
      repo: REPO,
      path: repoPath,
      message,
      sha: data.sha,
      branch: BRANCH,
    });

    return { success: true };
  } catch (error: any) {
    if (error.status === 404) {
      return { success: false };
    }
    console.error(`Failed to delete file ${relPath}:`, error.message);
    throw new Error(`Failed to delete file ${relPath}: ${error.message}`);
  }
}

/**
 * Rename a file (read old, delete old, create new).
 */
export async function renameFile(
  oldRelPath: string,
  newRelPath: string,
  message: string,
): Promise<{ success: boolean }> {
  // Read the old file content
  const content = await readFile(oldRelPath);
  if (content === null) {
    throw new Error(`Source file ${oldRelPath} not found`);
  }

  // Delete old file
  await deleteFile(oldRelPath, `Rename: ${oldRelPath} → ${newRelPath}`);

  // Create new file with same content
  await writeFile(newRelPath, content, message);

  return { success: true };
}

/**
 * Get commit history for a specific file.
 */
export async function getFileHistory(
  relPath: string,
): Promise<Array<{ sha: string; date: string; message: string }>> {
  try {
    const repoPath = toRepoPath(relPath);
    const { data } = await octokit.repos.listCommits({
      owner: OWNER,
      repo: REPO,
      path: repoPath,
      per_page: 50,
    });

    return data.map((commit) => ({
      sha: commit.sha,
      date: commit.commit.author?.date || "",
      message: commit.commit.message,
    }));
  } catch (error: any) {
    console.error(`Failed to get history for ${relPath}:`, error.message);
    return [];
  }
}

/**
 * Get file content at a specific commit.
 */
export async function getFileAtCommit(
  relPath: string,
  commitSha: string,
): Promise<string | null> {
  try {
    const repoPath = toRepoPath(relPath);
    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: repoPath,
      ref: commitSha,
    });

    if ("content" in data && data.content) {
      return decodeContent(data.content);
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Batch Operations ────────────────────────────────

/**
 * Perform multiple file changes in a single atomic commit.
 * Uses Git Data API for true atomic batch operations.
 */
export async function batchCommit(
  changes: FileChange[],
  deletions: string[],
  message: string,
): Promise<{ success: boolean; sha?: string }> {
  try {
    // 1. Get the latest commit on the branch
    const { data: refData } = await octokit.git.getRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${BRANCH}`,
    });

    const latestCommitSha = refData.object.sha;

    // 2. Get the base tree
    const { data: commitData } = await octokit.git.getCommit({
      owner: OWNER,
      repo: REPO,
      commit_sha: latestCommitSha,
    });

    const baseTreeSha = commitData.tree.sha;

    // 3. Build tree entries
    const treeEntries: Array<{
      path: string;
      mode: "100644";
      type: "blob";
      sha?: string;
      content?: string;
    }> = [];

    // Add file changes
    for (const change of changes) {
      const repoPath = toRepoPath(change.path);
      treeEntries.push({
        path: repoPath,
        mode: "100644",
        type: "blob",
        content: change.content,
      });
    }

    // Add deletions (sha: null removes the file)
    for (const delPath of deletions) {
      const repoPath = toRepoPath(delPath);
      treeEntries.push({
        path: repoPath,
        mode: "100644",
        type: "blob",
        sha: null as any,
      });
    }

    // 4. Create the new tree
    const { data: newTree } = await octokit.git.createTree({
      owner: OWNER,
      repo: REPO,
      base_tree: baseTreeSha,
      tree: treeEntries,
    });

    // 5. Create the commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner: OWNER,
      repo: REPO,
      message,
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    // 6. Update the branch reference
    await octokit.git.updateRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${BRANCH}`,
      sha: newCommit.sha,
      force: false,
    });

    return { success: true, sha: newCommit.sha };
  } catch (error: any) {
    console.error("Batch commit failed:", error.message);
    throw new Error(`Batch commit failed: ${error.message}`);
  }
}

// ─── Utility ─────────────────────────────────────────

/**
 * Check if the GitHub connection is working.
 */
export async function healthCheck(): Promise<{
  connected: boolean;
  repo?: string;
  error?: string;
}> {
  try {
    const { data } = await octokit.repos.get({
      owner: OWNER,
      repo: REPO,
    });
    return { connected: true, repo: data.full_name };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
}

/**
 * Get the SHA of a file (for optimistic concurrency).
 */
export async function getFileSha(relPath: string): Promise<string | null> {
  try {
    const repoPath = toRepoPath(relPath);
    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: repoPath,
      ref: BRANCH,
    });
    return "sha" in data ? data.sha : null;
  } catch {
    return null;
  }
}
