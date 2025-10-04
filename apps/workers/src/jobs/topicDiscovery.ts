// @ts-expect-error no types available
import trends from "google-trends-api";
import { prisma } from "db";

/**
 * Convert a phrase into a slug (URL-friendly)
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface DailyTrendsResponse {
  default?: {
    trendingSearchesDays?: {
      trendingSearches?: {
        title: { query: string };
      }[];
    }[];
  };
}

export async function topicDiscovery() {
  try {
    const res = await trends
      .dailyTrends({ geo: "IN", trendDate: new Date() })
      .catch(() => null);

    if (!res) {
      console.warn("[topicDiscovery] No response from Google Trends");
      return;
    }

    const obj = JSON.parse(res as string) as DailyTrendsResponse;
    const items: string[] = [];

    obj?.default?.trendingSearchesDays?.forEach((day) =>
      day.trendingSearches?.forEach((t) => items.push(t.title.query))
    );

    if (items.length === 0) {
      console.warn("[topicDiscovery] No trending items found");
      return;
    }

    // Count scores
    const score = new Map<string, number>();
    items.forEach((q) => score.set(q, (score.get(q) ?? 0) + 1));

    // Top 20 trends
    const top = [...score.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    for (const [title, s] of top) {
      const slug = slugify(title);
      await prisma.topic.upsert({
        where: { slug },
        update: { score: s },
        create: { slug, title, score: s }
      });
      console.log(`[topicDiscovery] Upserted topic: ${title} (${s})`);
    }
  } catch (err) {
    console.error("[topicDiscovery] Error:", err);
  }
}
