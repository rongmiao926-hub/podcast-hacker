// WebAudio + MediaRecorder helpers.
// Plan: record stereo: user mic = left, assistant audio = right.

export type RecorderHandle = {
  stop: () => void;
};

export function startStereoRecording(_mic: MediaStream, _assistant: MediaStream, _onBlob: (b: Blob) => void): RecorderHandle {
  // TODO: implement channel merger + MediaRecorder
  throw new Error("startStereoRecording not implemented");
}
