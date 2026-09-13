import { tool } from "ai";
import z from "zod";
import { deleteOKFMarkdownFile } from "@/lib/kbm-actions/knowledge-writer";

export const deleteOKFAsset = tool({
  description:
    "Permanently removes an obsolete or decommissioned markdown data file asset from local directories.",
  inputSchema: z.object({
    filename: z
      .string()
      .describe(
        "Clean, lowercase hyphenated slug filename string parameter to remove without extension (e.g. 'delhi-logistics-yard')",
      ),
  }),
  execute: async ({ filename }) => {
    const toolResult = await deleteOKFMarkdownFile(filename);
    return toolResult;
  },
});
