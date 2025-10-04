import { prisma } from "db";
export async function publish(){
  const art = await prisma.article.findFirst({ where:{ publishedAt: null, body_html: { not: "" } } });
  if(!art) return;
  await prisma.article.update({ where:{ id: art.id }, data:{ publishedAt: new Date() } });
}