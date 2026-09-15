import { useEffect } from "react";
import {
  lockEnglishIme,
  restoreEnglishIme,
  shouldRestoreEnglishIme,
} from "../utils/englishIme";

/**
 * 阅读填词页锁定英文输入法提示；点到导航栏（或其他中文输入区域）后恢复。
 * 网页不能改操作系统输入法，只能通过 lang / ime-mode 提示，并配合填空框拦截组字。
 */
export function useEnglishImeLock(enabled) {
  useEffect(() => {
    if (!enabled) {
      restoreEnglishIme();
      return undefined;
    }

    lockEnglishIme();

    const syncFromEvent = (event) => {
      const target = event.target;
      if (shouldRestoreEnglishIme(target)) {
        restoreEnglishIme();
        return;
      }
      if (target instanceof Element && target.closest(".rfill")) {
        lockEnglishIme();
      }
    };

    document.addEventListener("focusin", syncFromEvent);
    document.addEventListener("pointerdown", syncFromEvent, true);

    return () => {
      document.removeEventListener("focusin", syncFromEvent);
      document.removeEventListener("pointerdown", syncFromEvent, true);
      restoreEnglishIme();
    };
  }, [enabled]);
}
