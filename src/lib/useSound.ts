"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadSoundPreference, saveSoundPreference } from "./storage";

type ToneStep = { freq: number; start: number; duration: number; gain?: number };

function playTones(ctx: AudioContext, steps: ToneStep[]) {
  const now = ctx.currentTime;
  for (const step of steps) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = step.freq;
    const startTime = now + step.start;
    const endTime = startTime + step.duration;
    const peakGain = step.gain ?? 0.08;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(endTime + 0.02);
  }
}

export function useSound() {
  const [enabled, setEnabled] = useState(true);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setEnabled(loadSoundPreference());
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      saveSoundPreference(next);
      return next;
    });
  }, []);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AudioCtx();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const play = useCallback(
    (name: "join" | "tick" | "reveal" | "winner" | "leaderboard" | "next") => {
      if (!enabled) return;
      try {
        const ctx = getCtx();
        switch (name) {
          case "join":
            playTones(ctx, [{ freq: 660, start: 0, duration: 0.12, gain: 0.05 }]);
            break;
          case "tick":
            playTones(ctx, [{ freq: 880, start: 0, duration: 0.06, gain: 0.04 }]);
            break;
          case "next":
            playTones(ctx, [
              { freq: 520, start: 0, duration: 0.1, gain: 0.05 },
              { freq: 660, start: 0.08, duration: 0.12, gain: 0.05 },
            ]);
            break;
          case "reveal":
            playTones(ctx, [
              { freq: 440, start: 0, duration: 0.15, gain: 0.06 },
              { freq: 554, start: 0.12, duration: 0.15, gain: 0.06 },
              { freq: 659, start: 0.24, duration: 0.25, gain: 0.07 },
            ]);
            break;
          case "winner":
            playTones(ctx, [
              { freq: 523, start: 0, duration: 0.14, gain: 0.07 },
              { freq: 659, start: 0.12, duration: 0.14, gain: 0.07 },
              { freq: 784, start: 0.24, duration: 0.14, gain: 0.07 },
              { freq: 1046, start: 0.36, duration: 0.4, gain: 0.08 },
            ]);
            break;
          case "leaderboard":
            playTones(ctx, [
              { freq: 392, start: 0, duration: 0.1, gain: 0.05 },
              { freq: 494, start: 0.08, duration: 0.1, gain: 0.05 },
              { freq: 587, start: 0.16, duration: 0.2, gain: 0.06 },
            ]);
            break;
        }
      } catch {
        // Audio not available (e.g. autoplay policy) - fail silently.
      }
    },
    [enabled, getCtx]
  );

  return { enabled, toggle, play };
}
