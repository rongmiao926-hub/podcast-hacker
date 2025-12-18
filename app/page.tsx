"use client";

import React, { useCallback, useMemo, useState } from "react";
import { InterviewPanel } from "./components/InterviewPanel";
import { OutlinePanel } from "./components/OutlinePanel";
import { ExportPanel } from "./components/ExportPanel";

export type Turn = { role: "user" | "assistant"; text: string };

type Mode = "realtime" | "fallback";

export default function Page() {
  // ✅ 所有 useState 必须在组件函数内部
  const [mode, setMode] = useState<Mode>("realtime");

  const [turns, setTurns] = useState<Turn[]>([]);
  const [outline, setOutline] = useState<any>(null);
  const [recordingUrl, setRecordingUrl] = useState<string>("");
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [status, setStatus] =
    useState<"idle" | "connecting" | "live" | "done" | "error">("idle");

  const onFinalTurn = useCallback((turn: Turn) => {
    setTurns((prev) => [...prev, turn]);
  }, []);

  const onOutline = useCallback((o: any) => {
    setOutline(o);
  }, []);

  const appleCard: React.CSSProperties = useMemo(
    () => ({
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: 16,
      background: "rgba(255,255,255,0.9)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
      padding: 16,
    }),
    []
  );

  return (
    <main style={{ minHeight: "100vh", background: "#F5F5F7" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>小鲁宙</h1>
          <div style={{ opacity: 0.6 }}>
            实时语音对谈 · 逐字字幕 · 结构整理 · 一键导出
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.25fr 0.75fr",
            gap: 16,
            marginTop: 16,
          }}
        >
          <section style={appleCard}>
            <InterviewPanel
              status={status}
              setStatus={setStatus}
              onFinalTurn={onFinalTurn}
              onOutline={onOutline}
              setRecordingUrl={setRecordingUrl}
              setRecordingBlob={setRecordingBlob}
              turns={turns}
              mode={mode}            // ✅ 正确
              setMode={setMode}      // ✅ 正确
            />
          </section>

          <section style={appleCard}>
            <OutlinePanel outline={outline} turns={turns} />
          </section>
        </div>

        <div style={{ marginTop: 16 }}>
          <section style={appleCard}>
          <ExportPanel turns={turns} recordingUrl={recordingUrl} recordingBlob={recordingBlob} />

          </section>
        </div>
      </div>
    </main>
  );
}
