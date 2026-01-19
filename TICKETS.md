# MVP GitHub Tickets

Below is the authoritative ticket set aligned with the final MVP build spec.

---

# 🧱 EPIC 0 — Repo & Foundations (DO FIRST)

### T0.1 — Project skeleton + tooling

**Goal:** Boot a clean local-first web app.

* Vite + React + TypeScript
* ESLint + Prettier
* Folder structure:

```
src/
  db/
  reader/
  import/
  export/
  search/
  offline/
  ui/
  utils/
```

**DoD:** App runs locally, blank shell loads.

---

### T0.2 — IndexedDB schema with Dexie (SOURCE OF TRUTH)

**Goal:** Define and version local database.

* Install Dexie
* Define DB v1 with tables:

  * articles
  * tags
  * article_tags
  * assets
  * settings
  * import_jobs
* Include fields:

  * `content_html`
  * `content_text`
  * `parse_status`

**DoD:** Can insert + query test article via console.

---

### T0.3 — Base app shell + routing

**Goal:** Navigable skeleton.

Routes:

* `/` (Library)
* `/reader/:id`
* `/import`
* `/export`
* `/settings`

**DoD:** Route changes without reload.

---

# 📚 EPIC 1 — Reader Core (EXISTENTIAL)

### T1.1 — Article model + DB helpers

**Goal:** Centralize DB access.

Helpers:

* createArticle
* updateArticle
* listArticles
* getArticleById
* markRead / archive

**DoD:** All DB access flows through helpers.

---

### T1.2 — Reader rendering component

**Goal:** High-quality reading experience.

* Render `content_html`
* Safe HTML sanitization
* Responsive layout

**DoD:** Hardcoded article reads cleanly.

---

### T1.3 — Reader preferences (local)

**Goal:** Reading comfort.

* Font size
* Line width
* Dark mode
* Persist in `settings`

**DoD:** Preferences survive reload.

---

### T1.4 — Offline reader verification

**Goal:** Prove wedge.

* Load article
* Disable network
* Refresh

**DoD:** Article still renders perfectly.

---

# 📥 EPIC 2 — Pocket Import (MAGIC MOMENT)

### T2.1 — Pocket HTML upload + validation

**Goal:** Accept Pocket export.

* File input
* Validate `ril_export.html`

**DoD:** Valid file accepted, invalid rejected gracefully.

---

### T2.2 — Parse Pocket HTML (URLs + tags)

**Goal:** Extract import payload.

* DOMParser
* Extract:

  * URL
  * Title
  * Tags
* Create `import_job`

**DoD:** Parsed list rendered for user.

---

### T2.3 — Client-side article fetcher

**Goal:** Retrieve article HTML.

* Fetch URL
* Timeout + error handling
* Throttled requests

**DoD:** Raw HTML fetched for multiple URLs.

---

### T2.4 — Readability parsing + fallback

**Goal:** Extract readable content.

* Run Mozilla Readability
* Extract:

  * content_html
  * content_text
* On failure:

  * Store raw HTML
  * Set `parse_status = partial`

**DoD:** No import hard-fails due to parsing.

---

### T2.5 — Persist imported articles incrementally

**Goal:** Durable import.

* Save article
* Save tags + relations
* Update import stats live

**DoD:** Articles appear during import, not after.

---

### T2.6 — Import progress UI

**Goal:** Trust + visibility.

* Progress bar
* Imported / failed counters
* Error list (non-blocking)

**DoD:** User can watch import progress.

---

# 📚 EPIC 3 — Library View

### T3.1 — Article list UI

**Goal:** Browse library.

* Title
* Site name
* Saved date
* Read indicator

**DoD:** Clicking opens reader.

---

### T3.2 — Read / unread tracking

**Goal:** Basic state.

* Mark read on open
* Filter unread

**DoD:** Filters work reliably.

---

### T3.3 — Archive support

**Goal:** Hide old content.

* Archive toggle
* Archived filter

**DoD:** Archived items hidden by default.

---

# 🏷 EPIC 4 — Tags + Search

### T4.1 — Tag CRUD

**Goal:** Tag management.

* Create / delete tags
* Assign / remove tags

**DoD:** Tag changes persist.

---

### T4.2 — Tag filtering

**Goal:** Slice library.

* Filter by one or more tags

**DoD:** Article list updates instantly.

---

### T4.3 — Local full-text search

**Goal:** Fast local search.

* Index `content_text` only
* Title + body search
* Batch indexing post-import

**DoD:** Search works on large imports (1k+).

---

# 📦 EPIC 5 — Offline & Storage Infrastructure

### T5.1 — Service Worker (app shell)

**Goal:** App loads offline.

* Cache app shell
* Versioned cache

**DoD:** App opens offline.

---

### T5.2 — Asset (image) caching

**Goal:** Full offline reading.

* Download images
* Store as blobs in `assets`
* Rewrite src URLs

**DoD:** Images render offline.

---

### T5.3 — Storage usage + persistence

**Goal:** Prevent silent failure.

* Estimate IndexedDB usage
* Warn at ~70%
* Call `navigator.storage.persist()` after first import

**DoD:** Storage info visible + persistence requested.

---

# 📤 EPIC 6 — Export (TRUST COMPLETION)

### T6.1 — Markdown exporter

**Goal:** Open exit.

* One `.md` per article
* YAML frontmatter:

  * title
  * url
  * tags
  * saved_at

**DoD:** Files readable in Obsidian.

---

### T6.2 — ZIP bundler

**Goal:** One-click export.

* Bundle Markdown files
* Trigger browser download

**DoD:** ZIP downloads successfully.

---

# 🔖 EPIC 7 — Add New Articles (MINIMAL)

### T7.1 — Save via pasted URL

**Goal:** Add new content.

* Paste URL
* Fetch + parse + store

**DoD:** New article appears in library.

---

### T7.2 — Bookmarklet

**Goal:** Lightweight capture.

* JS bookmarklet
* Opens app with URL payload

**DoD:** Bookmarklet works on arbitrary pages.

---

# ⚙️ EPIC 8 — Settings + Hygiene

### T8.1 — Settings screen

**Goal:** Transparency + control.

* Storage usage
* Clear all data
* About text (“Local-first, no server dependency”)

**DoD:** Settings fully functional.

---

### T8.2 — Error handling + logging

**Goal:** Debuggable MVP.

* Graceful UI errors
* Console logs for failures

**DoD:** No silent failures.

---

# 🚀 EPIC 9 — PWA & Beta Release

### T9.1 — PWA manifest + install flow

**Goal:** Install at right moment.

* Manifest
* Install prompt triggered **after successful import**

**DoD:** Install prompt appears post-import.

---

### T9.2 — Beta deployment

**Goal:** Ship.

* Static hosting
* HTTPS

**DoD:** App accessible publicly.

---

## 🛑 FINAL RULE

If you feel tempted to add:

* Sync
* Accounts
* Payments
* AI
* Extensions

**Stop. That’s post-MVP.**

---

### What to do now

1. Create repo
2. Paste tickets
3. Start **T0.1 → T0.2 → T1.2**
4. Do not re-plan again

If you want, next I can:

* Turn this into a **GitHub Issues CSV**
* Or walk you through **Week 1 execution order**
* Or drop **Dexie + Pocket import code**

Just say the word.
