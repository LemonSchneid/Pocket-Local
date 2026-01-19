export const ASSET_URL_PREFIX = "pocket-asset://";

export const buildAssetUrl = (assetId: string): string =>
  `${ASSET_URL_PREFIX}${assetId}`;

export const getAssetIdFromUrl = (assetUrl: string): string | null =>
  assetUrl.startsWith(ASSET_URL_PREFIX)
    ? assetUrl.slice(ASSET_URL_PREFIX.length)
    : null;
