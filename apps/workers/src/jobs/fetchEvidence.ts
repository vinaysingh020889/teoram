import { RawTranscript, RawPage, connectMongo } from "core/src/mongo.js";
import { prisma } from "db";
import { extractTextFromHtml } from "core/src/scrape.js";
import { embedTexts } from "core/src/embeddings.js";
import { ensureCollection, qdrant, COLLECTION } from "core/src/qdrant.js";
import { YoutubeTranscript } from "youtube-transcript";

const chunk = (t: string, size = 180): string[] => {
  const words = t.split(/\s+/);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += size) {
    out.push(words.slice(i, i + size).join(" "));
  }
  return out;
};

export async function fetchEvidence() {
  await connectMongo();
  await ensureCollection();

  const approved = await prisma.source.findMany({
    where: { approved: true },
    include: { topic: true }
  });

  for (const s of approved) {
    if (s.kind === "YOUTUBE") {
      const id = s.url.split("/").pop();
      if (!id) continue;

      const transcript = await YoutubeTranscript.fetchTranscript(id).catch(() => null);

      if (transcript && transcript.length > 0) {
        const text = transcript.map((x: any) => x.text).join(" ");

        await RawTranscript.create({
          videoId: id,
          text,
          fetchedAt: new Date()
        });

        const ch = chunk(text);
        const vec = await embedTexts(ch);

        await qdrant.upsert(COLLECTION, {
          wait: true,
          points: ch.map((c, i) => ({
            id: `yt-${id}-${i}`,
            vector: vec[i],
            payload: {
              type: "yt",
              videoId: id,
              text: c,
              url: s.url
            }
          }))
        });
      }
    } else {
      const html = await fetch(s.url)
        .then((r) => r.text())
        .catch(() => "");

      if (html) {
        const text = (await extractTextFromHtml(html)).slice(0, 20000);

        await RawPage.create({
          url: s.url,
          html,
          site: new URL(s.url).hostname,
          fetchedAt: new Date()
        });

        const ch = chunk(text);
        const vec = await embedTexts(ch);

        await qdrant.upsert(COLLECTION, {
          wait: true,
          points: ch.map((c, i) => ({
            id: `pg-${s.id}-${i}`,
            vector: vec[i],
            payload: {
              type: "page",
              url: s.url,
              text: c
            }
          }))
        });
      }
    }
  }
}
