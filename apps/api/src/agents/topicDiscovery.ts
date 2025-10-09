//apps/api/src/agents/topicDiscovery.ts
import { prisma } from "db";
import { TopicStatus, ContentType } from "db";
import { fetchGoogleTrends } from "../lib/trends/googleTrends.js";
import { groupTitlesWithGemini, SourceInput, embedText } from "../lib/gemini.js";
import { slugify } from "../lib/slugify.js";
import { normalizeUrl, sha1 } from "../../../../packages/core/src/utils/url.js"; // keep .js
import { searchTopicVector, upsertTopicVector, ensureTopicCollection } from "../lib/qdrant.js";
import { randomUUID } from "crypto";
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
  await ensureTopicCollection();
  console.log("🚀 Starting topic discovery…");

  // 1) Fetch raw trends
  const items: SourceInput[] = await fetchGoogleTrends();
  console.log(`📰  Fetched ${items.length} items from Google Trends.`);

  // --- PRE-GEMINI URL DEDUP ---
  const itemsForGrouping: SourceInput[] = [];
  let skippedDuplicates = 0;

  for (const it of items) {
    if (!it?.url) continue;
    const urlNorm = normalizeUrl(it.url);
    const urlHash = sha1(urlNorm);

    // If you added @unique on Source.urlHash, you can use findUnique here.
    const exists = await prisma.source.findFirst({ where: { urlHash } });

    if (!exists) {
      itemsForGrouping.push({ ...it, urlNorm, urlHash } as any);
    } else {
      skippedDuplicates++;
      // 👇 exact message for titles eliminated as already present
      console.log(`⚪ Skipped duplicate source: "${it.title}" (${it.url})`);
    }
  }

  if (!itemsForGrouping.length) {
    console.warn("✅ No new URLs after deduplication.");
    console.log(`ℹ️ Summary: fetched=${items.length}, skippedDuplicates=${skippedDuplicates}, toGroup=0`);
    return [];
  }
  console.log(`🧩 ${itemsForGrouping.length} unique items will be grouped (skipped ${skippedDuplicates}).`);
  // --- END PRE-GEMINI URL DEDUP ---

  if (!items.length) {
    console.warn("⚠️ No items fetched from Google Trends.");
    return [];
  }

  // 2) Group with Gemini (filters non-tech internally)
  let grouped: { topics?: Array<{ master: string; children?: SourceInput[] }> } | undefined;
  let errorMessage: string | null = null;

try {
  grouped = await groupTitlesWithGemini(itemsForGrouping);
} catch (err: any) {
  console.error("❌ Gemini grouping failed:", err);
  errorMessage = err.message || "Gemini grouping failed";
}

if (!grouped?.topics?.length) {
  console.warn("⚠️ Gemini returned no topics after filtering.");
  errorMessage = errorMessage || "Gemini returned empty grouping";
  // 👇 ensure we still define an empty list to prevent TS undefined issues
  grouped = { topics: [] };
} else {
  console.log(`🧠 Gemini produced ${grouped.topics.length} topic groups.`);
}

const createdTopics: any[] = [];
let reusedCount = 0;
let createdCount = 0;

// ✅ Safe loop: TypeScript knows grouped.topics is always defined now
const safeTopics = grouped?.topics ?? [];
for (const group of safeTopics) {
    const master = group.master?.trim();
    if (!master) continue;

    const topicSlug = slugify(master);
    console.log(`\n🔍 Processing master topic: "${master}"`);

    // 2.5) Try semantic reuse via Qdrant (≥ 0.85)
    let topic: any = null;

    try {
      // 1) embed master title
      const vector = await embedText(master);

      // 2) ask Qdrant for nearest topic match (returns ScoredPoint[])
      const hits = await searchTopicVector(vector, 3, 0.75);
      if (hits.length) {
        const best = hits[0];
        const payload: any = best.payload || {};
        const reuseId = typeof best.id === "string" ? best.id : undefined;
        const reuseSlug = payload?.slug || (payload?.title ? slugify(payload.title) : undefined);

        // Prefer ID (we'll upsert with topic.id as the point id), else fallback to slug
        if (reuseId) {
          topic = await prisma.topic.findUnique({ where: { id: reuseId }, include: { sources: true } });
        } else if (reuseSlug) {
          topic = await prisma.topic.findUnique({ where: { slug: reuseSlug }, include: { sources: true } });
        }

        if (topic) {
          reusedCount++;
          console.log(`🔁 Reused existing topic → "${topic.title}" (id: ${topic.id})`);
          // refresh vector + optional fields
          await upsertTopicVector(randomUUID(), vector,{ title: master, slug: topic.slug, dbId: topic.id });

          await prisma.topic.update({
            where: { id: topic.id },
            data: {
              // lastSeenAt: new Date(),
              // titleEmbedding: vector as any,
            },
          });
        }
      }

      // 3) If no reusable topic, fall back to your original slug flow
      if (!topic) {
        topic = await prisma.topic.findUnique({
          where: { slug: topicSlug },
          include: { sources: true },
        });

        if (!topic) {
          topic = await prisma.topic.create({
            data: {
              title: master,
              slug: topicSlug,
              status: TopicStatus.NEW,
              // titleEmbedding: vector as any, // uncomment if you've added this field
            },
            include: { sources: true },
          });

          // 4) Index the new topic in Qdrant with Postgres topic.id as the point id
          //    This makes future reuse by ID trivial.
          await upsertTopicVector(
  randomUUID(),
  vector,
  { title: master, slug: topic.slug, dbId: topic.id }
);

          createdCount++;
          // 👇 exact message for newly inserted topic
          console.log(`🆕 Created NEW topic → "${master}" (slug: ${topic.slug}, id: ${topic.id})`);
          await prisma.auditLog.create({
  data: {
    action: "TOPIC_CREATED",
    topicId: topic.id,
    meta: {
      title: topic.title,
      sources: topic.sources?.length || 0,
      status: topic.status,
      reused: false,
    },
  },
});

        } else {
          // If found by slug only (without Qdrant), still useful to log
          reusedCount++;
          console.log(`🔁 Reused existing topic by slug → "${topic.title}" (id: ${topic.id})`);
          await prisma.auditLog.create({
  data: {
    action: "TOPIC_REUSED",
    topicId: topic.id,
    meta: {
      title: topic.title,
      sources: topic.sources?.length || 0,
      status: topic.status,
      reused: true,
    },
  },
});

        }
      }
    } catch (err) {
      console.error("⚠️ Qdrant/Gemini embedding lookup failed, falling back to slug:", err);

      // Original fallback (no embeddings)
      const topicSlugFallback = slugify(master);
      topic = await prisma.topic.findUnique({
        where: { slug: topicSlugFallback },
        include: { sources: true },
      });

      if (!topic) {
        topic = await prisma.topic.create({
          data: {
            title: master,
            slug: topicSlugFallback,
            status: TopicStatus.NEW,
          },
          include: { sources: true },
        });
        createdCount++;
        console.log(`🆕 Created NEW topic (fallback) → "${master}" (slug: ${topic.slug}, id: ${topic.id})`);
      } else {
        reusedCount++;
        console.log(`🔁 Reused existing topic (fallback) → "${topic.title}" (id: ${topic.id})`);
      }
    }

    // Deduplicate & insert sources
    const existingUrls = new Set(topic.sources.map((s: { url: string }) => s.url));
    const newSources: SourceInput[] = (group.children || []).filter(
      (c: SourceInput) => c?.title && c?.url && !existingUrls.has(c.url)
    );

    if (newSources.length) {
      await prisma.source.createMany({
        data: newSources.map((s: any) => {
          const urlNorm = normalizeUrl(s.url);
          const urlHash = sha1(urlNorm);
          return {
            url: s.url,
            urlNorm,
            urlHash,
            title: s.title,
            kind: s.kind,
            contentType: normalizeContentType(s.contentType),
            approved: false,
            topicId: topic!.id,
          };
        }),
        skipDuplicates: true,
      });

      console.log(`🪶 Added ${newSources.length} new sources under "${topic.title}"`);
    } else {
      console.log(`⚪ No new sources for "${topic.title}"`);
    }

    if (topic) {
      console.log(`📌 Saved topic: ${topic.title} (${topic.sources.length} sources total pre-insert)`); // note: count before refresh
      // optional: refresh topic.sources count from DB if you want the latest number here
      const refreshed = await prisma.topic.findUnique({
        where: { id: topic.id },
        include: { sources: true },
      });
      if (refreshed) {
        console.log(`📌 Post-insert sources count: ${refreshed.sources.length}`);
        createdTopics.push(refreshed);
      } else {
        createdTopics.push(topic);
      }
    }
  }
// === Log pipeline summary to AuditLog ===
const summary = {
  timestamp: new Date().toISOString(),
  fetchedCount: items.length,
  skippedDuplicates,
  groupedCount: grouped?.topics?.length || 0,
  topicsCreated: createdCount,
  topicsReused: reusedCount,
  sourcesFetched: itemsForGrouping.length,
  topicsProcessed: createdTopics.length,
  error: errorMessage, // ✅ FIX 1 — added missing comma before this line
};

try {
  await prisma.auditLog.create({
    data: { action: "TOPIC_DISCOVERY_RUN", meta: summary },
  });
  console.log("🧾 Discovery summary logged to AuditLog:", summary);
} catch (err) {
  console.error("❌ Failed to write AuditLog entry:", err);
}

// ✅ FIX 2 — safer summary console showing error field for debugging
console.log(
  `\n✅ Discovery completed. topicsProcessed=${createdTopics.length}, topicsCreated=${createdCount}, topicsReused=${reusedCount}, sourcesFetched=${items.length}, sourcesSkipped=${items.length - itemsForGrouping.length}, error=${errorMessage || "none"}`
);

return createdTopics.filter((t) => t?.status === TopicStatus.NEW);

}
