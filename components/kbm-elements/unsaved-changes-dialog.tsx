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
import { Loader2 } from "lucide-react";
import { PendingNavigation } from "@/lib/hooks/use-unsaved-changes-guard";

interface UnsavedChangesDialogProps {
  open: boolean;
  pendingNav: PendingNavigation | null;
  isSaving: boolean;
  onSaveAndContinue: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({
  open,
  pendingNav,
  isSaving,
  onSaveAndContinue,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent className="max-w-sm bg-card border-border shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-bold">
            Unsaved changes
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left text-xs">
            You have unsaved edits
            {pendingNav ? ` before "${pendingNav.label}"` : ""}. Save your work,
            discard changes, or stay on this page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            onClick={onCancel}
            disabled={isSaving}
            className="text-xs"
          >
            Stay
          </AlertDialogCancel>
          <AlertDialogAction
            variant="outline"
            onClick={onDiscard}
            disabled={isSaving}
            className="text-xs"
          >
            Discard
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onSaveAndContinue}
            disabled={isSaving}
            className="text-xs gap-1.5"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save &amp; continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
