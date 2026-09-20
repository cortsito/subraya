# Subraya roadmap

## MVP goal

A Chrome extension that saves text the user highlights on web pages, displays it in a library, and exports it to Markdown. No account, cloud, or analytics.

## Milestones

1. **Foundation** ✅ — Manifest V3, TypeScript, a minimal popup, and a way to open the library. Development, build, lint, and test commands are defined (see `CLAUDE.md`).
2. **Highlight one page** ✅ — From an explicit user action, capture a selection, render it with the CSS Custom Highlight API, and save it in IndexedDB with text, URL, title, date, and an anchor. Highlights persist only for the current page session; reload re-anchoring is milestone 3.
3. **Web persistence** ✅ — On matching HTTP(S) page loads, silently ask for and redraw saved highlights using a position-first, prefix/suffix-fallback resolver; ambiguous matches are skipped rather than painted at random. This required permanent `http://*/*` and `https://*/*` host access (not `<all_urls>`, no file/incognito access) — see `PUBLISHING.md`. Interactive selection is unaffected: it still only turns on via "Activate on this page" or the context menu.
4. **Library and export** — List highlights, provide simple search and deletion, and export a Markdown file grouped by source.
5. **PDFs** — Use a custom pdf.js viewer or Chrome's modern MIME handler API, after validating real-world compatibility. Save the PDF page and anchor. Do not block web milestones on this work.
6. **Polish and release** — Add colors, notes, and tags only if they remain necessary; test in Chrome and Edge; complete the `PUBLISHING.md` checklist.

## Out of scope for the MVP

- Accounts, a backend, cross-device sync, and shared collections.
- Notion, Obsidian, or other integrations.
- Guaranteed support for scanned PDFs, radically changing pages, or built-in browser viewers.

## Web MVP exit criteria

On an HTTP(S) page, a user can save a highlight, close or reload the page, find it in the library, delete it, and export it to Markdown without any data leaving the browser.
