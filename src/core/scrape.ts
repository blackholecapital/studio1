export type ScrapeResult = {
  title?: string;
  headings: string[];
  socials: { label: string; url: string }[];
  logos: string[];
  metaDescription?: string;
};

function uniq(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

export function scrapeHtml(html: string, baseUrl?: string): ScrapeResult {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const title = doc.querySelector("title")?.textContent?.trim() ?? undefined;
  const metaDescription =
    doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? undefined;

  const headings = uniq(
    Array.from(doc.querySelectorAll("h1,h2"))
      .map((n) => (n.textContent ?? "").trim())
      .filter(Boolean)
  ).slice(0, 24);

  const socialsRaw = Array.from(doc.querySelectorAll('a[href^="http"]'))
    .map((a) => a.getAttribute("href") ?? "")
    .filter(Boolean)
    .filter((href) => /(twitter|x\.com|instagram|linkedin|discord|t\.me|youtube|facebook)/i.test(href));

  const socials = uniq(socialsRaw).slice(0, 24).map((url) => ({
    label: url.includes("discord")
      ? "Discord"
      : url.includes("linkedin")
      ? "LinkedIn"
      : url.includes("instagram")
      ? "Instagram"
      : url.includes("youtube")
      ? "YouTube"
      : url.includes("t.me")
      ? "Telegram"
      : url.includes("facebook")
      ? "Facebook"
      : url.includes("twitter") || url.includes("x.com")
      ? "X"
      : "Social",
    url
  }));

  const logosRaw = Array.from(doc.images)
    .map((img) => img.getAttribute("src") ?? "")
    .filter((src) => /logo/i.test(src))
    .slice(0, 12);

  const logos = uniq(
    logosRaw.map((src) => {
      if (!baseUrl) return src;
      try {
        return new URL(src, baseUrl).toString();
      } catch {
        return src;
      }
    })
  );

  return { title, headings, socials, logos, metaDescription };
}

/**
 * NOTE: Most sites block browser fetch due to CORS.
 * This is best-effort; paste HTML if fetch fails.
 */
export async function tryFetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return await res.text();
}
