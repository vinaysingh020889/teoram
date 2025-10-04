import axios from "axios";
import { parseStringPromise } from "xml2js";
import type { SourceKind } from "@prisma/client";

export type TrendItem = {
  title: string;
  url: string;
  source: string;
  kind: SourceKind; // "NEWS"
};

const COUNTRY_CODES = ["IN", "US", "AU", "GB"];

export async function fetchGoogleTrends(): Promise<TrendItem[]> {
  const results: TrendItem[] = [];

  for (const country of COUNTRY_CODES) {
    const rssUrl = `https://trends.google.com/trending/rss?geo=${country}`;
    console.log(`🌍 Fetching Google Trends for ${country}…`);

    try {
      const { data: xml } = await axios.get(rssUrl);
      const parsed = await parseStringPromise(xml, { explicitArray: false });

      const items = parsed?.rss?.channel?.item || [];
      const normalized = Array.isArray(items) ? items : [items];

      for (const item of normalized) {
        let finalTitle = "";
        let finalUrl = "";
        let finalSource = `google-trends-${country.toLowerCase()}`;

        // extract from ht:news_item if available
        if (item["ht:news_item"]) {
          const news = Array.isArray(item["ht:news_item"])
            ? item["ht:news_item"][0]
            : item["ht:news_item"];

          finalTitle = news["ht:news_item_title"] || item.title || "";
          finalUrl = news["ht:news_item_url"] || item.link || "";
          finalSource = news["ht:news_item_source"] || finalSource;
        } else {
          // fallback
          finalTitle = item.title || "";
          finalUrl = item.link || "";
        }

        finalTitle = finalTitle.trim();
        finalUrl = finalUrl.trim();

        if (!finalTitle || !finalUrl) {
          console.warn(`⚠️ Skipping empty trend item for ${country}`);
          continue;
        }

        results.push({
          title: finalTitle,
          url: finalUrl,
          source: finalSource.trim(),
          kind: "NEWS",
        });

        console.log(`📰 [${country}] ${finalTitle} | ${finalUrl}`);
      }
    } catch (err) {
      console.error(`[!] Google Trends fetch failed for ${country}:`, err);
    }
  }

  console.log(`✅ Google Trends fetched ${results.length} items total`);
  return results;
}
