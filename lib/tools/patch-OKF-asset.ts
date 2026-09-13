import { tool } from "ai";
import z from "zod";
import { patchOKFMarkdownFile } from "@/lib/kbm-actions/knowledge-writer";

export const patchOKFAsset = tool({
  description:
    "Selectively updates or appends metadata, tags, or markdown sections of an existing OKF knowledge asset without destructive full-file overwriting. Great for adding decision logs, operational notes, or modifying specifications.",
  inputSchema: z.object({
    filename: z
      .string()
      .describe(
        "Clean slug filename or relative path of the asset to update (e.g. 'mumbai-central-hub' or 'facilities/charging/automated-battery-swap-station')",
      ),
    title: z
      .string()
      .optional()
      .describe("Updated presentation title header name"),
    description: z
      .string()
      .optional()
      .describe("Updated summary overview description"),
    tagsToAdd: z
      .array(z.string())
      .optional()
      .describe("New tags to append to the asset frontmatter"),
    tagsToRemove: z
      .array(z.string())
      .optional()
      .describe("Tags to remove from the asset frontmatter"),
    appendSection: z
      .object({
        heading: z
          .string()
          .describe(
            "Markdown H2 header text to append (e.g., 'Decision Rationale & Trade-offs' or 'Maintenance Log')",
          ),
        content: z
          .string()
          .describe("Markdown content to place under this new section header"),
      })
      .optional()
      .describe("Append a new markdown section to the end of the document"),
    replaceSection: z
      .object({
        heading: z
          .string()
          .describe("Existing Markdown H2 header text to replace"),
        content: z
          .string()
          .describe("New replacement markdown content for this section"),
      })
      .optional()
      .describe("Replace the content of an existing section"),
  }),
  execute: async (args) => {
    return await patchOKFMarkdownFile(args);
  },
});
