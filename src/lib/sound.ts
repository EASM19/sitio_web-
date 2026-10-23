let audioCtx: AudioContext | null = null;
let listenersInstalados = false;

function desbloquearCtx() {
  try {
    const ctx = getCtx();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  } catch {
    // silencio
  }
}

function instalarListeners() {
  if (listenersInstalados || typeof window === "undefined") return;
  listenersInstalados = true;
  ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, desbloquearCtx, { passive: true })
  );
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") desbloquearCtx();
  });
  window.addEventListener("focus", desbloquearCtx);
}

if (typeof window !== "undefined") {
  instalarListeners();
}

function getCtx(): AudioContext | null {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

export function desbloquearAudio() {
  instalarListeners();
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch {
    // silencio
  }
}

export function sonarAlerta() {
  try {
    const ctx = getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.22;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch {
    // silencio si el navegador bloquea el audio
  }
}
