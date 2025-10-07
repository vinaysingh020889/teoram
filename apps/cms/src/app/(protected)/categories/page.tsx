//appscms/src/app/(protected)/categories/page.tsx
"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

type Subcategory = { id: string; name: string; slug: string; order: number; categoryId: string };
type Category = { id: string; name: string; slug: string; order: number; subcategories: Subcategory[] };

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

const load = async () => {
  setLoading(true);
  const { data } = await api.get("/categories");
  setItems(data?.data ?? []);
  setLoading(false);
};


  useEffect(() => {
    load();
  }, []);

  const createCategory = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await api.post("/categories", { name: newName.trim() });
    setNewName("");
    setCreating(false);
    load();
  };

  const updateCategory = async (id: string, patch: Partial<Category>) => {
    await api.patch(`/categories/${id}`, patch);
    load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category and all its subcategories?")) return;
    await api.delete(`/categories/${id}`);
    load();
  };

  const reorderCategories = async (ids: string[]) => {
    await api.post("/categories/reorder", { ids });
    load();
  };

  const createSub = async (categoryId: string, name: string) => {
    if (!name.trim()) return;
    await api.post(`/categories/${categoryId}/subcategories`, { name });
    load();
  };

  const updateSub = async (id: string, patch: Partial<Subcategory>) => {
    await api.patch(`/subcategories/${id}`, patch);
    load();
  };

  const deleteSub = async (id: string) => {
    if (!confirm("Delete this subcategory?")) return;
    await api.delete(`/subcategories/${id}`);
    load();
  };

  const reorderSubs = async (categoryId: string, ids: string[]) => {
    await api.post(`/categories/${categoryId}/subcategories/reorder`, { ids });
    load();
  };

  // simple reorder without a dnd lib (Up/Down buttons)
  const move = <T extends { id: string }>(arr: T[], from: number, to: number) => {
    const next = arr.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            className="px-3 py-2 border rounded w-64"
          />
          <button
            onClick={createCategory}
            disabled={creating || !newName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          >
            {creating ? "Creating..." : "Add Category"}
          </button>
        </div>
      </header>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">No categories yet.</p>
      ) : (
        <div className="space-y-4">
          {items.map((c, ci) => (
            <div key={c.id} className="rounded border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    defaultValue={c.name}
                    onBlur={(e) => {
                      const v = e.currentTarget.value.trim();
                      if (v && v !== c.name) updateCategory(c.id, { name: v });
                    }}
                    className="text-lg font-semibold bg-transparent border-b border-dashed focus:outline-none"
                  />
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">/{c.slug}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 text-sm border rounded"
                    onClick={() => {
                      if (ci === 0) return;
                      const next = move(items, ci, ci - 1);
                      setItems(next);
                      reorderCategories(next.map((x) => x.id));
                    }}
                  >
                    ↑
                  </button>
                  <button
                    className="px-2 py-1 text-sm border rounded"
                    onClick={() => {
                      if (ci === items.length - 1) return;
                      const next = move(items, ci, ci + 1);
                      setItems(next);
                      reorderCategories(next.map((x) => x.id));
                    }}
                  >
                    ↓
                  </button>

                  <button className="px-3 py-1 text-sm border rounded text-red-600" onClick={() => deleteCategory(c.id)}>
                    Delete
                  </button>
                </div>
              </div>

              {/* Subcategories */}
              <div className="mt-4 pl-2">
                <SubcategoryList
                  category={c}
                  onCreate={(name) => createSub(c.id, name)}
                  onUpdate={updateSub}
                  onDelete={deleteSub}
                  onReorder={(ids) => reorderSubs(c.id, ids)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function SubcategoryList({
  category,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: {
  category: any;
  onCreate: (name: string) => void;
  onUpdate: (id: string, patch: any) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const [name, setName] = useState("");
  const [subs, setSubs] = useState(category.subcategories as any[]);

  useEffect(() => setSubs(category.subcategories), [category.subcategories]);

  const move = <T extends { id: string }>(arr: T[], from: number, to: number) => {
    const next = arr.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add subcategory"
          className="px-3 py-2 border rounded w-80"
        />
        <button
          onClick={() => {
            if (!name.trim()) return;
            onCreate(name.trim());
            setName("");
          }}
          className="px-3 py-2 bg-gray-900 text-white rounded"
        >
          Add
        </button>
      </div>

      {subs.length === 0 ? (
        <p className="text-gray-400 text-sm">No subcategories</p>
      ) : (
        <ul className="divide-y border rounded">
          {subs.map((s, si) => (
            <li key={s.id} className="flex items-center justify-between p-2">
              <div className="flex items-center gap-3">
                <input
                  defaultValue={s.name}
                  onBlur={(e) => {
                    const v = e.currentTarget.value.trim();
                    if (v && v !== s.name) onUpdate(s.id, { name: v });
                  }}
                  className="bg-transparent border-b border-dashed focus:outline-none"
                />
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">/{s.slug}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 text-xs border rounded"
                  onClick={() => {
                    if (si === 0) return;
                    const next = move(subs, si, si - 1);
                    setSubs(next);
                    onReorder(next.map((x: any) => x.id));
                  }}
                >
                  ↑
                </button>
                <button
                  className="px-2 py-1 text-xs border rounded"
                  onClick={() => {
                    if (si === subs.length - 1) return;
                    const next = move(subs, si, si + 1);
                    setSubs(next);
                    onReorder(next.map((x: any) => x.id));
                  }}
                >
                  ↓
                </button>

                <button className="px-3 py-1 text-xs border rounded text-red-600" onClick={() => onDelete(s.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
