export const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
export const ADMIN_KEY = String(import.meta.env.VITE_ADMIN_KEY || "").trim();

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) throw new Error(`apiUrl(): path must start with "/" (got: ${path})`);
  if (!API_BASE) return path;
  return `${API_BASE}${path}`;
}
