import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { loadSettings, patchSettings } from "../services/settings";
import { getSystemVoices, speakWord as speak } from "../utils/speech";

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
      speakWord,
    }),
    [settings, systemVoices, settingsOpen, setTheme, setSystemVoiceURI, setAutoReadOnNewWord, speakWord]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
