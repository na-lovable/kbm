"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UnsavedGuardAction = "save" | "discard" | "cancel";

export interface PendingNavigation {
  id: string;
  label: string;
  execute: () => void | Promise<void>;
}

interface UseUnsavedChangesGuardOptions {
  isDirty: boolean;
  isActive: boolean;
  onSave?: () => Promise<boolean>;
  onDiscard?: () => void | Promise<void>;
}

export function useUnsavedChangesGuard({
  isDirty,
  isActive,
  onSave,
  onDiscard,
}: UseUnsavedChangesGuardOptions) {
  const [pendingNav, setPendingNav] = useState<PendingNavigation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const pendingRef = useRef<PendingNavigation | null>(null);

  const guardNavigation = useCallback(
    (nav: PendingNavigation) => {
      if (!isActive || !isDirty) {
        void nav.execute();
        return;
      }
      pendingRef.current = nav;
      setPendingNav(nav);
    },
    [isActive, isDirty],
  );

  const resolveGuard = useCallback(
    async (action: UnsavedGuardAction) => {
      const nav = pendingRef.current;
      if (!nav) return;

      if (action === "cancel") {
        pendingRef.current = null;
        setPendingNav(null);
        return;
      }

      if (action === "save" && onSave) {
        setIsSaving(true);
        try {
          const saved = await onSave();
          if (!saved) return;
        } finally {
          setIsSaving(false);
        }
      }

      if (action === "discard") {
        await onDiscard?.();
      }

      pendingRef.current = null;
      setPendingNav(null);
      await nav.execute();
    },
    [onDiscard, onSave],
  );

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isActive && isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isActive, isDirty]);

  return {
    pendingNav,
    isSaving,
    guardNavigation,
    resolveGuard,
    dismissGuard: () => {
      pendingRef.current = null;
      setPendingNav(null);
    },
  };
}
