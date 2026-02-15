import { useQuery } from "@tanstack/react-query";
import { getJson } from "../lib/api";

type BriefSummary = {
  slug?: string;
  date?: string;
  count?: number;
};

type RedisHealth = {
  status: "healthy" | "unhealthy";
  configured?: boolean;
  isOpen?: boolean;
  isReady?: boolean;
  error?: string;
};

export default function OverviewPage() {
  const briefQ = useQuery({
    queryKey: ["brief", "latest"],
    queryFn: () => getJson<BriefSummary>("/api/briefs/getSummary"),
    staleTime: 60_000,
  });

  const redisQ = useQuery({
    queryKey: ["health", "redis"],
    queryFn: () => getJson<RedisHealth>("/api/health/redis"),
    staleTime: 30_000,
  });

  const statsQ = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => getJson<any>("/api/admin/stats"),
    staleTime: 30_000,
  });

  return (
    <div className="page">
      <h1>Overview</h1>
      <p className="muted">Quick status for CryptoBriefs backend.</p>

      <div className="grid">
        <div className="card">
          <div className="cardLabel">Latest brief</div>
          {briefQ.isLoading ? (
            <div>Loading…</div>
          ) : briefQ.isError ? (
            <div className="err">Failed to load</div>
          ) : (
            <>
              <div className="big">{briefQ.data?.slug || "—"}</div>
              <div className="muted">items: {briefQ.data?.count ?? "—"}</div>
            </>
          )}
        </div>

        <div className="card">
          <div className="cardLabel">Redis</div>
          {redisQ.isLoading ? (
            <div>Checking…</div>
          ) : redisQ.isError ? (
            <div className="err">Failed to check</div>
          ) : (
            <>
              <div className="big">{redisQ.data?.status || "—"}</div>
              {redisQ.data?.error ? <div className="muted">{redisQ.data.error}</div> : null}
            </>
          )}
        </div>

        <div className="card">
          <div className="cardLabel">DB counts</div>
          {statsQ.isLoading ? (
            <div>Loading…</div>
          ) : statsQ.isError ? (
            <div className="err">Failed to load</div>
          ) : (
            <>
              <div className="big">{statsQ.data?.news ?? "—"} news</div>
              <div className="muted">
                briefs {statsQ.data?.summaries ?? "—"} · subscribers {statsQ.data?.subscribers ?? "—"} · signals {statsQ.data?.signals ?? "—"}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardLabel">Admin access</div>
        <div className="muted">
          Backend <code>/api/admin</code> is currently {String(import.meta.env.VITE_ADMIN_KEY || "").trim() ? "using x-admin-key" : "UNPROTECTED (ADMIN_KEY not set in backend)"}.
          Set <code>ADMIN_KEY</code> in backend env ASAP before public deploy.
        </div>
      </div>
    </div>
  );
}
