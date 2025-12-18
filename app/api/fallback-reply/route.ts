import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });

  const { turns, userText } = await req.json();

  // 你可以把它写得更“鲁豫式”一点（不编造、深挖、追问）
  const system = `
你是一个专业播客采访者（像鲁豫那样温和、追问、结构清晰）。
目标：引导用户讲出具体故事、细节、转折、人物与情绪，并保持对话自然。
规则：
- 不要编造用户没有说过的事实
- 每次回复 2-4 句话，最后给 1 个追问
- 用中文
`.trim();

  // 把历史 turns 简化拼接
  const history = (turns || [])
    .slice(-12)
    .map((t: any) => `${t.role === "user" ? "用户" : "AI"}：${t.text}`)
    .join("\n");

  const input = `${history}\n用户：${userText}\nAI：`;

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: system },
        { role: "user", content: input },
      ],
    }),
  });

  const data = await r.json();
  if (!r.ok) return NextResponse.json({ error: data }, { status: r.status });

  // 从 responses 抽文本（兼容一些结构差异）
  const text =
    data.output?.[0]?.content?.find((c: any) => c.type === "output_text")?.text ||
    data.output?.[0]?.content?.[0]?.text ||
    "";

  return NextResponse.json({ text: String(text).trim() });
}
