export type ParsedPocketItem = {
  url: string;
  title: string;
  tags: string[];
};

export type ParsedPocketExport = {
  items: ParsedPocketItem[];
};

const normalizeTags = (rawTags: string | null): string[] => {
  if (!rawTags) {
    return [];
  }

  return rawTags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
};

export const parsePocketExport = (html: string): ParsedPocketExport => {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const links = Array.from(document.querySelectorAll("a[href]"));

  const items = links
    .map((link) => {
      const url = link.getAttribute("href")?.trim();
      if (!url) {
        return null;
      }

      const title = link.textContent?.trim() || url;
      const tags = normalizeTags(link.getAttribute("tags"));

      return {
        url,
        title,
        tags,
      } satisfies ParsedPocketItem;
    })
    .filter((item): item is ParsedPocketItem => item !== null);

  return { items };
};
