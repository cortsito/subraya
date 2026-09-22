# Subraya

## What we are building

Subraya is a Chrome Manifest V3 extension for saving highlights from web pages and, later, PDFs. It is a personal reading and research tool: data stays in the user's browser, with no account, backend, analytics, or sync in the MVP.

## Current priority

Build the web-page MVP first. PDFs are a separate phase and must not delay a useful first release.

The first complete flow is: the user selects text and chooses **Highlight** → the highlight is saved locally → it appears in the library → it can be exported to Markdown.

## Product boundaries

- Keep the extension small and focused on one job: saving highlights.
- Use TypeScript and Manifest V3. Do not introduce frameworks or services when a small native solution is enough.
- Store highlights in IndexedDB; use `chrome.storage` only for small preference values.
- Never send highlighted text, URLs, titles, notes, or telemetry to a server.
- Never load or execute remote code. Bundle dependencies with the extension.
- Do not enable or store incognito activity. Local-file access must be a browser opt-in, never assumed.
- Do not promise that every highlight can be re-anchored: dynamic pages change. The library must keep the saved text even when it cannot be redrawn on the page.

## Technical decisions

- Prefer the CSS Custom Highlight API for web-page highlighting. Do not alter page DOM with `<mark>` unless a specific alternative is proposed and justified.
- A page anchor must include exact text, surrounding prefix/suffix context, and a position. Text alone is not enough.
- An MV3 service worker cannot reliably retain in-memory state between events. Persist anything important before an event ends.
- Start with `activeTab` + `scripting` behind an explicit user action. Do not request permanent access to every website merely for convenience.
- If the product needs to restore highlights automatically or show a selection control on every website, it may request all-site access. Document and justify that decision before adding it.
- Chrome is the supported browser. Edge compatibility is out of scope for now and must not add fallback code, testing, or product constraints.
- For PDF support, use Chrome 151+ `mime_types_handler` to route PDFs to a locally bundled pdf.js viewer. Do not attempt to inject into Chrome's built-in PDF viewer.

## Working conventions

- Inspect the manifest, permissions, and affected user flow before changing code.
- Make small, testable changes; do not rewrite unrelated parts of the project.
- Update `ROADMAP.md` only when a milestone is complete or the scope changes.
- Once the project is scaffolded, record the real `dev`, `build`, `lint`, and `test` commands here. Never invent them.
  - `npm install` — install dependencies.
  - `npm run dev` — esbuild in watch mode, rebuilds `dist/` on save (HTML/manifest edits need a manual re-run).
  - `npm run build` — one-shot production build into `dist/`, loadable unpacked at `chrome://extensions`.
  - `npm run typecheck` — `tsc --noEmit`.
  - `npm run lint` — ESLint (flat config, typescript-eslint).
  - `npm test` — Vitest (jsdom) unit tests for `src/shared/dedupe.ts` and `src/content/anchor.ts`.
- Manually test selection, saving, reload behavior, library display, deletion, and export as each becomes available.
- Do not run `git commit`, `git push`, `git add`, or configure remotes. Leave changes uncommitted for human review.

## Minimal documentation

- `ROADMAP.md`: scope and milestone order.
- `PUBLISHING.md`: permission decisions and Chrome Web Store requirements before launch.
