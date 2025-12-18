import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpegSingleton: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

export async function getFFmpeg() {
  if (ffmpegSingleton) return ffmpegSingleton;
  if (loading) return loading;

  loading = (async () => {
    const ffmpeg = new FFmpeg();

    // 用 unpkg CDN 拉 wasm/core（黑客松联网 OK）
    const base = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
    });

    ffmpegSingleton = ffmpeg;
    return ffmpeg;
  })();

  return loading;
}
