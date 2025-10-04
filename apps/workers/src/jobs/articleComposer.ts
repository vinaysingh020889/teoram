import { prisma } from "db";
import { qdrant, COLLECTION } from "core/src/qdrant.js";
import { embedQuery } from "core/src/embeddings.js";

async function callGemini(prompt:string){
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key="+process.env.GEMINI_API_KEY, {
    method:"POST", headers:{ "content-type":"application/json" },
    body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] })
  });
  const j = await r.json(); return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function articleComposer(){
  const topic = await prisma.topic.findFirst({ where:{ status:"APPROVED" }, orderBy:{ score:"desc" } });
  if(!topic) return;
  const qvec = await embedQuery(`${topic.title} review India specs price`);
  const hits:any = await qdrant.search(COLLECTION, { vector:qvec, limit: 12, with_payload: true });
  const evidence = hits.map((h:any,i:number)=>`[#${i+1}] ${(h.payload?.text||"").slice(0,800)}`).join("\n\n");
  const prompt = `You are an evidence-first writer for Teoram. Use ONLY EVIDENCE below. Rules: short quotes <25 words with [#id]; no claims without evidence; output clean HTML (no inline styles).
TOPIC: ${topic.title}
EVIDENCE:
${evidence}
Sections: <h2>TL;DR</h2>, <h2>Pros</h2>, <h2>Cons</h2>, <h2>Overview</h2>, <h2>FAQ</h2>, <h2>Sources</h2>.`;
  const html = await callGemini(prompt);
  const slug = topic.slug;
  await prisma.article.upsert({ where:{ slug }, update:{ title:topic.title, body_html: html, metaTitle: topic.title, metaDescription: "Evidence-based brief" }, create:{ slug, title:topic.title, body_html: html } });
  await prisma.topic.update({ where:{ id: topic.id }, data:{ status:"DRAFTED" } });
}