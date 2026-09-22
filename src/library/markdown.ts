import type { Highlight } from "../shared/types";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatExportDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function formatSavedAt(iso: string): string {
  const date = new Date(iso);
  return `${formatExportDate(date)} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
}

export function exportFilename(date: Date = new Date()): string {
  return `subraya-${formatExportDate(date)}.md`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Collapses newlines/whitespace so page-derived text can't fake a heading or section break. */
function normalizeInline(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function escapeInline(value: string): string {
  return escapeHtml(normalizeInline(value));
}

interface SourceGroup {
  url: string;
  domain: string;
  highlights: Highlight[];
}

function groupBySourceUrl(highlights: Highlight[]): SourceGroup[] {
  const byUrl = new Map<string, Highlight[]>();
  for (const highlight of highlights) {
    const group = byUrl.get(highlight.url);
    if (group) group.push(highlight);
    else byUrl.set(highlight.url, [highlight]);
  }
  return [...byUrl.entries()].map(([url, group]) => ({ url, domain: group[0].domain, highlights: group }));
}

/**
 * Renders highlights as Markdown grouped by exact source URL. Input order is
 * preserved both across and within groups, so callers control ordering by
 * sorting `highlights` (the library passes the already newest-first list).
 */
export function buildMarkdownExport(highlights: Highlight[], exportedAt: Date = new Date()): string {
  const lines: string[] = ["# Subraya export", "", `Exported: ${formatExportDate(exportedAt)}`, ""];

  for (const group of groupBySourceUrl(highlights)) {
    const heading = group.highlights[0].title || group.url;
    lines.push(
      `## ${escapeInline(group.domain)} — ${escapeInline(heading)}`,
      "",
      `Source: <${escapeInline(group.url)}>`,
      "",
    );

    for (const highlight of group.highlights) {
      for (const line of highlight.text.split("\n")) {
        lines.push(`> ${escapeHtml(line)}`);
      }
      lines.push("", `Saved: ${formatSavedAt(highlight.dateCreated)}`, "");
    }
  }

  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}
