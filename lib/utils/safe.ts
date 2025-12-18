export function safeText(v: unknown) {
  return typeof v === "string" ? v : "";
}
