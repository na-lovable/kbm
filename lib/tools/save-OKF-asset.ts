import { tool } from "ai";
import { writeOKFMarkdownFile } from "@/lib/kbm-actions/knowledge-writer";
import z from "zod";
import { WriteOKF } from "@/types/knowledge";

export const saveOKFAsset = tool({
  description:
    "Creates or overwrites a human-friendly Google OKF-compliant markdown file resource asset inside the local repository base.",
  inputSchema: z.object({
    filename: z
      .string()
      .describe(
        "Clean, lowercase, hyphenated human-friendly asset slug name without extension (e.g. 'chennai-fulfillment-center')",
      ),
    type: z
      .string()
      .describe(
        "The core domain categorization type block entity (e.g., Facility, Inventory, Route)",
      ),
    title: z
      .string()
      .describe(
        "The clear human-readable presentation title header name (e.g., Chennai Fulfillment Center)",
      ),
    description: z
      .string()
      .describe(
        "A high-level summary overview explanation parameter mapping metrics",
      ),
    tags: z
      .array(z.string())
      .describe("Descriptive comma array labels for category parsing"),
    markdownBody: z
      .string()
      .describe(
        "The markdown content details for the document body. Include normal cross-linking syntax pointers like [Name](./filename.md) here to create relationships.",
      ),
  }),
  execute: async (args: WriteOKF) => {
    const toolResult = await writeOKFMarkdownFile(args);
    return toolResult;
  },
});
