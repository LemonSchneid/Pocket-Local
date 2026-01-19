import { createAsset } from "../db/assets";
import { buildAssetUrl } from "../utils/assets";

type CacheAssetsResult = {
  contentHtml: string;
  cachedCount: number;
  failedCount: number;
};

const DEFAULT_CONCURRENCY = 4;

const resolveImageUrl = (src: string, baseUrl: string): string | null => {
  if (!src || src.startsWith("data:")) {
    return null;
  }

  try {
    return new URL(src, baseUrl).toString();
  } catch {
    return null;
  }
};

const fetchImageBlob = async (
  url: string,
): Promise<{ blob: Blob; contentType: string }> => {
  const response = await fetch(url, { method: "GET", mode: "cors" });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const contentType =
    response.headers.get("content-type") ||
    blob.type ||
    "application/octet-stream";

  return { blob, contentType };
};

const withConcurrency = async <T,>(
  items: T[],
  limit: number,
  handler: (item: T) => Promise<void>,
) => {
  let index = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      await handler(items[currentIndex]);
    }
  });

  await Promise.all(workers);
};

export const cacheArticleAssets = async ({
  articleId,
  articleUrl,
  contentHtml,
  concurrency = DEFAULT_CONCURRENCY,
}: {
  articleId: string;
  articleUrl: string;
  contentHtml: string;
  concurrency?: number;
}): Promise<CacheAssetsResult> => {
  if (!contentHtml.trim()) {
    return { contentHtml, cachedCount: 0, failedCount: 0 };
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(contentHtml, "text/html");
  const images = Array.from(document.querySelectorAll("img"));
  const imageTargets = images
    .map((image) => ({
      element: image,
      source: image.getAttribute("src") ?? "",
    }))
    .map(({ element, source }) => ({
      element,
      source,
      resolvedUrl: resolveImageUrl(source, articleUrl),
    }))
    .filter((item) => item.resolvedUrl);

  const uniqueUrls = Array.from(
    new Set(imageTargets.map((item) => item.resolvedUrl)),
  ) as string[];

  const urlToAssetId = new Map<string, string>();
  let cachedCount = 0;
  let failedCount = 0;

  await withConcurrency(uniqueUrls, Math.max(1, concurrency), async (url) => {
    try {
      const { blob, contentType } = await fetchImageBlob(url);
      const asset = await createAsset({
        article_id: articleId,
        url,
        content_type: contentType,
        blob,
      });
      urlToAssetId.set(url, asset.id);
      cachedCount += 1;
    } catch {
      failedCount += 1;
    }
  });

  imageTargets.forEach((item) => {
    const resolvedUrl = item.resolvedUrl;
    if (!resolvedUrl) {
      return;
    }

    const assetId = urlToAssetId.get(resolvedUrl);
    if (!assetId) {
      return;
    }

    item.element.setAttribute("src", buildAssetUrl(assetId));
    item.element.removeAttribute("srcset");
  });

  return {
    contentHtml: document.body.innerHTML,
    cachedCount,
    failedCount,
  };
};
