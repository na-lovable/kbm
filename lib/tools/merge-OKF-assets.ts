import { tool } from "ai";
import z from "zod";
import { mergeOKFMarkdownFiles } from "@/lib/kbm-actions/knowledge-writer";

export const mergeOKFAssets = tool({
  description:
    "Consolidates two or more duplicate or overlapping knowledge assets into a single canonical target asset. Automatically decommissions the old source assets and rewrites all incoming markdown links across the entire repository to point to the canonical node.",
  inputSchema: z.object({
    sourceFilenames: z
      .array(z.string())
      .describe(
        "Array of filenames or slugs of the assets being consolidated / decommissioned",
      ),
    targetFilename: z
      .string()
      .describe(
        "Clean slug name for the unified canonical target asset (e.g. 'automated-battery-swap-station')",
      ),
    type: z
      .string()
      .describe(
        "The domain categorization type block entity (e.g., Facility, Avionics, Safety)",
      ),
    title: z
      .string()
      .describe(
        "The clear human-readable presentation title for the consolidated asset",
      ),
    description: z
      .string()
      .describe(
        "Comprehensive summary overview of the consolidated knowledge node",
      ),
    tags: z
      .array(z.string())
      .describe("Unified tags array representing the merged concepts"),
    markdownBody: z
      .string()
      .describe(
        "Full consolidated markdown body synthesized from the source documents with updated cross-links",
      ),
  }),
  execute: async (args) => {
    return await mergeOKFMarkdownFiles(args);
  },
});
