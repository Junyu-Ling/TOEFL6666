import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { loadSettings, patchSettings, clampDelaySec, updateToeflSectionScore, updateSatSectionScore } from "../services/settings";
import { normalizeTargetExam, normalizeToeflTargetTotal, normalizeSatTargetTotal } from "../utils/examScores";
import { getSystemVoices, speakWord as speak } from "../utils/speech";
import { normalizeCorrectSoundId, normalizeWrongSoundId } from "../utils/answerSounds";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);
  const [systemVoices, setSystemVoices] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    function refreshVoices() {
      setSystemVoices(getSystemVoices());
    }
    refreshVoices();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      patchSettings(next);
      return next;
    });
  }, []);

  const setTheme = useCallback((theme) => updateSettings({ theme }), [updateSettings]);

  const setSystemVoiceURI = useCallback(
    (systemVoiceURI) => updateSettings({ systemVoiceURI }),
    [updateSettings]
  );

  const setAutoReadOnNewWord = useCallback(
    (autoReadOnNewWord) => updateSettings({ autoReadOnNewWord }),
    [updateSettings]
  );

  const setAutoDictateOnNewWord = useCallback(
    (autoDictateOnNewWord) => updateSettings({ autoDictateOnNewWord }),
    [updateSettings]
  );

  const setAutoAdvanceAfterFlip = useCallback(
    (autoAdvanceAfterFlip) => updateSettings({ autoAdvanceAfterFlip }),
    [updateSettings]
  );

  const setAutoAdvanceDelaySec = useCallback(
    (autoAdvanceDelaySec) => updateSettings({ autoAdvanceDelaySec: clampDelaySec(autoAdvanceDelaySec) }),
    [updateSettings]
  );

  const setPracticeStyle = useCallback(
    (practiceStyle) => updateSettings({ practiceStyle: practiceStyle === "recall" ? "recall" : "type" }),
    [updateSettings]
  );

  const setHideWordFirst = useCallback(
    (hideWordFirst) => updateSettings({ hideWordFirst: hideWordFirst === true }),
    [updateSettings]
  );

  const setAnswerSounds = useCallback(
    (answerSounds) => updateSettings({ answerSounds: answerSounds === true }),
    [updateSettings]
  );

  const setAnswerSoundCorrect = useCallback(
    (answerSoundCorrect) => updateSettings({ answerSoundCorrect: normalizeCorrectSoundId(answerSoundCorrect) }),
    [updateSettings]
  );

  const setAnswerSoundWrong = useCallback(
    (answerSoundWrong) => updateSettings({ answerSoundWrong: normalizeWrongSoundId(answerSoundWrong) }),
    [updateSettings]
  );

  const setTargetExam = useCallback(
    (targetExam) => updateSettings({ targetExam: normalizeTargetExam(targetExam) }),
    [updateSettings]
  );

  const setToeflSectionScore = useCallback(
    (key, value) => {
      setSettings((prev) => {
        const toeflScores = updateToeflSectionScore(prev.toeflScores, key, value);
        const next = { ...prev, toeflScores };
        patchSettings({ toeflScores });
        return next;
      });
    },
    []
  );

  const setSatSectionScore = useCallback(
    (key, value) => {
      setSettings((prev) => {
        const satScores = updateSatSectionScore(prev.satScores, key, value);
        const next = { ...prev, satScores };
        patchSettings({ satScores });
        return next;
      });
    },
    []
  );

  const setToeflTargetTotal = useCallback(
    (toeflTargetTotal) => updateSettings({ toeflTargetTotal: normalizeToeflTargetTotal(toeflTargetTotal) }),
    [updateSettings]
  );

  const setSatTargetTotal = useCallback(
    (satTargetTotal) => updateSettings({ satTargetTotal: normalizeSatTargetTotal(satTargetTotal) }),
    [updateSettings]
  );

  const setStudyPlan = useCallback(
    (studyPlan) => updateSettings({ studyPlan }),
    [updateSettings]
  );

  const speakWord = useCallback((word) => speak(word, settings), [settings]);

  const value = useMemo(
    () => ({
      settings,
      systemVoices,
      settingsOpen,
      setSettingsOpen,
      setTheme,
      setSystemVoiceURI,
      setAutoReadOnNewWord,
      setAutoDictateOnNewWord,
      setAutoAdvanceAfterFlip,
      setAutoAdvanceDelaySec,
      setPracticeStyle,
      setHideWordFirst,
      setAnswerSounds,
      setAnswerSoundCorrect,
      setAnswerSoundWrong,
      setTargetExam,
      setToeflSectionScore,
      setSatSectionScore,
      setToeflTargetTotal,
      setSatTargetTotal,
      setStudyPlan,
      speakWord,
    }),
    [
      settings,
      systemVoices,
      settingsOpen,
      setTheme,
      setSystemVoiceURI,
      setAutoReadOnNewWord,
      setAutoDictateOnNewWord,
      setAutoAdvanceAfterFlip,
      setAutoAdvanceDelaySec,
      setPracticeStyle,
      setHideWordFirst,
      setAnswerSounds,
      setAnswerSoundCorrect,
      setAnswerSoundWrong,
      setTargetExam,
      setToeflSectionScore,
      setSatSectionScore,
      setToeflTargetTotal,
      setSatTargetTotal,
      setStudyPlan,
      speakWord,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
