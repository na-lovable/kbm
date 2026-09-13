"use client";

import React from "react";
import {
  BatteryCharging,
  Building2,
  Compass,
  Cpu,
  FileText,
  Plane,
  Plus,
  ShieldAlert,
  Sparkles,
  Route,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CONCEPT_TEMPLATES, ConceptTemplate } from "@/lib/concept-templates";

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: ConceptTemplate) => void;
}

const TEMPLATE_ICONS = {
  Building2: Building2,
  Plane: Plane,
  Cpu: Cpu,
  ShieldAlert: ShieldAlert,
  Compass: Compass,
  BatteryCharging: BatteryCharging,
  FileText: FileText,
  Route: Route,
};

export function TemplatePickerDialog({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplatePickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-bold text-base">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            Choose Concept Starter Template
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-2">
          Select an OKF blueprint tailored to your domain to scaffold
          specifications, tables, and link cross-references.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1 pt-1">
          {CONCEPT_TEMPLATES.map((template) => {
            const Icon = TEMPLATE_ICONS[template.iconName] || FileText;

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  onSelectTemplate(template);
                  onOpenChange(false);
                }}
                className="text-left p-3 rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/60 hover:border-primary/50 transition-all flex flex-col justify-between gap-3 group cursor-pointer"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                        {template.name}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono shrink-0"
                    >
                      {template.type}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {template.description}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-border/40">
                  {template.defaultTags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] font-mono text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded border border-border/50"
                    >
                      #{tag}
                    </span>
                  ))}
                  {template.defaultTags.length > 3 && (
                    <span className="text-[9px] text-muted-foreground font-mono">
                      +{template.defaultTags.length - 3}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
