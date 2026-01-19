# MVP BUILD SPEC (FINAL)

**Project:** Local-First Read-It-Later (Pocket Successor)  
**Platform:** Web (PWA)  
**Status:** Build-ready  
**Philosophy:** The browser *is* the database.

---

## 0. PRODUCT GOAL (LOCKED)

Ship a **local-first read-it-later web app** that:

1. Imports Pocket archives
2. Stores articles **entirely in IndexedDB**
3. Works fully offline
4. Has a high-quality reader experience
5. Supports tags + local search
6. Exports all data in open formats
7. Requires **no account, no server, no sync**

If the server disappears, the app still works.

---

## 1. NON-GOALS (ABSOLUTE)

Do **not** build:

* Accounts / auth
* Sync
* Payments
* AI
* Recommendations
* Social features
* Browser extension (bookmarklet only)
* Native mobile apps

Any of the above = scope violation.

---

## 2. TECH STACK (LOCKED)

### Frontend

* **Framework:** Vite + React (or Next.js static export)
* **Language:** TypeScript
* **Storage:** IndexedDB via **Dexie.js**
* **Reader Parsing:** Mozilla Readability
* **Search:** MiniSearch or FlexSearch (index **plain text only**)
* **Offline:** Service Worker + Cache API
* **PWA:** Manifest + install prompt after import success

### Backend

* None required for MVP
* Static hosting only

---

## 3. DATA MODEL (SOURCE OF TRUTH)

### IndexedDB Schema (Dexie)

#### `articles`

```
id: string (uuid)
url: string
title: string
author: string | null
site_name: string
content_html: string
content_text: string        // stripped plain text (for search)
excerpt: string
word_count: number
saved_at: timestamp
read_at: timestamp | null
is_archived: boolean
parse_status: 'ok' | 'partial' | 'failed'
```

#### `tags`

```
id: string
name: string (unique)
```

#### `article_tags`

```
article_id: string
tag_id: string
```

#### `assets`

```
id: string
article_id: string
type: 'image'
original_url: string
local_blob: Blob
```

#### `settings`

```
key: string
value: any
```

#### `import_jobs`

```
id: string
source: 'pocket'
status: 'pending' | 'running' | 'done' | 'error'
started_at: timestamp
finished_at: timestamp
stats: { imported: number, failed: number }
```

---

## 4. CORE USER FLOWS

### A. First-Run

* Empty state
* CTA: “Import Pocket” / “Add URL”
* No login
* No paywall
* App usable immediately

---

### B. Pocket Import (CRITICAL PATH)

**Input:** Pocket HTML export (`ril_export.html`)

Steps:

1. User uploads file
2. Parse:

   * URLs
   * Titles
   * Tags
3. Create `import_job`
4. For each URL:

   * Fetch client-side
   * Run Readability
   * If parsing fails:

     * Store raw HTML
     * Mark `parse_status = partial`
   * Extract:

     * `content_html`
     * `content_text`
5. Persist articles incrementally
6. Show live progress

**Rules:**

* Never hard-fail the import
* Failures are tolerated and visible
* Import must feel “magical”

---

### C. Reading an Article (UX-Critical)

Requirements:

* Clean typography
* Adjustable font size + width
* Inline images
* Dark mode
* Fast load

Offline:

* Must work in airplane mode
* Show “Available offline” badge

Bad reader UX = MVP failure.

---

### D. Tags + Search

* Create/delete tags
* Assign tags to articles
* Filter by tags
* Full-text search over `content_text` only
* All search local, no server

---

### E. Export (Trust Completion)

Export formats:

1. **Markdown ZIP**

   * One file per article
   * YAML frontmatter:

     ```
     title:
     url:
     tags:
     saved_at:
     ```
2. **HTML ZIP** (optional)

One click → ZIP downloads → done.

No server involvement.

---

## 5. OFFLINE + STORAGE REQUIREMENTS

### Offline

* App shell cached via Service Worker
* Articles readable offline
* Images stored as blobs
* IndexedDB is the only data source

### Storage Safeguards

* Show storage usage in Settings
* Warn user at ~70% usage
* Suggest export when near limits
* Call `navigator.storage.persist()` after first successful import

---

## 6. UI SCREENS (MINIMAL)

1. Library (list, filters, tags)
2. Reader
3. Import
4. Export
5. Settings

   * Storage usage
   * Clear all data
   * About (“Local-first. No server dependency.”)

No onboarding fluff.

---

## 7. VALIDATION SIGNALS (OBSERVE ONLY)

Positive:

* Users import large libraries
* Users return organically
* Users test export
* Users ask “can I sync?”

Negative:

* Import once, never return
* Reader complaints
* Offline distrust
* “Nice but…”

---

## 8. DELIVERY PLAN (4 WEEKS)

### Week 1

* Project setup
* Dexie schema
* Single article render
* Service Worker
* Airplane-mode test **passes**

### Week 2

* Pocket import
* Readability parsing
* Reader polish

### Week 3

* Tags
* Search
* Offline asset caching

### Week 4

* Export
* Bookmarklet
* PWA install prompt
* Beta deploy

---

## 9. KILL CRITERIA (PRE-COMMITTED)

Kill the project if:

* Users don’t import
* Users don’t return
* Reader UX is consistently criticized
* No one asks about sync

No exceptions.

---

## 10. ONE-LINE INTERNAL DEFINITION

> **A Pocket-style read-it-later app where the browser is the database and export is guaranteed.**

---

This is now **final**.

Next correct actions:

* Keep existing GitHub tickets
* Add **2–3 small tickets** (storage warnings, persist(), parse fallback)
* Start coding immediately

If you want, next I can:

* Patch the **existing tickets** with the small deltas
* Or drop **ready-to-paste code** for Dexie + Pocket import

Say which.
