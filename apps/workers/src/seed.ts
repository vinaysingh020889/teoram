import "dotenv/config";
import { prisma } from "db";
(async ()=>{
  const slug="iphone-16-pro";
  await prisma.topic.upsert({ where:{ slug }, update:{}, create:{ slug, title:"iPhone 16 Pro", score:10 } });
  console.log("Seeded topic");
})();