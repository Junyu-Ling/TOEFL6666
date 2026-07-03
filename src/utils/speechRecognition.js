export function isSpeechRecognitionSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function createRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  return new SpeechRecognition();
}

export function listenOnce({ lang = "zh-CN", maxDurationMs = 15000, withAlternatives = false } = {}) {
  return new Promise((resolve, reject) => {
    const recognition = createRecognition();
    if (!recognition) {
      reject(new Error("当前浏览器不支持语音识别，请使用 Chrome 或 Edge"));
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      recognition.stop();
      reject(new Error("识别超时，请重试"));
    }, maxDurationMs);

    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const result = event.results[0];
      const transcript = Array.from(event.results)
        .map((item) => item[0]?.transcript ?? "")
        .join("")
        .trim();

      if (withAlternatives && result) {
        const alternatives = [];
        for (let i = 0; i < result.length; i++) {
          const piece = result[i]?.transcript?.trim();
          if (piece) alternatives.push(piece);
        }
        resolve({
          transcript: alternatives[0] || transcript,
          alternatives: [...new Set(alternatives)],
        });
        return;
      }

      if (withAlternatives) {
        resolve({
          transcript,
          alternatives: transcript ? [transcript] : [],
        });
        return;
      }

      resolve(transcript);
    };

    recognition.onerror = (event) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (event.error === "aborted" || event.error === "no-speech") {
        reject(new Error("未检测到语音，请再试一次"));
        return;
      }
      if (event.error === "not-allowed") {
        reject(new Error("麦克风权限被拒绝"));
        return;
      }
      reject(new Error(`语音识别失败：${event.error}`));
    };

    recognition.onend = () => {
      clearTimeout(timer);
    };

    try {
      recognition.start();
    } catch (err) {
      settled = true;
      clearTimeout(timer);
      reject(err);
    }
  });
}

export function createDictationSession({ lang = "zh-CN", onInterim, onFinal, onError }) {
  const recognition = createRecognition();
  if (!recognition) {
    onError?.(new Error("当前浏览器不支持语音识别"));
    return null;
  }

  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let interim = "";
    let finalText = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const piece = event.results[i][0]?.transcript ?? "";
      if (event.results[i].isFinal) {
        finalText += piece;
      } else {
        interim += piece;
      }
    }

    if (interim) onInterim?.(interim);
    if (finalText.trim()) onFinal?.(finalText.trim());
  };

  recognition.onerror = (event) => {
    if (event.error === "aborted") return;
    onError?.(new Error(event.error === "no-speech" ? "未检测到语音" : event.error));
  };

  return {
    start() {
      recognition.start();
    },
    stop() {
      recognition.stop();
    },
  };
}

export function normalizeSpokenWord(text) {
  return text.toLowerCase().replace(/[^a-z'-]/g, "");
}

export function checkPronunciation(transcript, targetWord) {
  const target = normalizeSpokenWord(targetWord);
  if (!target || !transcript) return false;

  const spokenParts = transcript
    .toLowerCase()
    .split(/[\s,;.!?]+/)
    .map(normalizeSpokenWord)
    .filter(Boolean);

  if (spokenParts.includes(target)) return true;

  const collapsed = normalizeSpokenWord(transcript.replace(/\s+/g, ""));
  if (collapsed === target) return true;

  const targetNoHyphen = target.replace(/-/g, "");
  return spokenParts.some((part) => part.replace(/-/g, "") === targetNoHyphen);
}

export function matchesEnglishRecall(attempt, targetWord) {
  return checkPronunciation(attempt, targetWord);
}
