import { AsyncLocalStorage } from "async_hooks";

/**
 * Per-request GitHub configuration.
 * Set by `runWithUserGitHub` and read by the storage layer
 * (file-store / index-manager) so every operation targets the
 * correct user's repository.
 */
export interface GitHubContext {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export const githubContext = new AsyncLocalStorage<GitHubContext>();

/**
 * Return the active per-user GitHub context, or undefined when the
 * current execution is not running inside a user-scoped block
 * (e.g. unauthenticated / single-user mode).
 */
export function getCurrentGitHubContext(): GitHubContext | undefined {
  return githubContext.getStore();
}
