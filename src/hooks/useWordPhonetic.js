import { useMemo } from "react";
import { getWordPhoneticSync } from "../services/phonetics";

export function useWordPhonetic(word) {
  return useMemo(() => getWordPhoneticSync(word), [word]);
}
