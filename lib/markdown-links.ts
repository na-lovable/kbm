/** Resolves an internal markdown href or relative path to a concept filename slug. */
export function parseInternalLinkSlug(href: string): string | null {
  if (!href) return null;
  const cleanHref = href.trim();
  if (
    cleanHref.startsWith("http://") ||
    cleanHref.startsWith("https://") ||
    cleanHref.startsWith("mailto:") ||
    cleanHref.startsWith("#")
  ) {
    return null;
  }

  const cleanSlug = cleanHref
    .replace(/^(\.\/|\.\.\/)+/, "")
    .replace(/\.md$/, "")
    .split("/")
    .pop();

  return cleanSlug || null;
}

export function isInternalMarkdownHref(href?: string): boolean {
  if (!href) return false;
  const clean = href.trim();
  if (
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.startsWith("mailto:") ||
    clean.startsWith("#")
  ) {
    return false;
  }
  return true;
}

/**
 * Strips any leading H1 heading lines (# Title) from a markdown string.
 */
export function stripLeadingH1(markdown?: string): string {
  if (!markdown) return "";
  let clean = markdown.trim();
  while (/^\s*#[^\n]*(\n+|$)/.test(clean)) {
    clean = clean.replace(/^\s*#[^\n]*(\n+|$)/, "").trim();
  }
  return clean;
}
