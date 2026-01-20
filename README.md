# Pocket Export

Pocket Export is a **local-first, read-it-later web app** built as a Pocket successor.
It runs entirely in the browser, stores data in IndexedDB, and works offline with no account or server.
If the server disappears, the app still works.

## Project goals

* Import Pocket HTML exports.
* Store articles entirely in IndexedDB.
* Provide a high-quality offline reader experience.
* Support tags, local search, and open-format export.
* Require **no account, no server, no sync**.

## Non-goals (out of scope)

* Accounts or authentication
* Sync
* Payments
* AI or recommendations
* Social features
* Browser extensions (bookmarklet only)
* Native mobile apps

## Tech stack

* **Framework:** Vite + React (or Next.js static export)
* **Language:** TypeScript
* **Storage:** IndexedDB via Dexie.js
* **Reader parsing:** Mozilla Readability
* **Search:** MiniSearch or FlexSearch (plain text only)
* **Offline:** Service Worker + Cache API
* **PWA:** Manifest + install prompt after import success

## Data model (IndexedDB)

Tables and key fields:

* `articles`: content_html, content_text, parse_status, saved_at, read_at, is_archived
* `tags`
* `article_tags`
* `assets` (image blobs for offline reading)
* `settings`
* `import_jobs`

## Core user flows

1. **First run:** Empty library with “Import Pocket” / “Add URL”.
2. **Pocket import:** Upload `ril_export.html`, parse URLs + tags, fetch content, run Readability, and import incrementally.
3. **Reader:** Clean typography, adjustable settings, dark mode, fast load, and offline availability.
4. **Tags + Search:** Local tag filtering and full-text search over plain text.
5. **Export:** One-click Markdown ZIP (YAML frontmatter) and optional HTML ZIP.

## UI surface (MVP)

* Library (list, filters, tags)
* Reader
* Import
* Export
* Settings (storage usage, clear data, about)

## Local-first guarantees

* IndexedDB is the only data source.
* Articles and images are available offline.
* Storage usage is visible with warnings near limits.
* `navigator.storage.persist()` requested after first successful import.

## Repository status

This repository currently contains the finalized MVP spec and ticket breakdown. Implementation work starts with:

1. Project skeleton + tooling
2. IndexedDB schema
3. Base app shell + routing

See:

* `MVP_BUILD_SPEC.md` for the full product definition.
* `TICKETS.md` for the step-by-step plan.

## Deployment (Netlify)

This app is a static Vite build and can be deployed to Netlify with HTTPS enabled by default.
The repository includes a `netlify.toml` that sets the build command, output directory,
and a SPA fallback redirect.

1. Create a new Netlify site from this repository.
2. Use the default build settings (`npm run build`, publish `dist`).
3. Deploy — Netlify will serve the app over HTTPS automatically.

## Troubleshooting

### `npm install` fails with a 403 registry error

If you see a 403 error during `npm install`, it usually means npm is pointing at a registry
that requires credentials, or your token has expired.

Try the following in order:

1. Confirm which registry npm is using:
   ```sh
   npm config get registry
   ```
2. If it is not the public npm registry, reset it:
   ```sh
   npm config set registry https://registry.npmjs.org/
   ```
3. If you are using a private registry or GitHub Packages, ensure your `.npmrc`
   has a valid auth token and that the scope registry matches your packages.
4. Clear any cached credentials and try again:
   ```sh
   npm cache clean --force
   ```
5. Re-authenticate if needed:
   ```sh
   npm login
   ```
