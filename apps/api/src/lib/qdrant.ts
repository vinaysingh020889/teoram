//apps/api/src/lib/qdrant.ts
import { QdrantClient } from "@qdrant/js-client-rest";

const QDRANT_URL = process.env.QDRANT_URL!;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY!;

export const qdrant = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

export const TOPIC_COLLECTION = process.env.QDRANT_TOPICS_COLLECTION || "topics";
const VECTOR_SIZE = parseInt(process.env.QDRANT_TOPICS_DIM || "768", 10); // Gemini text-embedding-004 = 768


export async function ensureTopicCollection() {
  const exists = await qdrant.getCollections().then(r => r.collections?.some(c => c.name === TOPIC_COLLECTION));
  if (!exists) {
    await qdrant.createCollection(TOPIC_COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
  }
}

export async function upsertTopicVector(id: string, vector: number[], payload: Record<string, any>) {
  await qdrant.upsert(TOPIC_COLLECTION, {
    points: [{ id, vector, payload }],
  });
}

export async function searchTopicVector(vector: number[], limit = 3, threshold = 0.85) {
  const res = await qdrant.search(TOPIC_COLLECTION, { vector, limit, with_payload: true });
  return (res || []).filter(p => (typeof p.score === "number" ? p.score : 0) >= threshold);
}