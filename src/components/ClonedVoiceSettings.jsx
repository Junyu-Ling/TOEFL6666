import { useEffect, useRef, useState } from "react";
import { cloneOwnVoiceSample, fetchCloneStatus } from "../services/clonedVoice";
import { blobToMonoWav } from "../utils/audioWav";

export default function ClonedVoiceSettings({ clonedVoiceId, setClonedVoiceId, speakWord }) {
  const [available, setAvailable] = useState(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [sample, setSample] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileRef = useRef(null);

  const ready = Boolean(clonedVoiceId);

  useEffect(() => {
    let cancelled = false;
    fetchCloneStatus()
      .then((ok) => {
        if (!cancelled) setAvailable(ok);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
      stopRecording(true);
    };
  }, []);

  function clearTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopRecording(discard = false) {
    clearTimer();
    const recorder = mediaRef.current;
    mediaRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }
    recorder?.stream?.getTracks?.().forEach((track) => track.stop());
    if (discard) chunksRef.current = [];
    setRecording(false);
  }

  async function startRecording() {
    setError("");
    setSample(null);
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      chunksRef.current = [];
      try {
        setSample(await blobToMonoWav(blob));
      } catch (err) {
        setError(err.message || "录音无效");
      }
    };
    recorder.start();
    setRecording(true);
    setSeconds(0);
    timerRef.current = window.setInterval(() => {
      setSeconds((n) => {
        if (n + 1 >= 90) {
          stopRecording();
          return 90;
        }
        return n + 1;
      });
    }, 1000);
  }

  async function onFile(file) {
    setError("");
    if (!file) return;
    try {
      setSample(await blobToMonoWav(file));
    } catch (err) {
      setError(err.message || "音频无效");
    }
  }

  async function submitClone() {
    if (!consent) {
      setError("请先确认这是你本人的声音");
      return;
    }
    if (!sample) {
      setError("请先录音或上传 10 秒以上的音频");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const voiceId = await cloneOwnVoiceSample(sample);
      setClonedVoiceId(voiceId);
      setSample(null);
    } catch (err) {
      setError(err.message || "克隆失败");
    } finally {
      setBusy(false);
    }
  }

  if (available === false) {
    return (
      <p className="settings-hint settings-hint--compact">
        服务器尚未配置本人声音克隆，朗读仍使用系统音色。
      </p>
    );
  }

  return (
    <div className="cloned-voice-settings">
      <p className="settings-hint settings-hint--compact">
        只接受你本人的录音，克隆后仅用于本站读单词，不能下载、不能拿去站外用。请朗读约 15 秒英文。
      </p>
      <p className="settings-hint settings-hint--compact">
        {ready ? "已启用：用我的声音读单词" : "未配置"}
      </p>
      {recording ? (
        <p className="settings-hint settings-hint--compact">录音中 {seconds}s（至少 10 秒）</p>
      ) : null}
      {sample && !recording ? (
        <p className="settings-hint settings-hint--compact">已选中一段本人音频，可以开始克隆</p>
      ) : null}
      <div className="settings-actions">
        {recording ? (
          <button type="button" className="settings-action-btn" onClick={() => stopRecording()} disabled={seconds < 10}>
            停止录音
          </button>
        ) : (
          <button type="button" className="settings-action-btn" onClick={() => startRecording().catch((err) => setError(err.message || "无法录音"))} disabled={busy}>
            录制我的声音
          </button>
        )}
        <button type="button" className="settings-action-btn" onClick={() => fileRef.current?.click()} disabled={busy || recording}>
          上传我的音频
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/wav,audio/mpeg,audio/mp4,audio/x-m4a,.wav,.mp3,.m4a"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onFile(file);
          }}
        />
      </div>
      <label className="settings-toggle-row">
        <span className="settings-toggle-row__text">
          <strong>我确认这是我本人的声音</strong>
          <small>只用于本站读单词，不会导出</small>
        </span>
        <span className="toggle-switch">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className="toggle-switch__track" aria-hidden="true" />
        </span>
      </label>
      <div className="settings-actions">
        <button type="button" className="settings-action-btn settings-action-btn--primary" onClick={submitClone} disabled={busy || recording || !consent || !sample}>
          {busy ? "克隆中…" : "用这段声音读单词"}
        </button>
        {ready ? (
          <button
            type="button"
            className="settings-action-btn"
            onClick={() => speakWord("example")}
            disabled={busy}
          >
            试听单词
          </button>
        ) : null}
        {ready ? (
          <button type="button" className="settings-action-btn" onClick={() => setClonedVoiceId("")} disabled={busy}>
            停用我的声音
          </button>
        ) : null}
      </div>
      {error ? <p className="settings-field__hint settings-field__hint--warning">{error}</p> : null}
    </div>
  );
}
