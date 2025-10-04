// apps/api/src/lib/qdrant.ts
import { randomUUID } from "crypto";

const QDRANT_URL = process.env.QDRANT_URL!;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY!;

// Must match the dimension of your embedText() output.
// Gemini text-embedding-004 is 768 dims. Adjust if different.
const TOPICS_DIM = parseInt(process.env.QDRANT_TOPICS_DIM || "768", 10);
const COLLECTION = process.env.QDRANT_TOPICS_COLLECTION || "topics";

function h() {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (QDRANT_API_KEY) headers["api-key"] = QDRANT_API_KEY;
  return headers;
}

async function ensureCollection(): Promise<void> {
  // Check if collection exists
  const getRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, {
    method: "GET",
    headers: h(),
  });
  if (getRes.ok) return;

  // Create collection
  const createRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, {
    method: "PUT",
    headers: h(),
    body: JSON.stringify({
      vectors: { size: TOPICS_DIM, distance: "Cosine" },
    }),
  });
  if (!createRes.ok) {
    const txt = await createRes.text().catch(() => "");
    throw new Error(`Qdrant create collection failed: ${createRes.status} ${txt}`);
  }
}

/** Search the topics collection for the nearest match. Returns {title, score} or null. */
export async function searchTopic(vector: number[]): Promise<{ title: string; score: number } | null> {
  await ensureCollection();
  const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/search`, {
    method: "POST",
    headers: h(),
    body: JSON.stringify({
      vector,
      limit: 1,
      with_payload: true,
      with_vectors: false,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Qdrant search error: ${res.status} ${txt}`);
  }
  const data: any = await res.json();
  const best = data?.result?.[0];
  if (!best) return null;

  const title = best?.payload?.title;
  const score = typeof best?.score === "number" ? best.score : 0;
  if (!title) return null;

  return { title, score };
}

/** Upsert a topic title + vector into Qdrant. */
export async function upsertTopic(title: string, vector: number[]): Promise<void> {
  await ensureCollection();
  const id = randomUUID();
  const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points`, {
    method: "PUT",
    headers: h(),
    body: JSON.stringify({
      points: [
        {
          id,
          vector,
          payload: { title },
        },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Qdrant upsert error: ${res.status} ${txt}`);
  }
}
