"use client";
import { useEffect, useMemo, useState } from "react";
import { api, arr, publishedOnly, byDateDesc } from "../../../lib/api";
import ArticleCard from "../../../components/ArticleCard";

export default function CategoryPage({ params }: { params: { slug: string } }){
  const [cats, setCats] = useState<any[]>([]);
  const [arts, setArts] = useState<any[]>([]);

  useEffect(()=>{
    api.get("/categories").then(r=>setCats(arr(r.data,["data"])) ).catch(()=>setCats([]));
    api.get("/articles").then(r=>setArts(publishedOnly(arr(r.data,["data"])) )).catch(()=>setArts([]));
  },[params.slug]);

  const cat = useMemo(()=> cats.find((c:any)=>c.slug===params.slug) || null, [cats, params.slug]);
  const items = useMemo(()=> !cat? [] : arts.filter((a:any)=> a.categoryId===cat.id).sort(byDateDesc), [arts, cat]);

  return (
    <main className="grid gap-6">
      <h1 className="h1">{cat?.name || params.slug}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((a:any)=> <ArticleCard key={a.id} a={a} />)}
        {items.length===0 && <p className="text-muted">No published articles in this category.</p>}
      </div>
    </main>
  );
}