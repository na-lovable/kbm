"use client";

import dynamic from "next/dynamic";
import React, { memo, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
// import remarkGfm from "remark-gfm";
import { Link as LinkIcon } from "lucide-react";
import {
  isInternalMarkdownHref,
  parseInternalLinkSlug,
} from "@/lib/markdown-links";

const MermaidViewer = dynamic(
  () => import("@/components/kbm-elements/mermaid-viewer"),
  {
    ssr: false,
    loading: () => (
      <div className="my-4 p-6 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
        Loading diagram…
      </div>
    ),
  },
);

interface KnowledgeMarkdownProps {
  content: string;
  onInternalLink?: (filename: string) => void;
}

function KnowledgeMarkdownInner({
  content,
  onInternalLink,
}: KnowledgeMarkdownProps) {
  const handleInternalLinkClick = useCallback(
    (event: React.MouseEvent, href?: string) => {
      if (!href || !onInternalLink) return;
      const slug = parseInternalLinkSlug(href);
      if (!slug) return;
      event.preventDefault();
      onInternalLink(slug);
    },
    [onInternalLink],
  );

  const components = useMemo(
    () => ({
      h1: ({
        node,
        ...props
      }: React.ComponentProps<"h1"> & { node?: unknown }) => (
        <h1
          className="text-xl font-bold tracking-tight text-foreground border-b pb-1.5 mb-3 mt-4"
          {...props}
        />
      ),
      h2: ({
        node,
        ...props
      }: React.ComponentProps<"h2"> & { node?: unknown }) => (
        <h2
          className="text-lg font-semibold tracking-tight text-foreground border-b border-border/50 pb-1.5 mb-2 mt-6"
          {...props}
        />
      ),
      h3: ({
        node,
        ...props
      }: React.ComponentProps<"h3"> & { node?: unknown }) => (
        <h3
          className="text-base font-medium tracking-tight text-foreground mb-1 mt-4"
          {...props}
        />
      ),
      p: ({
        node,
        ...props
      }: React.ComponentProps<"p"> & { node?: unknown }) => (
        <p
          className="mb-3 text-muted-foreground leading-relaxed last:mb-0"
          {...props}
        />
      ),
      ul: ({
        node,
        ...props
      }: React.ComponentProps<"ul"> & { node?: unknown }) => (
        <ul
          className="list-disc pl-5 mb-3 space-y-1 text-muted-foreground"
          {...props}
        />
      ),
      ol: ({
        node,
        ...props
      }: React.ComponentProps<"ol"> & { node?: unknown }) => (
        <ol
          className="list-decimal pl-5 mb-3 space-y-1 text-muted-foreground"
          {...props}
        />
      ),
      li: ({
        node,
        ...props
      }: React.ComponentProps<"li"> & { node?: unknown }) => <li {...props} />,
      hr: ({
        node,
        ...props
      }: React.ComponentProps<"hr"> & { node?: unknown }) => (
        <hr className="my-5 border-border/60" {...props} />
      ),
      blockquote: ({
        node,
        ...props
      }: React.ComponentProps<"blockquote"> & { node?: unknown }) => (
        <blockquote
          className="border-l-4 border-primary/40 bg-muted/30 pl-4 py-1.5 my-3 italic text-muted-foreground rounded-r"
          {...props}
        />
      ),
      pre: ({
        node,
        ...props
      }: React.ComponentProps<"pre"> & { node?: unknown }) => (
        <pre
          className="p-4 my-3 bg-muted/60 dark:bg-muted/30 rounded-lg border border-border font-mono text-xs overflow-x-auto text-foreground leading-relaxed whitespace-pre shadow-2xs"
          {...props}
        />
      ),
      strong: ({
        node,
        ...props
      }: React.ComponentProps<"strong"> & { node?: unknown }) => (
        <strong className="font-semibold text-foreground" {...props} />
      ),
      code: ({
        node,
        className,
        children,
        ...props
      }: React.ComponentProps<"code"> & { node?: unknown }) => {
        const match = /language-(\w+)/.exec(className || "");
        const language = match ? match[1] : "";
        const chartCode = String(children).replace(/\n$/, "");

        if (language === "mermaid") {
          return <MermaidViewer chart={chartCode} />;
        }

        const hasLineBreak =
          typeof children === "string" && children.includes("\n");
        const isBlock = Boolean(className) || hasLineBreak;

        if (isBlock) {
          return (
            <code
              className="font-mono text-xs text-foreground block whitespace-pre"
              {...props}
            >
              {children}
            </code>
          );
        }

        return (
          <code
            className="bg-muted/80 px-1.5 py-0.5 rounded font-mono text-xs text-primary border border-border/60"
            {...props}
          >
            {children}
          </code>
        );
      },
      table: ({
        node,
        ...props
      }: React.ComponentProps<"table"> & { node?: unknown }) => (
        <div className="overflow-x-auto my-4 border border-border rounded-lg bg-card shadow-xs">
          <table
            className="w-full text-xs text-left border-collapse"
            {...props}
          />
        </div>
      ),
      thead: ({
        node,
        ...props
      }: React.ComponentProps<"thead"> & { node?: unknown }) => (
        <thead
          className="bg-muted/70 border-b border-border text-foreground font-semibold"
          {...props}
        />
      ),
      tbody: ({
        node,
        ...props
      }: React.ComponentProps<"tbody"> & { node?: unknown }) => (
        <tbody className="divide-y divide-border/40" {...props} />
      ),
      tr: ({
        node,
        ...props
      }: React.ComponentProps<"tr"> & { node?: unknown }) => (
        <tr className="hover:bg-muted/30 transition-colors" {...props} />
      ),
      th: ({
        node,
        ...props
      }: React.ComponentProps<"th"> & { node?: unknown }) => (
        <th
          className="px-3.5 py-2.5 font-bold border-b border-border/60 text-foreground whitespace-nowrap"
          {...props}
        />
      ),
      td: ({
        node,
        ...props
      }: React.ComponentProps<"td"> & { node?: unknown }) => (
        <td className="px-3.5 py-2 text-muted-foreground" {...props} />
      ),
      a: ({
        node,
        href,
        children,
        ...props
      }: React.ComponentProps<"a"> & { node?: unknown }) => {
        const isInternal = isInternalMarkdownHref(href);
        return (
          <a
            href={href}
            onClick={(event) => handleInternalLinkClick(event, href)}
            className={`inline-flex items-center gap-1 font-semibold underline underline-offset-4 cursor-pointer transition-colors ${
              isInternal
                ? "text-primary hover:text-primary/80 bg-primary/10 px-1 py-0.5 rounded border border-primary/20 no-underline text-xs"
                : "text-primary hover:text-primary/80"
            }`}
            {...props}
          >
            {isInternal && <LinkIcon className="h-3 w-3 shrink-0" />}
            <span>{children}</span>
          </a>
        );
      },
    }),
    [handleInternalLinkClick],
  );

  return (
    <article className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed prose-pre:bg-transparent prose-pre:p-0 prose-pre:border-none prose-code:before:content-none prose-code:after:content-none pt-2">
      <ReactMarkdown
        // remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}

export const KnowledgeMarkdown = memo(KnowledgeMarkdownInner);
