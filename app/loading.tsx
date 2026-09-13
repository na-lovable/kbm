import { Network } from "lucide-react";

export default function MemoryLocalLoading() {
  return (
    <main className="h-dvh flex flex-col overflow-hidden">
      <header className="h-10 shrink-0 border-b border-border flex items-center px-3 gap-2">
        <Network className="h-4 w-4 text-primary shrink-0 animate-pulse" />
        <div className="h-3.5 w-40 bg-muted/60 rounded animate-pulse" />
      </header>
      <div className="flex-1 flex overflow-hidden min-h-0 animate-pulse">
        <div className="w-52 shrink-0 border-r border-border bg-muted/20" />
        <div className="flex-1 bg-muted/10" />
        <div className="w-72 shrink-0 border-l border-border bg-muted/20 hidden xl:block" />
      </div>
    </main>
  );
}
