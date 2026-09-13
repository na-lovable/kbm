"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  FileMagnifyingGlassIcon,
  NetworkIcon,
  ShieldCheck,
  ShieldCheckIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

interface AppHeaderProps {
  error: string | null;
  isSyncing: boolean;
  isLinting: boolean;
  onRunLinter: () => void;
  onSync: () => void;
}

export function AppHeader({
  error,
  isSyncing,
  isLinting,
  onRunLinter,
  onSync,
}: AppHeaderProps) {
  return (
    <header className="h-10 shrink-0 border-b border-border flex items-center justify-between px-2.5 sm:px-3 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <NetworkIcon className="h-4 w-4 text-primary shrink-0" />
        <h1 className="text-sm font-extrabold tracking-tight text-foreground truncate">
          Organizational Memory
        </h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {error && (
          <Alert
            variant="destructive"
            className="py-1 px-3 flex items-center gap-2 h-8 text-xs"
          >
            <WarningCircleIcon className="h-3.5 w-3.5 shrink-0" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
        <Button
          onClick={onRunLinter}
          disabled={isLinting}
          variant="outline"
          size="icon-sm"
          className="border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 shrink-0 md:w-auto md:px-2.5 md:gap-1.5"
          title="Run Health Check"
        >
          <ShieldCheckIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline text-xs font-semibold">
            {isLinting ? "Checking…" : "Health Check"}
          </span>
        </Button>
        <Button
          onClick={onSync}
          disabled={isSyncing}
          size="icon-sm"
          className="shrink-0 md:w-auto md:px-2.5 md:gap-1.5 font-semibold"
          title="Sync Knowledge Base"
        >
          <FileMagnifyingGlassIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline text-xs">
            {isSyncing ? "Syncing…" : "Sync"}
          </span>
        </Button>
      </div>
    </header>
  );
}
