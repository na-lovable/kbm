import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { z, ZodError } from "zod/v3";

const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_REPO_OWNER: z.string().optional(),
  GITHUB_REPO_NAME: z.string().optional(),
  GITHUB_REPO_BRANCH: z.string().optional(),
});

expand(config());

try {
  envSchema.parse(process.env);
} catch (e) {
  if (e instanceof ZodError) {
    console.error("Environment validation error:", e.issues);
  }
}

export default envSchema.parse(process.env);
