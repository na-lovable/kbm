"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, ShieldCheck, RefreshCw } from "lucide-react";
import { LintReport } from "@/lib/kbm-actions/knowledge-linter";

interface LinterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lintReport: LintReport | null;
  onReconcile?: () => Promise<void>;
  isReconciling?: boolean;
  onSelectConcept?: (file: string) => void;
}

export function LinterDialog({
  open,
  onOpenChange,
  lintReport,
  onReconcile,
  isReconciling = false,
  onSelectConcept,
}: LinterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-2xl max-h-[calc(100dvh-1rem)] overflow-hidden p-4 sm:p-6">
        <DialogHeader className="min-w-0 pr-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <DialogTitle className="flex min-w-0 flex-wrap items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <span>Knowledge Base Health Report</span>
              {lintReport && (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-500 border-emerald-500/40 font-mono text-xs"
                >
                  {lintReport.summary.healthScore}% Healthy
                </Badge>
              )}
            </DialogTitle>

            {onReconcile && (
              <Button
                size="sm"
                variant="outline"
                onClick={onReconcile}
                disabled={isReconciling}
                className="w-full gap-1.5 text-xs font-semibold hover:border-primary sm:w-auto shrink-0"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isReconciling ? "animate-spin text-primary" : "text-muted-foreground"}`}
                />
                {isReconciling ? "Reconciling…" : "Rebuild & Fix Graph"}
              </Button>
            )}
          </div>
        </DialogHeader>
        {lintReport && (
          <div className="min-h-0 space-y-4 overflow-hidden">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {[
                {
                  label: "Concepts Checked",
                  value: lintReport.summary.totalFiles,
                  color: "text-foreground",
                },
                {
                  label: "Health Score",
                  value: `${lintReport.summary.healthScore}%`,
                  color: "text-emerald-500",
                },
                {
                  label: "Errors Found",
                  value: lintReport.summary.errors,
                  color:
                    lintReport.summary.errors > 0
                      ? "text-red-400"
                      : "text-foreground",
                },
                {
                  label: "Warnings",
                  value: lintReport.summary.warnings,
                  color:
                    lintReport.summary.warnings > 0
                      ? "text-amber-400"
                      : "text-foreground",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="min-w-0 p-2.5 sm:p-3 rounded-lg border bg-muted/30 text-center"
                >
                  <p className="text-[10px] font-mono text-muted-foreground uppercase wrap-break-word">
                    {label}
                  </p>
                  <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            {lintReport.issues.length === 0 ? (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-500 text-xs font-medium">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>
                  All clear — all concepts have valid metadata, consistent
                  naming, and verified connections.
                </span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[min(48dvh,28rem)] overflow-y-auto border rounded-lg p-2 bg-muted/20">
                {lintReport.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="min-w-0 p-2.5 rounded border bg-card text-xs flex flex-col items-start gap-2 sm:flex-row sm:justify-between"
                  >
                    <div className="min-w-0 space-y-0.5">
                      {onSelectConcept ? (
                        <button
                          type="button"
                          onClick={() => onSelectConcept(issue.file)}
                          className="block max-w-full break-all text-left font-mono font-bold text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title={`Open ${issue.file}`}
                        >
                          {issue.file}
                        </button>
                      ) : (
                        <p className="break-all font-mono font-bold text-foreground">
                          {issue.file}
                        </p>
                      )}
                      <p className="wrap-break-word text-muted-foreground">
                        {issue.message}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        issue.level === "ERROR"
                          ? "shrink-0 bg-red-500/10 text-red-400 border-red-500/30"
                          : "shrink-0 bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }
                    >
                      {issue.rule}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
