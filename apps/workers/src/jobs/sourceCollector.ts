import Parser from "rss-parser";
import { prisma } from "db";
import { robotsAllowed } from "core/src/scrape.js";

export async function sourceCollector(){
  const topics = await prisma.topic.findMany({ where:{ status: { in:["NEW","COLLECTED"] } }, take: 5 });
  const feeds = [
    "https://www.gsmarena.com/rss-news-reviews.php3",
    "https://www.androidauthority.com/feed/",
    "https://www.xda-developers.com/feed/",
    "https://www.notebookcheck.net/RSS.6269.0.html"
  ];
  const parser = new Parser();
  for(const t of topics){
    for(const url of feeds){
      try {
        const feed = await parser.parseURL(url);
        for(const item of feed.items.slice(0,10)){
          const link = item.link!;
          if(!(await robotsAllowed(link))) continue;
          await prisma.source.upsert({ where:{ url: link }, update:{}, create:{ topicId: t.id, kind: "NEWS", url: link } });
        }
      } catch {}
    }
    const html = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(t.title+" review")}`).then(r=>r.text());
    const ids = [...html.matchAll(/\"videoId\":\"([a-zA-Z0-9_-]{11})\\"/g)].slice(0,5).map(m=>m[1]);
    for(const id of ids){
      await prisma.source.upsert({ where:{ url:`https://youtu.be/${id}` }, update:{}, create:{ topicId: t.id, kind:"YOUTUBE", url:`https://youtu.be/${id}` } });
    }
    await prisma.topic.update({ where:{ id: t.id }, data:{ status: "COLLECTED" } });
  }
}