"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConceptDraft } from "@/lib/draft-storage";

interface DraftRecoveryDialogProps {
  draft: ConceptDraft | null;
  onRestore: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryDialog({
  draft,
  onRestore,
  onDiscard,
}: DraftRecoveryDialogProps) {
  const savedAt = draft
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(draft.savedAt)
    : "";

  return (
    <AlertDialog
      open={Boolean(draft)}
      onOpenChange={(open) => !open && onDiscard()}
    >
      <AlertDialogContent className="max-w-sm bg-card border-border shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-bold">
            Restore unfinished draft?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left text-xs">
            A local draft from {savedAt} is available for this concept.
            Restoring it replaces the editor fields with your unfinished work.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard} className="text-xs">
            Discard draft
          </AlertDialogCancel>
          <AlertDialogAction onClick={onRestore} className="text-xs">
            Restore draft
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
