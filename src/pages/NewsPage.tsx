import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "../lib/api";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type NewsItem = {
  _id: string;
  title: string;
  link: string;
  image?: string;
  published: string;
  sentiment: "bullish" | "bearish" | "neutral";
  coins: string[];
};

type NewsResponse = {
  success: boolean;
  data: NewsItem[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
};

type SourceStatItem = { source: string; count: number };

type SourceStats = {
  days: number;
  total: number;
  uniqueSources: number;
  items: SourceStatItem[];
};

function SourcePie({ items }: { items: SourceStatItem[] }) {
  const palette = [
    "#7c5cff",
    "#24cf8f",
    "#ff6b6b",
    "#f7b731",
    "#45aaf2",
    "#a55eea",
    "#fd9644",
    "#2bcbba",
    "#4b7bec",
    "#778ca3",
    "#fc5c65",
    "#26de81",
  ];

  // recharts expects {name, value}
  const data = items.map((it) => ({ name: it.source, value: it.count }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14, marginTop: 12, alignItems: "center" }}>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={2}
              stroke="rgba(255,255,255,0.12)"
            >
              {data.map((entry, idx) => (
                <Cell key={`cell-${entry.name}`} fill={palette[idx % palette.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "rgba(10,10,14,0.95)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                color: "#f1f3f9",
              }}
              itemStyle={{ color: "#f1f3f9" }}
              formatter={(value: any) => [value, "articles"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div>
        <div className="muted" style={{ marginBottom: 8 }}>
          Top sources
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((it, idx) => (
            <div key={it.source} style={{ display: "grid", gridTemplateColumns: "18px 1fr 60px", gap: 10, alignItems: "center" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: palette[idx % palette.length] }} />
              <div className="mono" style={{ opacity: 0.9 }}>
                {it.source}
              </div>
              <div className="mono" style={{ textAlign: "right" }}>
                {it.count}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NewsPage() {
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ["news", page],
    queryFn: () => getJson<NewsResponse>(`/api/news/news?page=${page}&limit=20&order=desc`),
    staleTime: 30_000,
  });

  const srcQ = useQuery({
    queryKey: ["admin", "news", "source-stats", "7d"],
    queryFn: () => getJson<SourceStats>(`/api/admin/news/source-stats?days=7&limit=12`),
    staleTime: 60_000,
  });

  const rows = useMemo(() => q.data?.data || [], [q.data]);
  const totalPages = q.data?.pagination?.totalPages || 1;

  // maxSourceCount was used for bar charts; pie chart does not need it.

  return (
    <div className="page">
      <h1>News</h1>
      <p className="muted">Pulled from backend <code>/api/news/news</code>.</p>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="cardLabel">Source distribution (last 7 days)</div>
        {srcQ.isLoading ? (
          <div style={{ marginTop: 8 }}>Loading…</div>
        ) : srcQ.isError ? (
          <div className="err" style={{ marginTop: 8 }}>
            Failed to load source stats (needs backend /api/admin/news/source-stats)
          </div>
        ) : (
          <>
            <div className="muted" style={{ marginTop: 6 }}>
              total {srcQ.data?.total ?? "—"} items · {srcQ.data?.uniqueSources ?? "—"} sources
            </div>
            <SourcePie items={srcQ.data?.items || []} />
          </>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table">
          <div className="thead">
            <div>Published</div>
            <div>Title</div>
            <div>Coins</div>
            <div>Sentiment</div>
          </div>

          {q.isLoading ? (
            <div className="trow">Loading…</div>
          ) : q.isError ? (
            <div className="trow err">Failed to load news</div>
          ) : rows.length === 0 ? (
            <div className="trow">No data</div>
          ) : (
            rows.map((n) => (
              <div className="trow" key={n._id}>
                <div className="mono">{new Date(n.published).toLocaleString()}</div>
                <div>
                  <a href={n.link} target="_blank" rel="noreferrer">
                    {n.title}
                  </a>
                </div>
                <div className="mono">{(n.coins || []).join(", ") || "—"}</div>
                <div className={`pill ${n.sentiment}`}>{n.sentiment}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
        <button className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Prev
        </button>
        <div className="muted">
          page {page} / {totalPages}
        </div>
        <button className="btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}
