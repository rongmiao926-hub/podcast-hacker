"use client";

import React, { useState } from "react";
import type { Turn } from "../page";

export function OutlinePanel({ turns }: { outline: any; turns: Turn[] }) {
  const [assets, setAssets] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  async function generate() {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/episode-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turns }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(data));
      setAssets(data);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>本期结构</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>忠于逐字稿 · 大纲/Show Notes/章节/金句</div>
        </div>

        <button
          disabled={loading || turns.length === 0}
          onClick={generate}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            background: turns.length ? "white" : "rgba(0,0,0,0.05)",
            cursor: turns.length ? "pointer" : "not-allowed",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {loading ? "生成中…" : "生成结构"}
        </button>
      </div>

      {err && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(255,0,0,0.06)", fontSize: 12 }}>
          生成失败：{err}
        </div>
      )}

      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(0,0,0,0.04)" }}>
        {!assets ? (
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            还没有结构。点击右上角「生成结构」。
            <div style={{ marginTop: 8, opacity: 0.6 }}>逐字稿轮次：{turns.length}</div>
          </div>
        ) : (
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{assets.outline?.title}</div>
            <div style={{ opacity: 0.7, marginTop: 4 }}>{assets.outline?.logline}</div>

            <div style={{ marginTop: 12, fontWeight: 700 }}>分段</div>
            {(assets.outline?.segments || []).map((s: any, i: number) => (
              <div key={i} style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700 }}>{i + 1}. {s.name}</div>
                <div style={{ opacity: 0.85 }}>{s.summary}</div>
                {!!(s.evidence?.length) && (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                    证据：{s.evidence.slice(0, 2).join(" / ")}
                  </div>
                )}
              </div>
            ))}

            <div style={{ marginTop: 12, fontWeight: 700 }}>Show Notes</div>
            <ul style={{ margin: "6px 0 0 18px" }}>
              {(assets.show_notes?.bullets || []).map((b: string, i: number) => <li key={i}>{b}</li>)}
            </ul>

            <div style={{ marginTop: 12, fontWeight: 700 }}>金句</div>
            <ul style={{ margin: "6px 0 0 18px" }}>
              {(assets.quotes || []).map((q: string, i: number) => <li key={i}>{q}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
