"use client";

import React, { memo, useEffect, useState } from "react";

const svgCache = new Map<string, string>();
let renderCounter = 0;

interface MermaidViewerProps {
  chart: string;
}

function MermaidViewerInner({ chart }: MermaidViewerProps) {
  const cleanChart = chart.trim();
  const [svg, setSvg] = useState<string>(() => svgCache.get(cleanChart) || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cleanChart) return;
    if (svgCache.has(cleanChart)) {
      setSvg(svgCache.get(cleanChart)!);
      return;
    }

    let isMounted = true;
    renderCounter += 1;
    const uniqueId = `mermaid-chart-${renderCounter}`;

    async function renderChart() {
      try {
        setError(null);
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "var(--font-sans, Inter, sans-serif)",
          themeVariables: {
            darkMode: true,
            background: "transparent",
            primaryColor: "#3b82f6",
            primaryTextColor: "#f8fafc",
            primaryBorderColor: "#60a5fa",
            lineColor: "#94a3b8",
            secondaryColor: "#1e293b",
            tertiaryColor: "#0f172a",
            fontSize: "12px",
          },
        });

        const { svg: renderedSvg } = await mermaid.render(uniqueId, cleanChart);
        svgCache.set(cleanChart, renderedSvg);
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to render Mermaid diagram",
          );
        }
      } finally {
        const el = document.getElementById(`d${uniqueId}`);
        if (el) el.remove();
      }
    }

    void renderChart();

    return () => {
      isMounted = false;
      const el = document.getElementById(`d${uniqueId}`);
      if (el) el.remove();
    };
  }, [cleanChart]);

  if (error) {
    return (
      <div className="my-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-400 font-mono">
        <p className="font-semibold mb-1">Diagram Render Error:</p>
        <pre className="text-[11px] whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 p-6 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      className="my-4 p-4 rounded-xl border border-border bg-card/80 shadow-xs flex justify-center items-center overflow-x-auto [&>svg]:max-w-full [&>svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default memo(MermaidViewerInner);
