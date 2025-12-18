export type RealtimeCallbacks = {
  onUserCaptionDelta?: (text: string) => void;
  onUserCaptionFinal?: (text: string) => void;
  onAiCaptionDelta?: (text: string) => void;
  onAiCaptionFinal?: (text: string) => void;
  onRemoteStream?: (stream: MediaStream) => void;
};

export async function startRealtimeWebRTC(_callbacks: RealtimeCallbacks) {
  // TODO: create RTCPeerConnection, add mic track, create offer,
  // POST offer.sdp to /api/realtime-session, set remote description,
  // attach ontrack (remote stream), open data channel and parse events.
  throw new Error("startRealtimeWebRTC not implemented");
}

export async function stopRealtimeWebRTC() {
  // TODO: close peer connection, stop tracks, cleanup.
}
