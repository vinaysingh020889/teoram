import { prisma } from "db";
import { fetchGoogleTrends } from "./trends/googleTrends.js";
// YouTube disabled for now
// import { fetchYouTubeTrends } from "./trends/youtubeTrends.js";
import { groupTitlesWithGemini } from "./gemini.js";
import { slugify } from "./slugify.js";
import type { SourceKind, ContentType } from "@prisma/client";

type InputItem = {
  title: string;
  url: string;
  kind: SourceKind; // 👈 use Prisma enum directly
  contentType?: ContentType | null; // 👈 optional classification
};

export async function runDiscoveryPipeline() {
  // Step 1 — fetch (Google Trends only for now)
  const gnews = await fetchGoogleTrends();
  const items: InputItem[] = [...gnews];

  if (!items.length) {
    console.warn("⚠️ No trending items fetched");
    return [];
  }

  // Step 2 — group with Gemini
  const grouped = await groupTitlesWithGemini(items);
  let clusters = grouped.topics || [];

  if (!clusters.length) {
    console.warn("⚠️ Gemini returned no topics — using fallback (Ungrouped)");
    clusters = [
      {
        master: "Ungrouped",
        children: items.filter((i) => i.title && i.url),
      },
    ];
  }

  const createdTopics: any[] = [];

  // Step 3 — Persist directly to Postgres
  for (const cluster of clusters) {
    const { master, children } = cluster;
    if (!master) continue;

    // 3a) topic upsert (slug unique)
    const slug = slugify(master);
    const topic = await prisma.topic.upsert({
      where: { slug },
      update: { title: master },
      create: { slug, title: master, status: "NEW" },
    });

    // 3b) insert sources
    for (const src of children as InputItem[]) {
      if (!src.title || !src.url) continue;

      const exists = await prisma.source.findFirst({
        where: { url: src.url, topicId: topic.id },
        select: { id: true },
      });

      if (!exists) {
        await prisma.source.create({
          data: {
            url: src.url,
            title: src.title,
            kind: src.kind,
            contentType: src.contentType ?? null,
            topicId: topic.id,
            approved: false,
          },
        });
      }
    }

    console.log(`📌 Saved topic: ${topic.title}`);
    createdTopics.push(topic);
  }

  return createdTopics;
}
