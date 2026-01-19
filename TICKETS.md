# MVP GitHub Tickets

Below is the authoritative ticket set aligned with the final MVP build spec.

---

# 🧱 EPIC 0 — Repo & Foundations

### T0.1 — Initialize project (Vite + React + TypeScript)

**Context:** Boot the web app.

* Initialize Vite + React + TypeScript
* ESLint + Prettier
* Folder structure:

```
src/
  db/
  reader/
  import/
  search/
  export/
  offline/
  ui/
  utils/
```

**DoD:**

* App runs locally
* Blank shell renders without errors

**Status:** Complete — scaffolded Vite + React + TypeScript with ESLint/Prettier configs.

---

### T0.2 — IndexedDB schema with Dexie (SOURCE OF TRUTH)

**Context:** Define the entire data model.

* Install Dexie
* Create DB v1 with tables:

  * articles
  * tags
  * article_tags
  * assets
  * settings
  * import_jobs
* Fields must include:

  * `content_html`
  * `content_text`
  * `parse_status`

**DoD:** Insert + read a test article from IndexedDB via console.

---

### T0.3 — Base app shell + routing

**Context:** Navigation skeleton.

Routes:

* `/` Library
* `/reader/:id`
* `/import`
* `/export`
* `/settings`

**DoD:**

* Routes switch without reload
* No routing errors

---

# 📚 EPIC 1 — Reader Core (EXISTENTIAL)

### T1.1 — Article DB helpers

**Context:** Centralize DB access.

Helpers:

* createArticle
* updateArticle
* getArticleById
* listArticles
* markRead
* archiveArticle

**DoD:** All article reads/writes go through helpers.

---

### T1.2 — Reader rendering component

**Context:** Core reading experience.

* Render sanitized content_html
* Use DOMPurify
* Responsive layout

**DoD:** Hardcoded article reads cleanly.

---

### T1.3 — Reader preferences (local)

**Context:** Reading comfort.

* Font size
* Line width
* Dark mode
* Persist in settings

**DoD:** Preferences persist across reload.

---

### T1.4 — Offline reader verification

**Context:** Prove wedge.

* Load article
* Disable network
* Refresh

**DoD:** Article still renders perfectly.

---

# 📥 EPIC 2 — Pocket Import (MAGIC MOMENT)

### T2.1 — Pocket HTML upload

**Context:** Accept Pocket export.

* Upload ril_export.html
* Validate structure

**DoD:**

* Valid file accepted
* Invalid file rejected gracefully

---

### T2.2 — Parse Pocket HTML (URLs + tags)

**Context:** Extract import payload.

* DOMParser
* Extract URL, title, tags
* Create import_job

**DoD:** Parsed list visible to user.

---

### T2.3 — Client-side article fetcher

**Context:** Retrieve article HTML.

* Fetch URL client-side
* Timeout + error handling
* Throttled requests

**DoD:** Multiple URLs fetched without blocking import.

---

### T2.4 — Readability parsing with fallback

**Context:** Extract readable content.

* Run Mozilla Readability
* Extract:

  * content_html
  * content_text
* On failure:

  * Store raw HTML
  * Set parse_status = "partial"

**DoD:** No import hard-fails due to parsing.

---

### T2.5 — Persist imported articles incrementally

**Context:** Durable import.

* Save article + tags
* Update import stats live

**DoD:** Articles appear in library during import.

---

### T2.6 — Import progress UI

**Context:** Trust + visibility.

* Progress bar
* Imported / failed counters
* Error list (non-blocking)

**DoD:** User can watch import progress.

---

# 📚 EPIC 3 — Library View

### T3.1 — Article list UI

**Context:** Browse library.

* Title
* Site name
* Saved date
* Read indicator

**DoD:** Clicking opens reader.

---

### T3.2 — Read / unread state

**Context:** Basic organization.

* Mark read on open
* Filter unread

**DoD:** Filters work reliably.

---

### T3.3 — Archive support

**Context:** Hide old content.

* Archive toggle
* Archived filter

**DoD:** Archived items hidden by default.

---

# 🏷 EPIC 4 — Tags + Search

### T4.1 — Tag CRUD

**Context:** Tag management.

* Create/delete tags
* Assign/remove tags

**DoD:** Tags persist correctly.

---

### T4.2 — Tag filtering

**Context:** Slice library.

* Filter by one or more tags

**DoD:** Article list updates instantly.

---

### T4.3 — Local full-text search

**Context:** Find content locally.

* FlexSearch
* Index content_text only
* Batch index post-import

**DoD:** Search works on 1k+ articles.

---

# 📦 EPIC 5 — Offline & Storage

### T5.1 — Service Worker (app shell)

**Context:** Offline load.

* Use vite-plugin-pwa
* Cache app shell

**DoD:** App opens offline.

---

### T5.2 — Asset (image) caching

**Context:** Full offline reading.

* Download images
* Store blobs in assets
* Rewrite src URLs

**DoD:** Images render offline.

---

### T5.3 — Storage usage + persistence

**Context:** Prevent silent failure.

* Estimate IndexedDB usage
* Warn at ~70%
* Call navigator.storage.persist() after first import

**DoD:**

* Storage info visible
* Persistence requested

---

# 📤 EPIC 6 — Export (TRUST COMPLETION)

### T6.1 — Markdown exporter

**Context:** Open exit.

* One .md per article
* YAML frontmatter:

  * title
  * url
  * tags
  * saved_at

**DoD:** Files open cleanly in Obsidian.

---

### T6.2 — ZIP bundler

**Context:** One-click export.

* Use JSZip
* Trigger browser download

**DoD:** ZIP downloads successfully.

---

# 🔖 EPIC 7 — Add New Articles (MINIMAL)

### T7.1 — Save via pasted URL

**Context:** Add new content.

* Paste URL
* Fetch + parse + store

**DoD:** New article appears in library.

---

### T7.2 — Bookmarklet

**Context:** Lightweight capture.

* JS bookmarklet
* Opens app with URL payload

**DoD:** Bookmarklet works on arbitrary pages.

---

# ⚙️ EPIC 8 — Settings + Hygiene

### T8.1 — Settings screen

**Context:** Transparency + control.

* Storage usage
* Clear all data
* About (“Local-first. No server dependency.”)

**DoD:** Settings fully functional.

---

### T8.2 — Error handling + logging

**Context:** Debuggable MVP.

* Graceful UI errors
* Console logging

**DoD:** No silent failures.

---

# 🚀 EPIC 9 — PWA & Beta Release

### T9.1 — PWA manifest + install flow

**Context:** Install at right moment.

* Manifest
* Install prompt after successful import

**DoD:** Install prompt appears post-import.

---

### T9.2 — Beta deployment

**Context:** Ship.

* Static hosting
* HTTPS

**DoD:** App accessible publicly.

---

## FINAL EXECUTION RULE

If a ticket tempts you to add:

* Sync
* Accounts
* Payments
* AI
* Extensions

Do not implement it.

---

If you want next:

* A Week-1 execution order Codex prompt
* Or a “build cop” checklist to reject bad PRs
* Or ready-to-paste Codex system prompt

Say the word.
