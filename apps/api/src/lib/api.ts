// apps/cms/src/lib/api.ts
import axios from "axios";
export const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1" });