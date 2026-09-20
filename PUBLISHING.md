# Future Chrome Web Store release

There is no need to write the final privacy policy yet. Before submitting Subraya for review, publish one at a public URL that describes the behavior of that release—not planned features.

## Permission strategy

The first prototype should prefer:

- `activeTab` and `scripting`: act only in the tab where the user invokes Subraya.
- `storage`: small extension preference values, if they are needed.
- `contextMenus`: an optional context-menu action.

Add `downloads` only when export ships. Do not request permissions for future features.

### HTTP(S) automatic restoration (Milestone 3)

As of web persistence (Milestone 3), Subraya declares `host_permissions` and a static
content script for exactly `http://*/*` and `https://*/*` — not `<all_urls>`. This is
what lets a saved highlight redraw automatically when the user reloads or revisits the
same page, without reopening the popup. It does not grant `file://` access or reach
Chrome's internal pages, and it is unrelated to incognito mode: local-file and incognito
access remain separate, explicit browser opt-ins that Subraya does not request or assume.

The Chrome Web Store permission justification is:

> Subraya needs access to the pages you visit so it can display and restore the highlights you saved on those pages. Content is processed and stored only in your browser; it is never sent to our servers or used for advertising.

Use this explanation only if the manifest and product behavior exactly match it.

## Before submitting

- Provide a narrow single-purpose description: “Save and organize local highlights from web pages and PDFs.”
- Give a specific, current justification for every permission declared in the manifest.
- Declare **no remote code** when every dependency is bundled and the extension does not use `eval`, remote scripts, or downloaded executable logic.
- Complete the Chrome Web Store data-use disclosures. Selected page text, URLs, titles, and notes count as website content and browsing activity even when processed only locally.
- Publish a linkable privacy policy that matches the dashboard disclosures and the extension's actual behavior.
- Test the final ZIP and verify that it contains no keys, unexpected telemetry, or unused permissions.

## What the privacy policy must cover

The final policy should clearly state:

1. **What is processed:** selected text, URL, title, date, color, and—if shipped—notes, tags, and PDF page references.
2. **Why:** to create, restore, display, and export highlights the user chooses to save.
3. **Where it stays:** IndexedDB or browser-local extension storage.
4. **What does not happen:** no account, first-party server, analytics, data sale, personalized advertising, or third-party data transfer.
5. **User control and retention:** users can delete records in the library, and data is removed on uninstallation; disclose any real exception if sync is added later.
6. **Contact and effective date:** a way to contact the Subraya owner and the policy's effective date.

## Official references

- [Extension privacy and permissions](https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy)
- [Chrome Web Store privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Chrome Web Store user-data policy](https://developer.chrome.com/docs/webstore/user_data)
- [Match patterns and `<all_urls>`](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)
