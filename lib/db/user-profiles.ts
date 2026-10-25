import { eq } from "drizzle-orm";
import { Octokit } from "@octokit/rest";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { account, userProfiles } from "@/lib/db/schema";

export interface UserProfile {
  id: string;
  userId: string;
  repoOwner: string;
  repoName: string;
  repoBranch: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Retrieve the GitHub OAuth access token for a user.
 * better-auth stores OAuth account records (including access tokens)
 * in the `account` table keyed by providerId.
 */
export async function getGitHubToken(userId: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(account)
    .where(eq(account.userId, userId));

  const githubAccount = rows.find((a) => a.providerId === "github");
  return githubAccount?.accessToken ?? null;
}

/**
 * Fetch the per-user repository configuration.
 */
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const rows = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return (rows[0] as UserProfile) ?? null;
}

/**
 * Create a user profile row. If a profile already exists (race condition
 * from concurrent first-login requests), return the existing one.
 */
export async function createUserProfile(data: {
  userId: string;
  repoOwner: string;
  repoName: string;
  repoBranch: string;
}): Promise<UserProfile> {
  const now = new Date();
  try {
    const result = await db
      .insert(userProfiles)
      .values({
        id: nanoid(),
        userId: data.userId,
        repoOwner: data.repoOwner,
        repoName: data.repoName,
        repoBranch: data.repoBranch,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return result[0] as UserProfile;
  } catch (err: any) {
    // PostgreSQL unique_violation on user_profiles.user_id
    if (err?.code === "23505") {
      const existing = await getUserProfile(data.userId);
      if (existing) return existing;
    }
    throw err;
  }
}

/**
 * Ensure the user has a dedicated knowledge-base repository.
 * - Reuses an existing profile if present.
 * - Otherwise creates a private `kbm-knowledge-base` repo under the
 *   user's GitHub account (via their OAuth token), or reuses it if it
 *   already exists, then records the config in `user_profiles`.
 */
export async function ensureUserRepo(
  userId: string,
  githubToken: string,
): Promise<UserProfile> {
  const existing = await getUserProfile(userId);
  if (existing) return existing;

  const octokit = new Octokit({ auth: githubToken });
  const repoName = process.env.KBM_DEFAULT_REPO_NAME || "kbm-knowledge-base";

  // Resolve the authenticated user's login (needed to read an existing repo)
  const { data: ghUser } = await octokit.users.getAuthenticated();
  const owner = ghUser.login;

  try {
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      private: true,
      description: "Knowledge Base Manager — auto-created knowledge repository",
      auto_init: true,
    });

    return await createUserProfile({
      userId,
      repoOwner: repo.owner.login,
      repoName: repo.name,
      repoBranch: repo.default_branch,
    });
  } catch (err: any) {
    // 422 = repo already exists under this account — reuse it
    if (err?.status === 422) {
      const { data: repo } = await octokit.repos.get({
        owner,
        repo: repoName,
      });
      return await createUserProfile({
        userId,
        repoOwner: repo.owner.login,
        repoName: repo.name,
        repoBranch: repo.default_branch,
      });
    }
    throw err;
  }
}
