import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "../lib/api";

type Subscriber = {
  _id: string;
  email: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type NewsletterAdminResponse = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: Subscriber[];
};

export default function NewsletterPage() {
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ["admin", "newsletter", page],
    queryFn: () => getJson<NewsletterAdminResponse>(`/api/admin/newsletter?page=${page}&limit=50`),
    staleTime: 30_000,
  });

  const rows = useMemo(() => q.data?.data || [], [q.data]);
  const totalPages = q.data?.totalPages || 1;

  return (
    <div className="page">
      <h1>Newsletter</h1>
      <p className="muted">All users who joined the newsletter (backend: <code>/api/admin/newsletter</code>).</p>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardLabel">Summary</div>
        {q.isLoading ? (
          <div style={{ marginTop: 8 }}>Loading…</div>
        ) : q.isError ? (
          <div className="err" style={{ marginTop: 8 }}>Failed to load subscribers</div>
        ) : (
          <div style={{ marginTop: 8 }} className="muted">
            total: <span className="mono">{q.data?.total ?? "—"}</span>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden", marginTop: 14 }}>
        <div className="table">
          <div className="thead" style={{ gridTemplateColumns: "1fr 140px 220px" }}>
            <div>Email</div>
            <div>Status</div>
            <div>Joined</div>
          </div>

          {q.isLoading ? (
            <div className="trow">Loading…</div>
          ) : q.isError ? (
            <div className="trow err">Failed to load</div>
          ) : rows.length === 0 ? (
            <div className="trow">No data</div>
          ) : (
            rows.map((s) => (
              <div className="trow" key={s._id} style={{ gridTemplateColumns: "1fr 140px 220px" }}>
                <div className="mono">{s.email}</div>
                <div>{s.status || "—"}</div>
                <div className="mono">
                  {s.createdAt ? new Date(s.createdAt).toLocaleString() : "—"}
                </div>
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
