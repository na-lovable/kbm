import { tool } from "ai";
import z from "zod";
import { readSingleFileRaw } from "@/lib/kbm-actions/knowledge-engine";

export const readOKFAsset = tool({
  description:
    "Opens and reads the raw markdown body content and full relationship details of a single file from disk.",
  inputSchema: z.object({
    filename: z
      .string()
      .describe(
        "Target file slug or relative path without extension to open (e.g., 'mumbai-central-hub', 'facilities/mumbai-central-hub', or category index 'facilities/index')",
      ),
  }),
  execute: async ({ filename }) => {
    const rawBody = await readSingleFileRaw(filename);
    if (!rawBody) {
      return {
        error: `The file '${filename}.md' could not be found or read inside the knowledge directory layout.`,
      };
    }
    return { filename, content: rawBody };
  },
});
