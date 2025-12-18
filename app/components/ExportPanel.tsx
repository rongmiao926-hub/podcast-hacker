"use client";

import React, { useMemo, useState } from "react";
import JSZip from "jszip";
import type { Turn } from "../page";
import { getFFmpeg } from "../lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

export function ExportPanel({
  turns,
  recordingUrl,
  recordingBlob,
}: {
  turns: Turn[];
  recordingUrl: string;
  recordingBlob: Blob | null;
}) {
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "done" | "error">("idle");
  const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [progressText, setProgressText] = useState<string>("");

  const canExport = turns.length > 0 && !!recordingBlob && exportStatus !== "exporting";

  const filename = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `小鲁宙导出-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(
      d.getMinutes()
    )}.zip`;
  }, []);

  function buildTranscript() {
    return turns.map((t) => `${t.role === "user" ? "你" : "AI"}：${t.text}`).join("\n");
  }

  async function generateAssets() {
    const r = await fetch("/api/episode-assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turns }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));
    return data;
  }

  async function transcodeToMp3(inputBlob: Blob) {
    setProgressText("正在加载转码引擎（首次会稍慢）…");
    const ffmpeg = await getFFmpeg();

    // 进度回调（不同版本事件字段略有差异，这里做容错）
    try {
      ffmpeg.on("progress", (p: any) => {
        const ratio = typeof p?.progress === "number" ? p.progress : p?.ratio;
        if (typeof ratio === "number") {
          setProgressText(`音频转码中… ${Math.round(ratio * 100)}%`);
        } else {
          setProgressText("音频转码中…");
        }
      });
    } catch {}

    // 写入输入文件
    setProgressText("写入音频…");
    await ffmpeg.writeFile("input.webm", await fetchFile(inputBlob));

    // 转码参数：
    // -vn: 不要视频轨
    // -ac 1: 单声道更稳更小（你也可改 2）
    // -ar 44100: 常见采样率
    // -b:a 128k: 码率
    setProgressText("开始转成 MP3…");
    await ffmpeg.exec(["-i", "input.webm", "-vn", "-ac", "1", "-ar", "44100", "-b:a", "128k", "output.mp3"]);

    // 读出结果
    setProgressText("读取 MP3…");
    const mp3Data = await ffmpeg.readFile("output.mp3"); // Uint8Array

    // 清理临时文件，避免内存越积越多（现场多次导出很重要）
    try {
      await ffmpeg.deleteFile("input.webm");
      await ffmpeg.deleteFile("output.mp3");
    } catch {}

    const mp3Blob = new Blob([mp3Data], { type: "audio/mpeg" });
    return mp3Blob;
  }

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 16 }}>导出</div>
      <div style={{ fontSize: 12, opacity: 0.6 }}>
        MP3 + 逐字稿 + 润色稿 + show notes + 章节 + 金句 + 大纲
      </div>

      {err && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(255,0,0,0.06)", fontSize: 12 }}>
          导出失败：{err}
        </div>
      )}

      {progressText && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.04)", fontSize: 12 }}>
          {progressText}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
        <button
          disabled={!canExport}
          onClick={async () => {
            setExportStatus("exporting");
            setErr("");
            setProgressText("");
            try {
              // 1) 生成结构资产
              setProgressText("生成本期结构与文稿…");
              const assets = await generateAssets();

              // 2) 转码 MP3（现场关键）
              const mp3Blob = await transcodeToMp3(recordingBlob!);

              // 3) 组装 ZIP
              setProgressText("打包导出文件…");
              const zip = new JSZip();

              zip.file("audio.mp3", mp3Blob);

              const transcript = buildTranscript();
              zip.file("transcript.txt", transcript);
              zip.file("transcript.md", `# 逐字稿\n\n${transcript.replace(/\n/g, "\n\n")}`);

              zip.file("outline.json", JSON.stringify(assets.outline || {}, null, 2));
              zip.file("chapters.json", JSON.stringify(assets.chapters || [], null, 2));
              zip.file("quotes.txt", (assets.quotes || []).join("\n"));
              zip.file(
                "shownotes.md",
                `# Show Notes\n\n${(assets.show_notes?.bullets || []).map((b: string) => `- ${b}`).join("\n")}\n`
              );
              zip.file("polished_script.md", `# 润色稿\n\n${String(assets.polished_script || "").trim()}\n`);

              // 4) 生成下载
              setProgressText("生成下载链接…");
              const out = await zip.generateAsync({ type: "blob" });
              const url = URL.createObjectURL(out);
              setDownloadUrl(url);
              setExportStatus("done");
              setProgressText("完成 ✅");
            } catch (e: any) {
              setErr(String(e?.message || e));
              setExportStatus("error");
              setProgressText("");
            }
          }}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            background: canExport ? "white" : "rgba(0,0,0,0.05)",
            cursor: canExport ? "pointer" : "not-allowed",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {exportStatus === "exporting" ? "导出中…" : "一键导出（含MP3）"}
        </button>

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          状态：{exportStatus} {recordingUrl ? "｜有录音" : "｜无录音"}
        </div>
      </div>

      {downloadUrl && (
        <div style={{ marginTop: 10, fontSize: 13 }}>
          <a href={downloadUrl} download={filename}>
            下载 ZIP
          </a>
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
        说明：首次导出会下载 ffmpeg.wasm（几十 MB）。
      </div>
    </div>
  );
}
