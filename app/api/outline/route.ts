import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // TODO: Implement outline generation (turns -> JSON outline) using a text model.
  const body = await req.json().catch(() => null);
  return NextResponse.json(
    {
      ok: true,
      stub: true,
      receivedTurns: body?.turns?.length ?? 0
    },
    { status: 200 }
  );
}
