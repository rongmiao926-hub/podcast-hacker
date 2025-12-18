import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });

  const { turns } = await req.json();
  if (!Array.isArray(turns) || turns.length === 0) {
    return NextResponse.json({ error: "No turns" }, { status: 400 });
  }

  const transcript = turns
    .map((t: any) => `${t.role === "user" ? "你" : "AI"}：${String(t.text || "")}`)
    .join("\n");

  const system = `
你是专业播客制作人与采访编辑。请严格忠于逐字稿，不要编造用户未提及的事实。
你需要输出一个 JSON（不要输出任何多余文字），字段如下：
{
  "outline": {
    "title": "本期标题（中文，10-18字）",
    "logline": "一句话简介（<=40字）",
    "segments": [
      {"name":"开场钩子","summary":"<=80字","evidence":["逐字稿里的关键原句1","原句2"]},
      {"name":"背景与动机","summary":"<=120字","evidence":[...]},
      {"name":"核心故事","summary":"<=180字","evidence":[...]},
      {"name":"反思与方法","summary":"<=160字","evidence":[...]},
      {"name":"结尾与行动","summary":"<=120字","evidence":[...]}
    ]
  },
  "show_notes": {
    "bullets": ["要点1","要点2","要点3","要点4","要点5"],
    "links": []
  },
  "chapters": [
    {"start_sec":0,"title":"开场"},
    {"start_sec":120,"title":"背景"},
    {"start_sec":420,"title":"核心故事"},
    {"start_sec":900,"title":"反思"},
    {"start_sec":1200,"title":"结尾"}
  ],
  "quotes": ["金句1","金句2","金句3"],
  "polished_script": "把这期内容润色成单人旁白稿（800-1400字），保持事实一致，可重排结构但不添加新事实。"
}
`.trim();

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
        { role: "user", content: transcript },
      ],
    }),
  });

  const data = await r.json();
  if (!r.ok) return NextResponse.json({ error: data }, { status: r.status });

  const rawText =
  data.output?.[0]?.content?.find((c: any) => c.type === "output_text")?.text ||
  data.output?.[0]?.content?.[0]?.text ||
  "";

// 1) 去掉 ```json ... ``` 包裹
const stripped = String(rawText)
  .trim()
  .replace(/^```(?:json)?\s*/i, "")
  .replace(/\s*```$/i, "")
  .trim();

// 2) 尝试截取第一个完整 JSON 对象：从第一个 { 到最后一个 }
const firstBrace = stripped.indexOf("{");
const lastBrace = stripped.lastIndexOf("}");
const candidate =
  firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
    ? stripped.slice(firstBrace, lastBrace + 1)
    : stripped;

try {
  const json = JSON.parse(candidate);
  return NextResponse.json(json);
} catch (e: any) {
  return NextResponse.json(
    { error: "Bad JSON from model", raw: rawText, stripped, candidate, parseError: String(e?.message || e) },
    { status: 500 }
  );
}
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "Bad JSON from model", raw: text }, { status: 500 });
  }
}
