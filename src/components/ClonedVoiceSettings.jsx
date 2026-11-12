import { useEffect, useRef, useState } from "react";
import { cloneOwnVoiceSample, fetchCloneStatus } from "../services/clonedVoice";
import { deleteClonedVoice, listClonedVoices, saveClonedVoice } from "../services/clonedVoiceStore";
import { blobToMonoWav } from "../utils/audioWav";

export default function ClonedVoiceSettings({ clonedVoiceId, setClonedVoiceId, speakWord }) {
  const [status, setStatus] = useState(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [sample, setSample] = useState(null);
  const [voiceName, setVoiceName] = useState("");
  const [promptText, setPromptText] = useState("");
  const [voices, setVoices] = useState([]);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileRef = useRef(null);

  const available = status ? status.available : null;
  const selected = voices.find((item) => item.id === clonedVoiceId);

  useEffect(() => {
    let cancelled = false;
    fetchCloneStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus({ available: false, voicestudio: false, minimax: false, gptsovits: false });
      });
    listClonedVoices()
      .then((rows) => {
        if (!cancelled) setVoices(rows);
      })
      .catch(() => {});
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

  async function refreshVoices() {
    setVoices(await listClonedVoices());
  }

  async function submitClone() {
    const name = voiceName.trim();
    if (!consent) {
      setError("请先确认这是你本人的声音");
      return;
    }
    if (!sample) {
      setError("请先录音或上传一段音频");
      return;
    }
    if (!name) {
      setError("请给这个声音样本起个名字");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const cloned = await cloneOwnVoiceSample(sample, { name, promptText: promptText.trim() });
      const id = cloned.voiceId;
      await saveClonedVoice({
        id,
        name,
        wav: sample,
        promptText: promptText.trim(),
        engine: cloned.engine,
        minimaxVoiceId: cloned.engine === "minimax" ? id : "",
        createdAt: Date.now(),
      });
      setClonedVoiceId(id);
      setSample(null);
      setVoiceName("");
      setPromptText("");
      await refreshVoices();
    } catch (err) {
      setError(err.message || "克隆失败");
    } finally {
      setBusy(false);
    }
  }

  async function removeVoice(id) {
    await deleteClonedVoice(id);
    if (clonedVoiceId === id) setClonedVoiceId("");
    await refreshVoices();
  }

  if (available === false) {
    return (
      <p className="settings-hint settings-hint--compact">
        尚未配置声音克隆。线上全站请在 Vercel 填写 MINIMAX_API_KEY 和 MINIMAX_GROUP_ID。本机 VoiceStudio 访问不到线上访客。
      </p>
    );
  }

  return (
    <div className="cloned-voice-settings">
      <p className="settings-hint settings-hint--compact">
        上传或录制一段你本人的声音，起名后克隆，只用于本站读单词。线上走 MiniMax 云端；本机开发才可用 VoiceStudio。
      </p>
      {status?.voicestudio ? (
        <p className="settings-hint settings-hint--compact">当前引擎：VoiceStudio</p>
      ) : status?.gptsovits ? (
        <p className="settings-hint settings-hint--compact">当前引擎：GPT-SoVITS</p>
      ) : status?.minimax ? (
        <p className="settings-hint settings-hint--compact">当前引擎：云端克隆（MiniMax）</p>
      ) : null}
      <p className="settings-hint settings-hint--compact">
        {selected ? `正在使用：${selected.name}` : "未选择克隆音色，朗读使用系统声音"}
      </p>

      {voices.length ? (
        <ul className="cloned-voice-list">
          {voices.map((voice) => (
            <li key={voice.id} className={`cloned-voice-item${voice.id === clonedVoiceId ? " is-active" : ""}`}>
              <button
                type="button"
                className="cloned-voice-item__pick"
                onClick={() => setClonedVoiceId(voice.id)}
              >
                <strong>{voice.name}</strong>
                <small>{voice.id === clonedVoiceId ? "使用中" : "点击使用"}</small>
              </button>
              <button type="button" className="settings-action-btn" onClick={() => removeVoice(voice.id)}>
                删除
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {recording ? (
        <p className="settings-hint settings-hint--compact">录音中 {seconds}s（至少 10 秒）</p>
      ) : null}
      {sample && !recording ? (
        <p className="settings-hint settings-hint--compact">已选中一段音频，起名后即可克隆</p>
      ) : null}

      <label className="settings-field cloned-voice-name">
        <span>音色名称</span>
        <input
          className="settings-inline-input"
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          placeholder="例如：我的声音"
          maxLength={32}
          disabled={busy || recording}
        />
      </label>
      <label className="settings-field cloned-voice-name">
        <span>录音文本（可选，GPT-SoVITS 更准）</span>
        <input
          className="settings-inline-input"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="这段录音大概在说什么"
          maxLength={200}
          disabled={busy || recording}
        />
      </label>

      <div className="settings-actions">
        {recording ? (
          <button type="button" className="settings-action-btn" onClick={() => stopRecording()} disabled={seconds < 10}>
            停止录音
          </button>
        ) : (
          <button
            type="button"
            className="settings-action-btn"
            onClick={() => startRecording().catch((err) => setError(err.message || "无法录音"))}
            disabled={busy}
          >
            录制声音
          </button>
        )}
        <button type="button" className="settings-action-btn" onClick={() => fileRef.current?.click()} disabled={busy || recording}>
          上传音频
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
        <button
          type="button"
          className="settings-action-btn settings-action-btn--primary"
          onClick={submitClone}
          disabled={busy || recording || !consent || !sample || !voiceName.trim()}
        >
          {busy ? "克隆中…" : "克隆并保存"}
        </button>
        {clonedVoiceId ? (
          <button type="button" className="settings-action-btn" onClick={() => speakWord("example")} disabled={busy}>
            试听单词
          </button>
        ) : null}
        {clonedVoiceId ? (
          <button type="button" className="settings-action-btn" onClick={() => setClonedVoiceId("")} disabled={busy}>
            改用系统音色
          </button>
        ) : null}
      </div>
      {error ? <p className="settings-field__hint settings-field__hint--warning">{error}</p> : null}
    </div>
  );
}
