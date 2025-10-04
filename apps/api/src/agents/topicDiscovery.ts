import { prisma } from "db";
import { TopicStatus, ContentType } from "@prisma/client";
import { fetchGoogleTrends } from "../lib/trends/googleTrends.js";
import { groupTitlesWithGemini, SourceInput } from "../lib/gemini.js";
import { slugify } from "../lib/slugify.js";

/**
 * Normalize incoming contentType values to match Prisma enum
 */
function normalizeContentType(val?: string | null): ContentType | null {
  if (!val) return null;
  const upper = val.toUpperCase();

  // Map common variations
  if (upper === "HOW-TO") return ContentType.HOWTO;

  // Pass through valid enum values
  if ((Object.values(ContentType) as string[]).includes(upper)) {
    return upper as ContentType;
  }

  // Fallback: drop invalids
  return null;
}

/**
 * Run full discovery pipeline:
 * 1) Fetch Google Trends
 * 2) Gemini groups + filters to tech topics
 * 3) Save topics + sources in DB (skip Qdrant for now)
 */
export async function runTopicDiscovery() {
  // 1) Fetch raw trends
  const items: SourceInput[] = await fetchGoogleTrends();
  if (!items.length) {
    console.warn("⚠️ No items fetched from Google Trends.");
    return [];
  }

  // 2) Group with Gemini (filters non-tech internally)
  let grouped;
  try {
    grouped = await groupTitlesWithGemini(items);
  } catch (err) {
    console.error("❌ Skipping save: Gemini grouping failed.", err);
    return []; // 🚫 Stop here — do not insert anything
  }

  if (!grouped?.topics?.length) {
    console.warn("⚠️ Gemini returned no topics after filtering.");
    return [];
  }

  const createdTopics: any[] = [];

  for (const group of grouped.topics) {
    const master = group.master?.trim();
    if (!master) continue;

    const topicSlug = slugify(master);

    // 3) Upsert in Postgres
    let topic = await prisma.topic.findUnique({
      where: { slug: topicSlug },
      include: { sources: true },
    });

    if (!topic) {
      topic = await prisma.topic.create({
        data: {
          title: master,
          slug: topicSlug,
          status: TopicStatus.NEW,
        },
        include: { sources: true },
      });
    }

    // Deduplicate & insert sources
    const existingUrls = new Set(topic.sources.map((s) => s.url));
    const newSources: SourceInput[] = (group.children || []).filter(
      (c: SourceInput) => c?.title && c?.url && !existingUrls.has(c.url)
    );

    if (newSources.length) {
      await prisma.source.createMany({
        data: newSources.map((s: any) => ({
          url: s.url,
          title: s.title,
          kind: s.kind,
          contentType: normalizeContentType(s.contentType),
          approved: false,
          topicId: topic!.id,
        })),
        skipDuplicates: true,
      });

      topic = await prisma.topic.findUnique({
        where: { id: topic.id },
        include: { sources: true },
      });
    }

    if (topic) {
      console.log(`📌 Saved topic: ${topic.title} (${topic.sources.length} sources)`);
      createdTopics.push(topic);
    }
  }

  return createdTopics.filter((t) => t?.status === TopicStatus.NEW);
}
