import { tool } from "ai";
import z from "zod";
import { rebuildNestedIndexFile } from "@/lib/kbm-actions/knowledge-writer";
import { lintKnowledgeBase } from "@/lib/kbm-actions/knowledge-linter";
export const reconcileOKFBase = tool({
  description:
    "Performs an immediate graph reconciliation: re-indexes all nested subfolder category indexes, rebuilds master index.md, audits broken references, and returns the current knowledge base health report.",
  inputSchema: z.object({
    reason: z
      .string()
      .optional()
      .describe(
        "Optional reason or context for triggering repository reconciliation",
      ),
  }),
  execute: async ({ reason }) => {
    await rebuildNestedIndexFile();
    const report = await lintKnowledgeBase();
    return {
      success: true,
      message: `Knowledge repository successfully reconciled and re-indexed.${reason ? ` Context: ${reason}` : ""}`,
      healthScore: report.summary.healthScore,
      totalFiles: report.summary.totalFiles,
      errors: report.summary.errors,
      warnings: report.summary.warnings,
    };
  },
});
