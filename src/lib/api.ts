import axios from "axios";
import { ADMIN_KEY, apiUrl } from "./config";

export const api = axios.create({
  // baseURL is optional; we use apiUrl for clarity
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  // Attach admin key when present.
  // Backend should validate this for /api/admin/* endpoints.
  if (ADMIN_KEY) {
    config.headers = config.headers || {};
    config.headers["x-admin-key"] = ADMIN_KEY;
  }
  return config;
});

export async function getJson<T>(path: string): Promise<T> {
  const url = apiUrl(path);
  const res = await api.get<T>(url);
  return res.data;
}
