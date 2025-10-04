import { pipeline } from "@xenova/transformers";
let embedder: any;
export async function getEmbedder(){
  if(!embedder) embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  return embedder;
}
export async function embedTexts(texts: string[]){
  const m = await getEmbedder();
  const out: any = await m(texts, { pooling: "mean", normalize: true });
  return out.data as number[][];
}
export async function embedQuery(text: string){
  const m = await getEmbedder();
  const out: any = await m(text, { pooling: "mean", normalize: true });
  return Array.from(out.data) as number[];
}