"use client";

import { useEffect, useState } from "react";
import { MemoryLocalApp } from "@/components/kbm-elements/memory-local-app";
import { KnowledgeNode } from "@/types/knowledge";
import { getUserGraph } from "@/lib/github/actions/get-user-graph";

type Status = "idle" | "loading" | "ready" | "unauth";

export function UserGitHubApp() {
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getUserGraph().then(({ nodes: fetchedNodes, error: err }) => {
      if (!mounted) return;

      if (err) {
        setStatus("unauth");
        setError(err);
        return;
      }

      setNodes(fetchedNodes);
      setStatus("ready");
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (status === "loading") return <GitHubSkeleton />;
  if (status === "unauth") return <ConnectGitHub error={error} />;
  return <MemoryLocalApp initialNodes={nodes} />;
}

/* ------------------------------------------------------------------ */
/* Layout-faithful skeleton                                           */
/* Mirrors MemoryLocalApp's DOM shape (header + sidebar + center) so  */
/* there is no layout shift when the real app hydrates.               */
/* ------------------------------------------------------------------ */

function GitHubSkeleton() {
  return (
    <main
      className="h-dvh flex flex-col overflow-hidden bg-background"
      role="status"
      aria-label="Loading your GitHub knowledge graph"
      aria-busy="true"
    >
      <AppHeaderSkeleton />
      <div className="flex-1 overflow-hidden min-h-0">
        <ResizablePanelGroupSkeleton />
      </div>
    </main>
  );
}

function AppHeaderSkeleton() {
  return (
    <header className="h-12 border-b border-border bg-background/80 backdrop-blur flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="h-6 w-24 rounded bg-muted/60 animate-pulse" />
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-8 rounded-full bg-muted/60 animate-pulse" />
          <div className="h-5 w-20 rounded bg-muted/60 animate-pulse" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-muted/60 animate-pulse" />
        <div className="h-6 w-20 rounded bg-muted/60 animate-pulse" />
        <div className="h-6 w-28 rounded bg-muted/60 animate-pulse" />
      </div>
    </header>
  );
}

function ResizablePanelGroupSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left sidebar (matches ConceptSidebar default ~260px) */}
      <aside className="w-64 border-r border-border bg-muted/20 flex flex-col">
        <div className="p-4 space-y-3">
          <div className="h-3 w-full rounded bg-muted/60 animate-pulse" />
          <div className="space-y-2">
            <div className="h-3 w-3/4 rounded bg-muted/40 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted/40 animate-pulse" />
          </div>
          <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />
          <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />
          <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />
        </div>
      </aside>

      {/* Center panel */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <CenterToolbarSkeleton />
        <div className="flex-1 overflow-hidden relative">
          <GraphPanelSkeletonInline />
        </div>
      </main>
    </div>
  );
}

function CenterToolbarSkeleton() {
  return (
    <div className="h-12 border-b border-border bg-background/80 px-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded-full bg-muted/60 animate-pulse" />
        <div className="h-5 w-16 rounded bg-muted/60 animate-pulse" />
        <div className="h-5 w-24 rounded bg-muted/60 animate-pulse" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-muted/60 animate-pulse" />
        <div className="h-6 w-20 rounded bg-muted/60 animate-pulse" />
        <div className="h-6 w-32 rounded bg-muted/60 animate-pulse" />
      </div>
    </div>
  );
}

function GraphPanelSkeletonInline() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground animate-pulse">
      <div className="h-10 w-10 rounded-full bg-border mb-3" />
      <div className="space-y-1.5 text-center">
        <div className="h-3 w-32 bg-border rounded mx-auto" />
        <div className="h-2.5 w-48 bg-muted/40 rounded mx-auto" />
      </div>
      <p className="mt-4 text-xs">Loading your knowledge graph…</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Unauth state                                                       */
/* ------------------------------------------------------------------ */

function ConnectGitHub({ error }: { error: string | null }) {
  return (
    <main className="h-dvh flex flex-col items-center justify-center bg-background text-muted-foreground">
      <div className="rounded-full h-12 w-12 bg-border mb-4" />
      <h2 className="text-sm font-medium text-foreground">No GitHub context</h2>
      <p className="mt-1 text-xs text-center max-w-xs px-4">
        Sign in and link a GitHub token to load your knowledge base.
      </p>
      {error && (
        <p className="mt-2 text-xs text-destructive/70 px-4">
          {error}
        </p>
      )}
    </main>
  );
}
