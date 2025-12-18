# Podcast Hacker (Skeleton)

This is an **empty-but-wired** Next.js (App Router) project skeleton for your hackathon demo:

- Left: realtime voice interview + verbatim captions
- Right: outline / structure (faithful summary)
- Export: MP3 + transcript + polished script + show notes + chapters + quotes

## 1) Put this project where you want
Unzip into:

`/Users/amiao/Library/CloudStorage/OneDrive-个人/2025黑客松`

so you get:

`.../2025黑客松/podcast-hacker/`

## 2) Install & run

```bash
cd podcast-hacker
cp .env.local.example .env.local
# fill OPENAI_API_KEY in .env.local
npm install
npm run dev
```

Open: http://localhost:3000

## 3) Where the code lives

- `app/page.tsx`: main two-column UI
- `app/api/realtime-session/route.ts`: server creates Realtime WebRTC session (SDP)
- `app/api/outline/route.ts`: server generates outline JSON from final turns
- `app/api/export/route.ts`: server generates export assets and returns download (placeholder)
- `lib/realtime/*`: webrtc, events, recording helpers
- `lib/export/*`: transcript formatting, prompts, schema, zip packing (placeholders)
- `lib/ffmpeg/*`: mp3 conversion helpers (placeholder)

> This skeleton is intentionally minimal—functions are stubbed so you can fill them step-by-step.
