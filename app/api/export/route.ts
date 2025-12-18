import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(_req: Request) {
  // TODO: Implement:
  // 1) accept audio (webm) + turns
  // 2) convert to mp3 via ffmpeg
  // 3) generate transcript + polished script + show notes + chapters + quotes
  // 4) pack as zip and return download
  return NextResponse.json(
    { error: "Not implemented", hint: "Implement export pipeline in lib/ffmpeg and lib/export" },
    { status: 501 }
  );
}
