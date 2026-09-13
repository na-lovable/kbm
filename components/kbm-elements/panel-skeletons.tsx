export function GraphPanelSkeleton() {
  return (
    <div className="h-full w-full rounded-xl border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center gap-3 text-muted-foreground animate-pulse">
      <div className="h-10 w-10 rounded-full bg-muted/60" />
      <div className="space-y-1.5 text-center">
        <div className="h-3 w-32 bg-muted/60 rounded mx-auto" />
        <div className="h-2.5 w-48 bg-muted/40 rounded mx-auto" />
      </div>
    </div>
  );
}

export function ChatPanelSkeleton() {
  return (
    <div className="flex-1 min-h-0 mx-2.5 mb-2 rounded-lg border border-dashed border-border/60 bg-muted/10 animate-pulse" />
  );
}
