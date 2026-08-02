import { useEffect, useState } from "react";

export const MOBILE_LAYOUT_QUERY = "(max-width: 640px)";

export function isMobileLayout() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_LAYOUT_QUERY).matches;
}

export function useMobileLayout() {
  const [mobile, setMobile] = useState(isMobileLayout);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return mobile;
}
