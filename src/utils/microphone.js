export async function requestMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("当前浏览器不支持麦克风");
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());
}

export async function queryMicrophonePermission() {
  if (!navigator.permissions?.query) return "unknown";

  try {
    const result = await navigator.permissions.query({ name: "microphone" });
    return result.state;
  } catch {
    return "unknown";
  }
}
