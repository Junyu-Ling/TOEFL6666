import { memo, useCallback, useRef, useState } from "react";

/**
 * 简易滑块人机校验：拖到尽头后回调 onPass。
 * 用于频率限制触发后的二次确认（心理门槛 + 拦截脚本化连刷）。
 */
function RateLimitCaptcha({ onPass, hint = "" }) {
  const trackRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const maxRef = useRef(0);

  const endDrag = useCallback(
    (clientX) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const knob = 44;
      const max = Math.max(rect.width - knob, 1);
      maxRef.current = max;
      const next = Math.min(Math.max(clientX - rect.left - knob / 2, 0), max);
      setOffset(next);
      setDragging(false);
      if (next >= max - 2) onPass?.();
    },
    [onPass]
  );

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event) => {
    if (!dragging) return;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const knob = 44;
    const max = Math.max(rect.width - knob, 1);
    maxRef.current = max;
    setOffset(Math.min(Math.max(event.clientX - rect.left - knob / 2, 0), max));
  };

  const onPointerUp = (event) => endDrag(event.clientX);

  return (
    <div className="rfill__captcha" role="group" aria-label="人机校验">
      <p className="rfill__captcha-title">访问过于频繁</p>
      <p className="rfill__captcha-hint">{hint || "请拖动滑块完成校验后重新加载题目"}</p>
      <div ref={trackRef} className="rfill__captcha-track">
        <div className="rfill__captcha-fill" style={{ width: offset + 22 }} />
        <span className="rfill__captcha-label">按住滑块拖到右侧</span>
        <button
          type="button"
          className="rfill__captcha-knob"
          style={{ transform: `translateX(${offset}px)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDragging(false)}
          aria-label="拖动完成校验"
        />
      </div>
    </div>
  );
}

export default memo(RateLimitCaptcha);
