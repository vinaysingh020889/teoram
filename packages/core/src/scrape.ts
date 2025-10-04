import robots from "robots-parser";
export async function robotsAllowed(url: string, agent = "TeoramBot"){
  try{
    const u = new URL(url);
    const txt = await fetch(`${u.origin}/robots.txt`).then(r=>r.text());
    const rp = robots(`${u.origin}/robots.txt`, txt);
    return rp.isAllowed(url, agent);
  } catch {
    return true;
  }
}
export async function extractTextFromHtml(html: string){
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}