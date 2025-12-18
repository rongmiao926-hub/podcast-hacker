// Central place to parse Realtime server events from the data channel.
// Goal: avoid 'guessing fields' — only rely on known event types.

export type ParsedEvent =
  | { kind: "user_delta"; itemId: string; delta: string }
  | { kind: "user_final"; itemId: string; transcript: string }
  | { kind: "ai_delta"; itemId: string; delta: string }
  | { kind: "ai_final"; itemId: string; text: string }
  | { kind: "other"; raw: any };

export function parseRealtimeEvent(raw: any): ParsedEvent {
  const t = raw?.type;

  if (t === "conversation.item.input_audio_transcription.delta") {
    return { kind: "user_delta", itemId: raw.item_id, delta: raw.delta ?? "" };
  }
  if (t === "conversation.item.input_audio_transcription.completed") {
    return { kind: "user_final", itemId: raw.item_id, transcript: raw.transcript ?? "" };
  }
  if (t === "response.output_audio_transcript.delta") {
    return { kind: "ai_delta", itemId: raw.item_id, delta: raw.delta ?? "" };
  }
  if (t === "response.output_audio_transcript.done") {
    return { kind: "ai_final", itemId: raw.item_id, text: raw.text ?? "" };
  }

  return { kind: "other", raw };
}
