// app/api/realtime-session/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // 需要 Node runtime 来 fetch + FormData 更稳

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY in .env.local" }, { status: 500 });
  }

  const offerSdp = await req.text();

  // 按官方 WebRTC 指南：后端把 SDP + session 配置打成 multipart form 发到 /v1/realtime/calls 
  const sessionConfig = {
    type: "realtime",
    model: "gpt-realtime",
    output_modalities: ["audio", "text"],
    audio: {
      input: {
        transcription: {
          model: "gpt-4o-transcribe", // 也可以用 whisper-1 等 :contentReference[oaicite:2]{index=2}
        },
        // turn_detection 默认 server_vad，先不配也行
      },
      output: { voice: "marin" },
    },
  };
  

  const fd = new FormData();
  fd.set("sdp", offerSdp);
  fd.set("session", JSON.stringify(sessionConfig));

  const r = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: fd,
  });

  const answerSdp = await r.text();
  if (!r.ok) {
    return NextResponse.json({ error: answerSdp }, { status: r.status });
  }

  return new NextResponse(answerSdp, {
    status: 200,
    headers: { "Content-Type": "application/sdp; charset=utf-8" },
  });
}
