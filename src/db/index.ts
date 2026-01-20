import Dexie, { type Table } from "dexie";

export type ParseStatus = "success" | "partial" | "failed";

export interface Article {
  id: string;
  url: string;
  title: string;
  content_html: string;
  content_text: string;
  parse_status: ParseStatus;
  created_at: string;
  updated_at: string;
  saved_at: string;
  is_archived: number;
  is_read: number;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface ArticleTag {
  id: string;
  article_id: string;
  tag_id: string;
}

export interface Asset {
  id: string;
  article_id: string;
  url: string;
  content_type: string;
  blob: Blob;
  created_at: string;
}

export interface Setting {
  id: string;
  value: string;
}

export interface ImportJob {
  id: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  total_count: number;
  completed_count: number;
  failed_count: number;
  started_at: string;
  completed_at?: string;
}

class PocketExportDB extends Dexie {
  articles!: Table<Article, string>;
  tags!: Table<Tag, string>;
  article_tags!: Table<ArticleTag, string>;
  assets!: Table<Asset, string>;
  settings!: Table<Setting, string>;
  import_jobs!: Table<ImportJob, string>;

  constructor() {
    super("PocketExportDB");
    this.version(1).stores({
      articles: "id, url, title, saved_at, parse_status, is_archived, is_read",
      tags: "id, name",
      article_tags: "id, article_id, tag_id",
      assets: "id, article_id, url",
      settings: "id",
      import_jobs: "id, status, started_at",
    });
  }
}

export const db = new PocketExportDB();

export const clearAllData = async (): Promise<void> => {
  await db.transaction(
    "rw",
    db.articles,
    db.tags,
    db.article_tags,
    db.assets,
    db.settings,
    db.import_jobs,
    async () => {
      await Promise.all([
        db.articles.clear(),
        db.tags.clear(),
        db.article_tags.clear(),
        db.assets.clear(),
        db.settings.clear(),
        db.import_jobs.clear(),
      ]);
    },
  );
};

if (import.meta.env.DEV) {
  const windowWithDb = window as Window & { pocketExportDb?: PocketExportDB };
  windowWithDb.pocketExportDb = db;
}
