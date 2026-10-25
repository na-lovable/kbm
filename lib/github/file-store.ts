import env from "@/lib/env";
import { Octokit } from "@octokit/rest";
import matter from "gray-matter";
import { getCurrentGitHubContext } from "./context";

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

export interface RepoConfig {
  owner: string;
  repo: string;
  branch: string;
}

// ─── Octokit Instance Management ─────────────────────

const octokitCache = new Map<string, Octokit>();

function getOctokit(token: string): Octokit {
  let instance = octokitCache.get(token);
  if (!instance) {
    instance = new Octokit({ auth: token });
    octokitCache.set(token, instance);
  }
  return instance;
}

// Fallback singleton for single-user mode (env-based, no auth)
const fallbackOctokit = env.GITHUB_TOKEN
  ? getOctokit(env.GITHUB_TOKEN)
  : null;

function resolveConfig(): { octokit: Octokit; config: RepoConfig } {
  const ctx = getCurrentGitHubContext();
  if (ctx) {
    return {
      octokit: getOctokit(ctx.token),
      config: { owner: ctx.owner, repo: ctx.repo, branch: ctx.branch },
    };
  }
  if (!fallbackOctokit) {
    throw new Error(
      "GitHub not configured: no user session and no GITHUB_TOKEN environment variable.",
    );
  }
  return {
    octokit: fallbackOctokit,
    config: {
      owner: env.GITHUB_REPO_OWNER!,
      repo: env.GITHUB_REPO_NAME!,
      branch: env.GITHUB_REPO_BRANCH!,
    },
  };
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

// ─── Core CRUD Operations (implementations) ─────────

async function listFilesImpl(
  octokit: Octokit,
  config: RepoConfig,
): Promise<string[]> {
  try {
    const { data: refData } = await octokit.git.getRef({
      owner: config.owner,
      repo: config.repo,
      ref: `heads/${config.branch}`,
    });

    const commitSha = refData.object.sha;

    const { data: treeData } = await octokit.git.getTree({
      owner: config.owner,
      repo: config.repo,
      tree_sha: commitSha,
      recursive: "1",
    });

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

async function readFileImpl(
  octokit: Octokit,
  config: RepoConfig,
  relPath: string,
): Promise<string | null> {
  try {
    const repoPath = toRepoPath(relPath);
    const { data } = await octokit.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: repoPath,
      ref: config.branch,
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

async function readFileWithFrontMatterImpl(
  octokit: Octokit,
  config: RepoConfig,
  relPath: string,
): Promise<{ data: Record<string, any>; content: string } | null> {
  const raw = await readFileImpl(octokit, config, relPath);
  if (!raw) return null;

  const { data, content } = matter(raw);
  return { data, content };
}

async function writeFileImpl(
  octokit: Octokit,
  config: RepoConfig,
  relPath: string,
  content: string,
  message: string,
): Promise<{ success: boolean; sha?: string }> {
  try {
    const repoPath = toRepoPath(relPath);

    let existingSha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner: config.owner,
        repo: config.repo,
        path: repoPath,
        ref: config.branch,
      });
      if ("sha" in data) {
        existingSha = data.sha;
      }
    } catch {
      // File doesn't exist yet — that's fine for creation
    }

    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: config.owner,
      repo: config.repo,
      path: repoPath,
      message,
      content: encodeContent(content),
      sha: existingSha,
      branch: config.branch,
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

async function deleteFileImpl(
  octokit: Octokit,
  config: RepoConfig,
  relPath: string,
  message: string,
): Promise<{ success: boolean }> {
  try {
    const repoPath = toRepoPath(relPath);

    const { data } = await octokit.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: repoPath,
      ref: config.branch,
    });

    if (!("sha" in data)) {
      throw new Error(`File ${relPath} not found`);
    }

    await octokit.repos.deleteFile({
      owner: config.owner,
      repo: config.repo,
      path: repoPath,
      message,
      sha: data.sha,
      branch: config.branch,
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

async function renameFileImpl(
  octokit: Octokit,
  config: RepoConfig,
  oldRelPath: string,
  newRelPath: string,
  message: string,
): Promise<{ success: boolean }> {
  const content = await readFileImpl(octokit, config, oldRelPath);
  if (content === null) {
    throw new Error(`Source file ${oldRelPath} not found`);
  }

  await deleteFileImpl(octokit, config, oldRelPath, `Rename: ${oldRelPath} → ${newRelPath}`);
  await writeFileImpl(octokit, config, newRelPath, content, message);

  return { success: true };
}

async function getFileHistoryImpl(
  octokit: Octokit,
  config: RepoConfig,
  relPath: string,
): Promise<Array<{ sha: string; date: string; message: string }>> {
  try {
    const repoPath = toRepoPath(relPath);
    const { data } = await octokit.repos.listCommits({
      owner: config.owner,
      repo: config.repo,
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

async function getFileAtCommitImpl(
  octokit: Octokit,
  config: RepoConfig,
  relPath: string,
  commitSha: string,
): Promise<string | null> {
  try {
    const repoPath = toRepoPath(relPath);
    const { data } = await octokit.repos.getContent({
      owner: config.owner,
      repo: config.repo,
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

// ─── Batch Operations (implementations) ─────────────

async function batchCommitImpl(
  octokit: Octokit,
  config: RepoConfig,
  changes: FileChange[],
  deletions: string[],
  message: string,
): Promise<{ success: boolean; sha?: string }> {
  try {
    const { data: refData } = await octokit.git.getRef({
      owner: config.owner,
      repo: config.repo,
      ref: `heads/${config.branch}`,
    });

    const latestCommitSha = refData.object.sha;

    const { data: commitData } = await octokit.git.getCommit({
      owner: config.owner,
      repo: config.repo,
      commit_sha: latestCommitSha,
    });

    const baseTreeSha = commitData.tree.sha;

    const treeEntries: Array<{
      path: string;
      mode: "100644";
      type: "blob";
      sha?: string;
      content?: string;
    }> = [];

    for (const change of changes) {
      const repoPath = toRepoPath(change.path);
      treeEntries.push({
        path: repoPath,
        mode: "100644",
        type: "blob",
        content: change.content,
      });
    }

    for (const delPath of deletions) {
      const repoPath = toRepoPath(delPath);
      treeEntries.push({
        path: repoPath,
        mode: "100644",
        type: "blob",
        sha: null as any,
      });
    }

    const { data: newTree } = await octokit.git.createTree({
      owner: config.owner,
      repo: config.repo,
      base_tree: baseTreeSha,
      tree: treeEntries,
    });

    const { data: newCommit } = await octokit.git.createCommit({
      owner: config.owner,
      repo: config.repo,
      message,
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    await octokit.git.updateRef({
      owner: config.owner,
      repo: config.repo,
      ref: `heads/${config.branch}`,
      sha: newCommit.sha,
      force: false,
    });

    return { success: true, sha: newCommit.sha };
  } catch (error: any) {
    console.error("Batch commit failed:", error.message);
    throw new Error(`Batch commit failed: ${error.message}`);
  }
}

// ─── Utility (implementations) ────────────────────────

async function healthCheckImpl(
  octokit: Octokit,
  config: RepoConfig,
): Promise<{
  connected: boolean;
  repo?: string;
  error?: string;
}> {
  try {
    const { data } = await octokit.repos.get({
      owner: config.owner,
      repo: config.repo,
    });
    return { connected: true, repo: data.full_name };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
}

async function getFileShaImpl(
  octokit: Octokit,
  config: RepoConfig,
  relPath: string,
): Promise<string | null> {
  try {
    const repoPath = toRepoPath(relPath);
    const { data } = await octokit.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: repoPath,
      ref: config.branch,
    });
    return "sha" in data ? data.sha : null;
  } catch {
    return null;
  }
}

// ─── Public API (ALS-aware, backward compatible) ────

export async function listFiles(): Promise<string[]> {
  const { octokit, config } = resolveConfig();
  return listFilesImpl(octokit, config);
}

export async function readFile(relPath: string): Promise<string | null> {
  const { octokit, config } = resolveConfig();
  return readFileImpl(octokit, config, relPath);
}

export async function readFileWithFrontMatter(
  relPath: string,
): Promise<{ data: Record<string, any>; content: string } | null> {
  const { octokit, config } = resolveConfig();
  return readFileWithFrontMatterImpl(octokit, config, relPath);
}

export async function writeFile(
  relPath: string,
  content: string,
  message: string,
): Promise<{ success: boolean; sha?: string }> {
  const { octokit, config } = resolveConfig();
  return writeFileImpl(octokit, config, relPath, content, message);
}

export async function deleteFile(
  relPath: string,
  message: string,
): Promise<{ success: boolean }> {
  const { octokit, config } = resolveConfig();
  return deleteFileImpl(octokit, config, relPath, message);
}

export async function renameFile(
  oldRelPath: string,
  newRelPath: string,
  message: string,
): Promise<{ success: boolean }> {
  const { octokit, config } = resolveConfig();
  return renameFileImpl(octokit, config, oldRelPath, newRelPath, message);
}

export async function getFileHistory(
  relPath: string,
): Promise<Array<{ sha: string; date: string; message: string }>> {
  const { octokit, config } = resolveConfig();
  return getFileHistoryImpl(octokit, config, relPath);
}

export async function getFileAtCommit(
  relPath: string,
  commitSha: string,
): Promise<string | null> {
  const { octokit, config } = resolveConfig();
  return getFileAtCommitImpl(octokit, config, relPath, commitSha);
}

export async function batchCommit(
  changes: FileChange[],
  deletions: string[],
  message: string,
): Promise<{ success: boolean; sha?: string }> {
  const { octokit, config } = resolveConfig();
  return batchCommitImpl(octokit, config, changes, deletions, message);
}

export async function healthCheck(): Promise<{
  connected: boolean;
  repo?: string;
  error?: string;
}> {
  const { octokit, config } = resolveConfig();
  return healthCheckImpl(octokit, config);
}

export async function getFileSha(relPath: string): Promise<string | null> {
  const { octokit, config } = resolveConfig();
  return getFileShaImpl(octokit, config, relPath);
}

// ─── Factory (explicit per-user store) ──────────────

/**
 * Create a file store bound to a specific GitHub token and repository.
 * Useful for server-side operations where the user context is known
 * explicitly (e.g. auto-creating repos, background jobs, tests).
 */
export function createFileStore(
  token: string,
  config: RepoConfig,
): {
  listFiles: () => Promise<string[]>;
  readFile: (relPath: string) => Promise<string | null>;
  readFileWithFrontMatter: (
    relPath: string,
  ) => Promise<{ data: Record<string, any>; content: string } | null>;
  writeFile: (
    relPath: string,
    content: string,
    message: string,
  ) => Promise<{ success: boolean; sha?: string }>;
  deleteFile: (relPath: string, message: string) => Promise<{ success: boolean }>;
  renameFile: (
    oldRelPath: string,
    newRelPath: string,
    message: string,
  ) => Promise<{ success: boolean }>;
  getFileHistory: (
    relPath: string,
  ) => Promise<Array<{ sha: string; date: string; message: string }>>;
  getFileAtCommit: (relPath: string, commitSha: string) => Promise<string | null>;
  batchCommit: (
    changes: FileChange[],
    deletions: string[],
    message: string,
  ) => Promise<{ success: boolean; sha?: string }>;
  healthCheck: () => Promise<{ connected: boolean; repo?: string; error?: string }>;
  getFileSha: (relPath: string) => Promise<string | null>;
} {
  const octokit = getOctokit(token);
  return {
    listFiles: () => listFilesImpl(octokit, config),
    readFile: (relPath: string) => readFileImpl(octokit, config, relPath),
    readFileWithFrontMatter: (relPath: string) =>
      readFileWithFrontMatterImpl(octokit, config, relPath),
    writeFile: (relPath: string, content: string, message: string) =>
      writeFileImpl(octokit, config, relPath, content, message),
    deleteFile: (relPath: string, message: string) =>
      deleteFileImpl(octokit, config, relPath, message),
    renameFile: (oldRelPath: string, newRelPath: string, message: string) =>
      renameFileImpl(octokit, config, oldRelPath, newRelPath, message),
    getFileHistory: (relPath: string) =>
      getFileHistoryImpl(octokit, config, relPath),
    getFileAtCommit: (relPath: string, commitSha: string) =>
      getFileAtCommitImpl(octokit, config, relPath, commitSha),
    batchCommit: (changes: FileChange[], deletions: string[], message: string) =>
      batchCommitImpl(octokit, config, changes, deletions, message),
    healthCheck: () => healthCheckImpl(octokit, config),
    getFileSha: (relPath: string) => getFileShaImpl(octokit, config, relPath),
  };
}
