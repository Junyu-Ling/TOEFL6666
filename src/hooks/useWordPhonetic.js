import { useEffect, useState } from "react";
import { getCachedPhonetic, getWordPhonetic } from "../services/phonetics";

export function useWordPhonetic(word) {
  const [phonetic, setPhonetic] = useState(() => getCachedPhonetic(word));

  useEffect(() => {
    const key = String(word || "").trim().toLowerCase();
    if (!key) {
      setPhonetic("");
      return undefined;
    }

    const cached = getCachedPhonetic(key);
    if (cached) {
      setPhonetic(cached);
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;
    setPhonetic("");

    getWordPhonetic(key, { signal: controller.signal })
      .then((ipa) => {
        if (!cancelled) setPhonetic(ipa || "");
      })
      .catch(() => {
        if (!cancelled) setPhonetic("");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [word]);

  return phonetic;
}
