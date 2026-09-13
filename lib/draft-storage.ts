export interface ConceptDraft {
  filename: string;
  title: string;
  type: string;
  description: string;
  tags: string[];
  markdownBody: string;
  rawContent: string;
  editorMode: "form" | "raw";
  savedAt: number;
  sourceKey: string;
}

const DRAFT_PREFIX = "memory-local:draft:";

export function getDraftKey(sourceKey: string): string {
  return `${DRAFT_PREFIX}${sourceKey}`;
}

export function saveDraft(sourceKey: string, draft: Omit<ConceptDraft, "savedAt" | "sourceKey">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: ConceptDraft = {
      ...draft,
      sourceKey,
      savedAt: Date.now(),
    };
    localStorage.setItem(getDraftKey(sourceKey), JSON.stringify(payload));
  } catch {
    // Ignore quota errors
  }
}

export function loadDraft(sourceKey: string): ConceptDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getDraftKey(sourceKey));
    if (!raw) return null;
    return JSON.parse(raw) as ConceptDraft;
  } catch {
    return null;
  }
}

export function clearDraft(sourceKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getDraftKey(sourceKey));
  } catch {
    // Ignore
  }
}

export function titleToSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
