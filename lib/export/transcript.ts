import type { Turn } from "../../app/page";

export function buildVerbatimTranscript(turns: Turn[]) {
  return turns.map((t) => `${t.role === "user" ? "你" : "AI"}：${t.text}`).join("\n\n");
}
