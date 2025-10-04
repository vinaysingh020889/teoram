"use client";

import { api } from "../lib/api";
import { useRouter } from "next/navigation";

export function DeleteTopicButton({ id }: { id: string }) {
  const router = useRouter();

  const onDelete = async () => {
    if (!confirm("Delete this topic?")) return;
    try {
      await api.delete(`/topics/${id}`);
      router.refresh(); // refreshes the page so list updates
    } catch (e) {
      console.error("Failed to delete topic", e);
      alert("Delete failed");
    }
  };

  return (
    <button
      onClick={onDelete}
      className="px-2 py-1 bg-red-600 text-white rounded"
    >
      Delete
    </button>
  );
}
