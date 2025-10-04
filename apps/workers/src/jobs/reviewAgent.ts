import { RawComments, connectMongo } from "core/src/mongo.js";
import { prisma } from "db";
import ytdlpexec from "yt-dlp-exec";

function simpleSentiment(txt:string){
  const t = txt.toLowerCase();
  const pos = ["good","great","love","best","amazing","fast","smooth"];
  const neg = ["bad","worst","hate","lag","heating","bug","issue"];
  let s=0; pos.forEach(w=>{ if(t.includes(w)) s++; }); neg.forEach(w=>{ if(t.includes(w)) s--; });
  return s>0?"positive":s<0?"negative":"neutral";
}

export async function reviewAgent(){
  await connectMongo();
  const ytSources = await prisma.source.findMany({ where:{ kind:"YOUTUBE", approved:true } });
  for(const s of ytSources){
    const id = s.url.split("/").pop();
    try{
      const out: any = await ytdlpexec(id!, { dumpSingleJson: true, getComments: true } as any);
      const comments = (out?.comments||[]).slice(0,100).map((c:any)=>({ author:c.author, text:c.text, like_count:c.like_count }));
      await RawComments.create({ videoId:id, comments, fetchedAt:new Date() });
      let pos=0,neg=0,neu=0;
      comments.forEach((c:any)=>{ const r=simpleSentiment(c.text); if(r==="positive") pos++; else if(r==="negative") neg++; else neu++; });
      const total=Math.max(1,comments.length);
      const health = (pos*1 + neu*0.5)/total;
      await prisma.sentimentAgg.create({ data:{ topicId: s.topicId, sourceId: s.id, platform:"youtube", positive:pos, negative:neg, neutral:neu, mixed:0, healthScore: Number(health.toFixed(2)) } });
    }catch{ /* ignore */ }
  }
}