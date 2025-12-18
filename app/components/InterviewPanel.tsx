"use client";

import React, { useRef } from "react";
import type { Turn } from "../page";

export function InterviewPanel(props: {
  status: "idle" | "connecting" | "live" | "done" | "error";
  setStatus: (s: any) => void;
  onFinalTurn: (t: Turn) => void;
  onOutline: (o: any) => void;
  setRecordingUrl: (url: string) => void;
  setRecordingBlob: (b: Blob | null) => void;
  mode:"realtime"|"fallback";
  setMode:(m:"realtime"|"fallback")=>void;
  turns: Turn[];
}) {
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const aiTextBufferRef = useRef<string>("");
  const recorderRef = useRef<MediaRecorder | null>(null);
const recordedChunksRef = useRef<BlobPart[]>([]);
const mixCtxRef = useRef<AudioContext | null>(null);
const mixDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
const remoteMixedRef = useRef(false);
const recognitionRef = useRef<any>(null);



  const statusMap: Record<string, string> = {
    idle: "未开始",
    connecting: "连接中",
    live: "录制中",
    done: "已结束",
    error: "出错",
  };

  const canStart = props.status === "idle" || props.status === "done" || props.status === "error";
  const canStop = props.status === "live" || props.status === "connecting";
  

  async function startRealtime() {

    // 1) 获取麦克风
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    
    streamRef.current = stream;
    //  建立混音上下文（只建一次）
if (!mixCtxRef.current) {
  mixCtxRef.current = new AudioContext();
  mixDestRef.current = mixCtxRef.current.createMediaStreamDestination();
}
const ctx = mixCtxRef.current!;
const dest = mixDestRef.current!;

// 把麦克风接入混音
const micSource = ctx.createMediaStreamSource(stream);
micSource.connect(dest);

//  启动录音：录的是“混音后的流”
recordedChunksRef.current = [];
props.setRecordingBlob(null);
props.setRecordingUrl("");

const preferTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];
const mimeType = preferTypes.find((t) => MediaRecorder.isTypeSupported(t));
const rec = mimeType ? new MediaRecorder(dest.stream, { mimeType }) : new MediaRecorder(dest.stream);
console.log("🎙 MediaRecorder mimeType =", rec.mimeType);


recorderRef.current = rec;

rec.ondataavailable = (e) => {
  if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
};

rec.onstop = () => {
  const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
  props.setRecordingBlob(blob);
  const url = URL.createObjectURL(blob);
  props.setRecordingUrl(url);
  console.log(" 录音完成:", blob.size, "bytes");
};


// console.log("⏺ 开始录音（混音流）");
console.log("⏺ 录音器已就绪，等待 AI 音轨后自动开始");

rec.start();
    // 2) 建 WebRTC peer connection
    const pc = new RTCPeerConnection();

    pcRef.current = pc;
// ⭐ 创建 data channel（用来接收逐字字幕等事件）

    aiTextBufferRef.current = "";

    const dc = pc.createDataChannel("oai-events");

    dataChannelRef.current = dc;

    dc.onopen = () => {
      console.log("📡 Data channel open");
    };

    dc.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);

        // 1) 用户语音转写完成：显示「你：...」
        // 文档：conversation.item.input_audio_transcription.completed 
        if (msg.type === "conversation.item.input_audio_transcription.completed" && msg.transcript) {
          props.onFinalTurn({ role: "user", text: String(msg.transcript) });
          return;
        }

    // 2) AI 字幕增量：text 或 audio_transcript 都拼到同一个 buffer
      if (
        (msg.type === "response.output_text.delta" && msg.delta) ||
        (msg.type === "response.output_audio_transcript.delta" && msg.delta)
      ) {
        aiTextBufferRef.current += String(msg.delta);
        return;
      }

// 3) AI 字幕完成：text 或 audio_transcript 完成就落地
      if (
        msg.type === "response.output_text.done" ||
        msg.type === "response.output_text.completed" ||
        msg.type === "response.output_audio_transcript.done" ||
        msg.type === "response.output_audio_transcript.completed"
      ) {
        const finalText = aiTextBufferRef.current.trim();
        if (finalText) props.onFinalTurn({ role: "assistant", text: finalText });
        aiTextBufferRef.current = "";
        return;
      }


    // 兜底：你想看所有事件继续调试就打开这一行
    // console.log("📨 Realtime event:", msg);
  } catch (e) {
    // 如果偶尔不是 JSON，就忽略
    // console.log("Non-JSON event:", ev.data);
  }
};

    // 3) 把麦克风音轨发给 Realtime
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }

    // 4) 接收 AI 的远端音轨并播放
    pc.ontrack = (ev) => {
      const [remoteStream] = ev.streams;
    
      // ✅ 播放 AI 语音
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});
      }
    
      // ✅ 把 AI 远端音频接入混音（只要 mixCtx 已存在）
      if (!remoteMixedRef.current && mixCtxRef.current && mixDestRef.current) {
        remoteMixedRef.current = true;
        const ctx = mixCtxRef.current;
        const dest = mixDestRef.current;
        const remoteSource = ctx.createMediaStreamSource(remoteStream);
        remoteSource.connect(dest);
        console.log("🎛 已将 AI 音频接入混音");
      }

      // ✅ 第一次拿到 AI 音轨时再开始录音，避免漏录 AI
if (recorderRef.current && recorderRef.current.state === "inactive") {
  recorderRef.current.start();
  console.log("⏺ 开始录音（已接入 AI + 麦克风）");
}


    };
    

    // 5) 生成 offer → 发给你自己的后端 → 拿 answer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const resp = await fetch("/api/realtime-session", {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: offer.sdp,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(errText);
    }

    const answerSdp = await resp.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    pc.onconnectionstatechange = () => {
      console.log("webrtc connectionState:", pc.connectionState);
    };
  }
  function speakZh(text: string) {
    try {
      window.speechSynthesis.cancel(); // 停掉上一次
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = 1.05; // 稍微快一点更像播客对谈
      u.pitch = 1.0;
  
      // 尽量选中文声音（Mac/Chrome 会有多个 voice）
      const voices = window.speechSynthesis.getVoices();
      const zh = voices.find((v) => v.lang?.toLowerCase().startsWith("zh"));
      if (zh) u.voice = zh;
  
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn("speechSynthesis failed", e);
    }
  }
  
  function startFallbackSTT() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
  
    if (!SpeechRecognition) {
      alert("当前浏览器不支持语音识别（请使用 Chrome）");
      return;
    }
  
    const rec = new SpeechRecognition();
    rec.lang = "zh-CN";
    rec.continuous = true;
    rec.interimResults = false;
  
    rec.onresult = async (e: any) => {
      const last = e.results[e.results.length - 1];
      const text = last[0].transcript.trim();
      if (!text) return;
  
      // ⭐ 把「你说的话」写进逐字稿
      props.onFinalTurn({ role: "user", text });

try {
  // 调后端拿 AI 回复
  const resp = await fetch("/api/fallback-reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      turns: props.turns,   // 现有对话
      userText: text,       // 本轮用户话
    }),
  });

  const data = await resp.json();
  const aiText = String(data?.text || "").trim();

  if (aiText) {
    props.onFinalTurn({ role: "assistant", text: aiText });
    speakZh(aiText); // ✅ TTS 播放
  }
} catch (e) {
  console.error("fallback reply failed", e);
}

    };
  
    rec.onerror = (e: any) => {
      console.error("SpeechRecognition error", e);
    };
  
    rec.start();
    recognitionRef.current = rec;
    console.log("🎤 fallback 语音识别已启动");
  }
  
  function stopAll() {
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      recorderRef.current = null;
    } catch {}
    
    try {
      dataChannelRef.current?.close();
      dataChannelRef.current = null;
    } catch {}
  
    aiTextBufferRef.current = "";
  
    try {
      pcRef.current?.close();
      pcRef.current = null;
    } catch {}
    try {
      mixCtxRef.current?.close();
      mixCtxRef.current = null;
      mixDestRef.current = null;
    } catch {}
    try {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    } catch {}
    try {
      window.speechSynthesis.cancel();
    } catch {}
    
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    } catch {}
    remoteMixedRef.current = false;

  }
  

  return (
    <div>
    {/* ⭐ fallback 模式提示（只在 fallback 时显示） */}
    {props.mode === "fallback" && (
      <div
        style={{
          padding: "8px 12px",
          borderRadius: 10,
          background: "rgba(255, 204, 0, 0.15)",
          fontSize: 12,
          marginBottom: 8,
        }}
      >
        网络波动，已切换到稳定模式（不影响对谈与导出）
      </div>
    )}

      {/* 隐藏 audio，用来播放 AI 语音 */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* 顶部：标题 + 按钮 + 状态 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>实时对谈</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>麦克风开始 / 结束 · 语音对谈</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            disabled={!canStart}
            onClick={async () => {
              props.setStatus("connecting");
              try {
                await startRealtime();
                props.setStatus("live");
              } catch (e) {
                console.error(e);
                stopAll();
                props.setMode("fallback");
                props.setStatus("live");
                startFallbackSTT(); 
              }
            }}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: canStart ? "white" : "rgba(0,0,0,0.05)",
              cursor: canStart ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            🎙️ 开始
          </button>

          <button
            disabled={!canStop}
            onClick={() => {
              stopAll();
              props.setStatus("done");
            }}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: canStop ? "white" : "rgba(0,0,0,0.05)",
              cursor: canStop ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ⏹ 结束
          </button>

          <div style={{ fontSize: 12, padding: "6px 10px", borderRadius: 999, background: "rgba(0,0,0,0.06)" }}>
            {statusMap[props.status] ?? props.status}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: 13, opacity: 0.75 }}>
        网络连接不稳定时，会切换模式。
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>逐字稿（最终定稿）</div>
        <div style={{ maxHeight: 240, overflow: "auto", fontSize: 13, lineHeight: 1.6 }}>
          {props.turns.length === 0 ? (
            <div style={{ opacity: 0.6 }}>还没有对话内容。</div>
          ) : (
            props.turns.map((t, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <b>{t.role === "user" ? "你" : "AI"}：</b>
                {t.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
