"use client";

import React from "react";
import type { Turn } from "../page";

export function TranscriptView({ turns }: { turns: Turn[] }) {
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Transcript</div>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.6 }}>
        {turns.map((t) => `${t.role === "user" ? "You" : "AI"}: ${t.text}`).join("\n\n")}
      </pre>
    </div>
  );
}
