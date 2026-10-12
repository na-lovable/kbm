import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { githubContext, GitHubContext } from "./context";
import {
  ensureUserRepo,
  getGitHubToken,
  getUserProfile,
} from "@/lib/db/user-profiles";

/**
 * Resolve the current user's GitHub context (token + repo config) and
 * run `fn` inside an AsyncLocalStorage scope so the storage layer
 * (file-store / index-manager) targets the correct repository.
 *
 * Falls back to the env-based singleton (GITHUB_TOKEN) when:
 * - the user is not authenticated, or
 * - the user has no GitHub token / profile yet.
 */
export async function runWithUserGitHub<T>(fn: () => Promise<T>): Promise<T> {
  let ctx: GitHubContext | undefined;

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user?.id) {
      const token = await getGitHubToken(session.user.id);
      if (token) {
        let profile = await getUserProfile(session.user.id);
        if (!profile) {
          // Lazy auto-create: on first app use, provision the user's repo.
          profile = await ensureUserRepo(session.user.id, token);
        }
        if (profile) {
          ctx = {
            token,
            owner: profile.repoOwner,
            repo: profile.repoName,
            branch: profile.repoBranch,
          };
        }
      }
    }
  } catch (err) {
    console.warn("[kbm] Failed to resolve user GitHub context:", err);
  }

  if (ctx) {
    return githubContext.run(ctx, fn);
  }
  // No user context — run without ALS (storage layer falls back to env singleton).
  return fn();
}
