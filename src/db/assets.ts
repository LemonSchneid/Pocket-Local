import { v4 as uuidv4 } from "uuid";

import { db, type Asset } from "./index";

export type AssetInput = {
  article_id: string;
  url: string;
  content_type: string;
  blob: Blob;
};

export const createAsset = async (input: AssetInput): Promise<Asset> => {
  const asset: Asset = {
    id: uuidv4(),
    article_id: input.article_id,
    url: input.url,
    content_type: input.content_type,
    blob: input.blob,
    created_at: new Date().toISOString(),
  };

  await db.assets.add(asset);
  return asset;
};

export const listAssetsForArticle = async (
  articleId: string,
): Promise<Asset[]> => db.assets.where("article_id").equals(articleId).toArray();

export const getAssetById = async (id: string): Promise<Asset | undefined> =>
  db.assets.get(id);
