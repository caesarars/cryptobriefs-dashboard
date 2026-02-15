import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getJson } from "../lib/api";
import { apiUrl } from "../lib/config";
import axios from "axios";

type DraftResp = {
  title: string;
  content: string;
  imageBase64?: string | null;
  imageMimeType?: string | null;
};

type OptimizeTitleResp = { title: string };

type GeneratePostResp = { content: string };

type GenerateImageResp = { imageBase64: string; imageMimeType: string };

type IdeasResp = { text: string };

type BatchDraft = {
  id: string;
  topic: string;
  title: string;
  content: string;
  status: "draft" | "publishing" | "published" | "error";
  slug?: string;
  error?: string;
};

const DEFAULT_TAGS =
  "AI,crypto,trading,Portfolio,Technology,Blockchain,Cryptocurrency,Crypto,bots,Bitcoin,btc";

function extractIdeas(rawText: string): string[] {
  return Array.from(String(rawText || "").matchAll(/\d+\.\s+(.*)/g))
    .map((m) => m[1]?.trim())
    .filter(Boolean) as string[];
}

export default function AIBlogPage() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Professional");
  const [length, setLength] = useState("Medium (~400-500 words)");
  const [audience, setAudience] = useState("General Audience");
  const [withImage, setWithImage] = useState(true);

  const [draft, setDraft] = useState<DraftResp | null>(null);
  const [heroPreview, setHeroPreview] = useState<string>("");
  const [publishStatus, setPublishStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Step-by-step status (mirror CMS)
  const [statusUpdates, setStatusUpdates] = useState<string[]>([]);
  const appendStatus = useCallback((msg: string) => setStatusUpdates((prev) => [...prev, msg]), []);
  const [isWorking, setIsWorking] = useState(false);

  // Batch
  const [ideas, setIdeas] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [batchDrafts, setBatchDrafts] = useState<BatchDraft[]>([]);
  const [batchBusy, setBatchBusy] = useState(false);

  const selectedIdeas = useMemo(() => ideas.filter((i) => selected[i]), [ideas, selected]);

  const ideasQ = useQuery({
    queryKey: ["admin", "aiBlog", "ideas"],
    queryFn: () => getJson<IdeasResp>("/api/admin/ai-blog/ideas"),
    enabled: false,
  });

  const optimizeTitle = useCallback(async () => {
    setError("");
    setPublishStatus("");
    setStatusUpdates([]);

    if (!topic.trim()) {
      setError("Topic is required");
      return;
    }

    setIsWorking(true);
    try {
      appendStatus("Optimizing headline with Gemini...");
      const resp = await api.post<OptimizeTitleResp>(apiUrl("/api/admin/ai-blog/optimize-title"), { title: topic });
      const improved = String(resp.data?.title || "").trim();
      if (improved) {
        setTopic(improved);
        appendStatus(`Optimized title selected: ${improved}`);
      } else {
        appendStatus("Optimize returned empty. Keeping original.");
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Failed to optimize title");
    } finally {
      setIsWorking(false);
    }
  }, [appendStatus, topic]);

  const generateContent = useCallback(async () => {
    setError("");
    setPublishStatus("");
    setDraft(null);

    if (!topic.trim()) {
      setError("Title/topic is required");
      return;
    }

    setIsWorking(true);
    setStatusUpdates([]);
    try {
      appendStatus("Writing article draft with Gemini...");
      const resp = await api.post<GeneratePostResp>(apiUrl("/api/admin/ai-blog/generate-post"), {
        title: topic,
        tone,
        length,
        audience,
      });

      const content = String(resp.data?.content || "");
      setDraft({ title: topic, content });
      appendStatus("Draft content generated.");
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Failed to generate content");
    } finally {
      setIsWorking(false);
    }
  }, [appendStatus, audience, length, tone, topic]);

  const generateHeroImage = useCallback(async () => {
    setError("");
    setPublishStatus("");
    setHeroPreview("");

    if (!topic.trim()) {
      setError("Title/topic is required");
      return;
    }

    setIsWorking(true);
    try {
      appendStatus("Generating hero image...");
      const resp = await api.post<GenerateImageResp>(apiUrl("/api/admin/ai-blog/generate-image"), {
        title: topic,
        tone,
      });

      const b64 = resp.data?.imageBase64;
      const mime = resp.data?.imageMimeType || "image/jpeg";
      if (b64) {
        setDraft((prev) => ({
          title: prev?.title || topic,
          content: prev?.content || "",
          imageBase64: b64,
          imageMimeType: mime,
        }));
        setHeroPreview(`data:${mime};base64,${b64}`);
        appendStatus("Hero image generated.");
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Failed to generate image");
    } finally {
      setIsWorking(false);
    }
  }, [appendStatus, tone, topic]);

  const publishDraft = useCallback(async () => {
    setError("");
    setPublishStatus("");

    if (!draft?.title || !draft?.content) {
      setError("Generate content first");
      return;
    }

    setIsWorking(true);
    try {
      appendStatus("Publishing blog post...");
      setPublishStatus("Publishing...");

      let imageUrl = "";
      if (draft.imageBase64) {
        const upload = await axios.post(apiUrl("/api/upload"), { base64: draft.imageBase64 });
        imageUrl = upload.data?.url || "";
      }

      const blog = await axios.post(apiUrl("/api/blog"), {
        title: draft.title,
        content: draft.content,
        blog: draft.title,
        tag: DEFAULT_TAGS,
        imageUrl,
      });

      const slug = blog.data?.blog?.slug;
      appendStatus("Blog post published successfully.");
      setPublishStatus(slug ? `Published: /blog/${slug}` : "Published");
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Publish failed");
      setPublishStatus("");
      appendStatus("Publish aborted due to an error.");
    } finally {
      setIsWorking(false);
    }
  }, [appendStatus, draft]);

  const loadIdeas = useCallback(async () => {
    setError("");
    setBatchDrafts([]);
    setIdeas([]);
    setSelected({});

    try {
      const data = await ideasQ.refetch();
      const text = data.data?.text || "";
      const list = extractIdeas(text);
      setIdeas(list);
      const init: Record<string, boolean> = {};
      list.slice(0, 5).forEach((t) => (init[t] = true));
      setSelected(init);
    } catch (e: any) {
      setError(e?.message || "Failed to load ideas");
    }
  }, [ideasQ]);

  const generateBatch = useCallback(async () => {
    setError("");
    setBatchDrafts([]);

    if (!selectedIdeas.length) {
      setError("Select at least 1 idea");
      return;
    }

    setBatchBusy(true);
    try {
      const out: BatchDraft[] = [];
      for (const idea of selectedIdeas) {
        const resp = await api.post<DraftResp>(apiUrl("/api/admin/ai-blog/draft"), {
          topic: idea,
          tone,
          length,
          audience,
          withImage: false, // batch no image for speed
        });

        out.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          topic: idea,
          title: resp.data.title,
          content: resp.data.content,
          status: "draft",
        });
        setBatchDrafts([...out]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Batch generation failed");
    } finally {
      setBatchBusy(false);
    }
  }, [audience, length, selectedIdeas, tone]);

  const publishOne = useCallback(async (id: string) => {
    setBatchDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: "publishing", error: undefined } : d)));
    const d = batchDrafts.find((x) => x.id === id);
    if (!d) return;

    try {
      const blog = await axios.post(apiUrl("/api/blog"), {
        title: d.title,
        content: d.content,
        blog: d.title,
        tag: DEFAULT_TAGS,
        imageUrl: "",
      });

      const slug = blog.data?.blog?.slug;
      setBatchDrafts((prev) => prev.map((x) => (x.id === id ? { ...x, status: "published", slug } : x)));
    } catch (e: any) {
      setBatchDrafts((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: "error", error: e?.message || "Publish failed" } : x))
      );
    }
  }, [batchDrafts]);

  return (
    <div className="page">
      <h1>AI Blog</h1>
      <p className="muted">
        Generate blog drafts via backend Gemini (admin endpoints), then publish to CryptoBriefs backend.
      </p>

      {error ? (
        <div className="card" style={{ borderColor: "rgba(255,107,107,0.35)" }}>
          <div className="err">{error}</div>
        </div>
      ) : null}

      <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 14 }}>
        <div className="card">
          <div className="cardLabel">AI Draft Generator</div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <label className="muted">
              Topic
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="btn"
                style={{ width: "100%" }}
                placeholder="e.g., ETH restaking risk changes in 2026"
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="muted">
                Tone
                <input value={tone} onChange={(e) => setTone(e.target.value)} className="btn" style={{ width: "100%" }} />
              </label>
              <label className="muted">
                Audience
                <input value={audience} onChange={(e) => setAudience(e.target.value)} className="btn" style={{ width: "100%" }} />
              </label>
            </div>

            <label className="muted">
              Length
              <input value={length} onChange={(e) => setLength(e.target.value)} className="btn" style={{ width: "100%" }} />
            </label>

            <label className="muted" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="checkbox" checked={withImage} onChange={(e) => setWithImage(e.target.checked)} />
              Generate hero image
            </label>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" onClick={loadIdeas}>Load ideas</button>
              <button className="btn" onClick={optimizeTitle} disabled={isWorking}>Improve title</button>
              <button className="btn" onClick={generateContent} disabled={isWorking}>Generate content</button>
              <button className="btn" onClick={generateHeroImage} disabled={isWorking || !withImage}>Generate image</button>
              <button className="btn" onClick={publishDraft} disabled={isWorking}>Publish</button>
              {publishStatus ? <span className="muted">{publishStatus}</span> : null}
            </div>

            {statusUpdates.length ? (
              <div className="card" style={{ marginTop: 10 }}>
                <div className="cardLabel">Status</div>
                <ul style={{ marginTop: 8 }}>
                  {statusUpdates.map((s, i) => (
                    <li key={i} className="muted">{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {ideas.length ? (
              <div className="card" style={{ marginTop: 10 }}>
                <div className="cardLabel">Ideas</div>
                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  {ideas.map((idea) => (
                    <label key={idea} className="muted" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <input
                        type="radio"
                        checked={topic === idea}
                        onChange={() => setTopic(idea)}
                      />
                      <span>{idea}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {draft ? (
              <div className="card" style={{ marginTop: 10 }}>
                <div className="cardLabel">Preview</div>
                {heroPreview ? (
                  <img src={heroPreview} alt="hero" style={{ width: "100%", borderRadius: 12, marginTop: 10 }} />
                ) : null}
                <div style={{ marginTop: 10, fontWeight: 900 }}>{draft.title}</div>
                <pre style={{ whiteSpace: "pre-wrap", opacity: 0.8 }}>{draft.content}</pre>
              </div>
            ) : null}
          </div>
        </div>

        <div className="card">
          <div className="cardLabel">AI Batch Generator</div>
          <div className="muted" style={{ marginTop: 8 }}>
            Load ideas → select → generate drafts → publish individually.
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button className="btn" onClick={loadIdeas}>
              Load ideas
            </button>
            <button className="btn" onClick={generateBatch} disabled={batchBusy}>
              {batchBusy ? "Generating..." : `Generate drafts (${selectedIdeas.length})`}
            </button>
          </div>

          {ideas.length ? (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {ideas.map((idea) => (
                <label key={idea} className="muted" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(selected[idea])}
                    onChange={(e) => setSelected((prev) => ({ ...prev, [idea]: e.target.checked }))}
                  />
                  <span>{idea}</span>
                </label>
              ))}
            </div>
          ) : null}

          {batchDrafts.length ? (
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {batchDrafts.map((d) => (
                <div key={d.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{d.title}</div>
                      <div className="muted">topic: {d.topic}</div>
                      {d.slug ? (
                        <a className="muted" href={`https://cryptobriefs.net/blog/${d.slug}`} target="_blank" rel="noreferrer">
                          View
                        </a>
                      ) : null}
                    </div>
                    <div>
                      <button className="btn" disabled={d.status === "publishing" || d.status === "published"} onClick={() => publishOne(d.id)}>
                        {d.status === "publishing" ? "Publishing..." : d.status === "published" ? "Published" : "Publish"}
                      </button>
                    </div>
                  </div>
                  {d.error ? <div className="err" style={{ marginTop: 8 }}>{d.error}</div> : null}
                  <details style={{ marginTop: 10 }}>
                    <summary className="muted" style={{ cursor: "pointer" }}>Preview</summary>
                    <pre style={{ whiteSpace: "pre-wrap", opacity: 0.8 }}>{d.content}</pre>
                  </details>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
