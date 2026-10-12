"use server";

import { getInMemoryGraph, queryGraphById } from "@/lib/kbm-actions/knowledge-engine";
import { lintKnowledgeBase, LintReport } from "@/lib/kbm-actions/knowledge-linter";
import {
  rebuildNestedIndexFile,
  writeOKFMarkdownFile,
  saveRawOKFMarkdownFile,
  deleteOKFMarkdownFile,
  renameOKFAsset,
  mergeOKFMarkdownFiles,
} from "@/lib/kbm-actions/knowledge-writer";
import {
  KnowledgeNode,
  GraphQueryResult,
  WriteOKF,
  SaveRawOKFInput,
  SaveOKFResult,
  RenameOKFInput,
  RenameOKFResult,
  DeleteOKFInput,
  MergeOKF,
} from "@/types/knowledge";
import { runWithUserGitHub } from "@/lib/github/run-with-user";

export async function handleFetchGraph(): Promise<KnowledgeNode[]> {
  return runWithUserGitHub(() => getInMemoryGraph());
}

export async function handleQueryNode(
  filename: string,
): Promise<GraphQueryResult | null> {
  return runWithUserGitHub(() => queryGraphById(filename));
}

export async function handleLintKnowledgeBase(): Promise<LintReport> {
  return runWithUserGitHub(() => lintKnowledgeBase());
}

export async function handleReconcileKnowledgeBase(): Promise<LintReport> {
  return runWithUserGitHub(async () => {
    await rebuildNestedIndexFile();
    return await lintKnowledgeBase();
  });
}

export async function handleSaveOKFAsset(
  data: WriteOKF,
): Promise<SaveOKFResult> {
  return runWithUserGitHub(() => writeOKFMarkdownFile(data));
}

export async function handleSaveRawOKFFile(
  data: SaveRawOKFInput,
): Promise<SaveOKFResult> {
  return runWithUserGitHub(() => saveRawOKFMarkdownFile(data));
}

export async function handleRenameOKFAsset(
  data: RenameOKFInput,
): Promise<RenameOKFResult> {
  return runWithUserGitHub(() => renameOKFAsset(data));
}

export async function handleDeleteOKFAsset(
  data: DeleteOKFInput | string,
): Promise<{ success: boolean; message: string; updatedFiles?: string[] }> {
  return runWithUserGitHub(async () => {
    if (typeof data === "string") {
      return await deleteOKFMarkdownFile(data);
    }
    return await deleteOKFMarkdownFile(data.filename, {
      removeReferences: data.removeReferences,
    });
  });
}

export async function handleMergeOKFAssets(data: MergeOKF): Promise<{
  success: boolean;
  message: string;
  targetRelPath: string;
  rewrittenFiles: string[];
}> {
  return runWithUserGitHub(() => mergeOKFMarkdownFiles(data));
}
