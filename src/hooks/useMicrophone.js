import { useState, useEffect, useCallback } from "react";
import { requestMicrophonePermission, queryMicrophonePermission } from "../utils/microphone";
import { isSpeechRecognitionSupported } from "../utils/speechRecognition";

const MIC_GRANTED_KEY = "toefl666_mic_granted";

export function useMicrophone() {
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setStatus("unsupported");
      return;
    }

    if (localStorage.getItem(MIC_GRANTED_KEY) === "1") {
      setStatus("granted");
    }

    queryMicrophonePermission().then((state) => {
      if (state === "granted") {
        localStorage.setItem(MIC_GRANTED_KEY, "1");
        setStatus("granted");
      } else if (state === "denied") {
        setStatus("denied");
      }
    });
  }, []);

  const request = useCallback(async () => {
    setStatus("requesting");
    try {
      await requestMicrophonePermission();
      localStorage.setItem(MIC_GRANTED_KEY, "1");
      setStatus("granted");
      return true;
    } catch {
      localStorage.removeItem(MIC_GRANTED_KEY);
      setStatus("denied");
      return false;
    }
  }, []);

  return {
    status,
    request,
    isGranted: status === "granted",
    isUnsupported: status === "unsupported",
    isRequesting: status === "requesting",
    isDenied: status === "denied",
  };
}
