# Subraya roadmap

## MVP goal

A Chrome extension that saves text the user highlights on web pages, displays it in a library, and exports it to Markdown. No account, cloud, or analytics.

## Milestones

1. **Foundation** ✅ — Manifest V3, TypeScript, a minimal popup, and a way to open the library. Development, build, lint, and test commands are defined (see `CLAUDE.md`).
2. **Highlight one page** ✅ — From an explicit user action, capture a selection, render it with the CSS Custom Highlight API, and save it in IndexedDB with text, URL, title, date, and an anchor. Highlights persist only for the current page session; reload re-anchoring is milestone 3.
3. **Web persistence** ✅ — On matching HTTP(S) page loads, silently ask for and redraw saved highlights using a position-first, prefix/suffix-fallback resolver; ambiguous matches are skipped rather than painted at random. This required permanent `http://*/*` and `https://*/*` host access (not `<all_urls>`, no file/incognito access) — see `PUBLISHING.md`. Interactive selection is unaffected: it still only turns on via "Activate on this page" or the context menu.
4. **Library and export** ✅ — The library has case-insensitive search across text, title, domain, and URL, with a result count and a distinct "no matches" vs. "nothing saved" empty state. "Export Markdown" writes all saved highlights, or only the current search results when a query is active, as a Blob/object-URL download grouped by exact source URL (no `downloads` permission). Visual design stays as-is; a deliberate pass happens in milestone 6.
5. **PDFs** ✅ — On Chrome 151+, `mime_types_handler` routes `application/pdf` to a locally bundled pdf.js viewer (`src/pdf/`). Selections on a page's text layer save with `sourceType: "pdf"`, a page number, and an anchor scoped to that page (reusing the same anchor/resolver/CSS-Highlight machinery as web highlights, generalized to accept a root element). Restores per page and survives zoom re-renders. Scope is deliberately narrow: text-based HTTP(S) PDFs only — password-protected, corrupt, or image-only/scanned PDFs fall back to Chrome's native viewer via `abortAndFallbackToNativeHandler()`. No search, printing, downloads, annotations, or local-file support in v1.
6. **Polish and release** — Give the library a deliberate, calm, and pleasant visual design; test in Chrome; complete the `PUBLISHING.md` checklist.
   - **Colors and connected Ideas** ✅ — A highlight is saved with one of five allowlisted colors (Yellow, Coral, Mint, Sky, Lilac), chosen from a shared selection popover on both web pages and PDFs. A highlight may optionally connect to zero or one user-created **Idea**, so unrelated fragments across paragraphs, pages, and PDFs can be grouped without forcing a shared color. Deleting an Idea only unassigns its highlights; it never deletes them. Legacy highlights without a stored color or Idea render as Yellow and unconnected. The full visual design pass and notes/tags remain out of scope for this step.

## Out of scope for the MVP

- Accounts, a backend, cross-device sync, and shared collections.
- Notion, Obsidian, or other integrations.
- Guaranteed support for scanned PDFs, radically changing pages, or built-in browser viewers.

## Web MVP exit criteria

On an HTTP(S) page, a user can save a highlight, close or reload the page, find it in the library, delete it, and export it to Markdown without any data leaving the browser.

## PDF v1 exit criteria

On a text-based HTTP(S) PDF, a user can open it in Subraya's viewer (address bar unchanged), highlight text on more than one page, reload the PDF and see both highlights restored on their correct pages, change zoom without losing restoration, and see and export those highlights from the library with their page numbers. Password-protected and image-only/scanned PDFs open in Chrome's native viewer instead.
