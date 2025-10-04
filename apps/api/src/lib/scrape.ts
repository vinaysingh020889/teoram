import * as cheerio from "cheerio";

export async function scrapeUrl(url: string): Promise<{ title?: string; text?: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TeoramBot/1.0; +https://teoram.example)",
      },
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("title").first().text();
    const text = $("article").text() || $("body").text();
    return { title, text };
  } catch {
    return null;
  }
}

export async function fetchYouTubeTranscript(url: string): Promise<string | null> {
  // Placeholder — wire to your captions API/library when ready
  return null;
}