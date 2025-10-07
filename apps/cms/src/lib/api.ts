//apps/cms/src/lib/api.ts
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api/v1",
});

api.interceptors.request.use((cfg) => {
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("teoram_jwt");
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
  }
  return cfg;
});
