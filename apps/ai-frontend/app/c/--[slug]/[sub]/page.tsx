"use client";
import { useEffect, useMemo, useState } from "react";
import { api, arr, publishedOnly, byDateDesc } from "../../../lib/api";
import ArticleCard from "../../../../components/ArticleCard";

export default function SubcategoryPage({ params }: { params: { slug: string; sub: string } }){
  const [cats, setCats] = useState<any[]>([]);
  const [arts, setArts] = useState<any[]>([]);

  useEffect(()=>{
    api.get("/categories").then(r=>setCats(arr(r.data,["data"])) ).catch(()=>setCats([]));
    api.get("/articles").then(r=>setArts(publishedOnly(arr(r.data,["data"])) )).catch(()=>setArts([]));
  },[params.slug, params.sub]);

  const cat = useMemo(()=> cats.find((c:any)=>c.slug===params.slug) || null, [cats, params.slug]);
  const sub = useMemo(()=> cat?.subcategories?.find((s:any)=>s.slug===params.sub) || null, [cat, params.sub]);

  const items = useMemo(()=> !sub? [] : arts.filter((a:any)=> a.subcategoryId===sub.id).sort(byDateDesc), [arts, sub]);

  return (
    <main className="grid gap-6">
      <h1 className="h1">{sub?.name || params.sub}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((a:any)=> <ArticleCard key={a.id} a={a} />)}
        {items.length===0 && <p className="text-muted">No published articles in this subcategory.</p>}
      </div>
    </main>
  );
}