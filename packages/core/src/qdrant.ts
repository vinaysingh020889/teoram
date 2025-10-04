import { QdrantClient } from "@qdrant/js-client-rest";
export const qdrant = new QdrantClient({ url: process.env.QDRANT_URL!, apiKey: process.env.QDRANT_API_KEY! });
export const COLLECTION = "evidence_chunks";
export async function ensureCollection(){
  const ex = await qdrant.getCollection(COLLECTION).catch(() => null);
  if(!ex){
    await qdrant.createCollection(COLLECTION, { vectors: { size: 384, distance: "Cosine" } });
  }
}