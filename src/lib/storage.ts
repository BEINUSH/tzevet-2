"use client";

export interface ParticipantSession {
  code: string;
  deviceToken: string;
  name: string;
}

export interface HostSession {
  code: string;
  hostToken: string;
}

const PARTICIPANT_KEY = "gibush.participant";
const HOST_KEY = "gibush.host";

export function saveParticipantSession(session: ParticipantSession) {
  localStorage.setItem(PARTICIPANT_KEY, JSON.stringify(session));
}
export function loadParticipantSession(): ParticipantSession | null {
  const raw = localStorage.getItem(PARTICIPANT_KEY);
  return raw ? (JSON.parse(raw) as ParticipantSession) : null;
}
export function clearParticipantSession() {
  localStorage.removeItem(PARTICIPANT_KEY);
}

export function saveHostSession(session: HostSession) {
  localStorage.setItem(HOST_KEY, JSON.stringify(session));
}
export function loadHostSession(): HostSession | null {
  const raw = localStorage.getItem(HOST_KEY);
  return raw ? (JSON.parse(raw) as HostSession) : null;
}
export function clearHostSession() {
  localStorage.removeItem(HOST_KEY);
}

const SOUND_KEY = "gibush.soundEnabled";
export function loadSoundPreference(): boolean {
  const raw = localStorage.getItem(SOUND_KEY);
  return raw === null ? true : raw === "1";
}
export function saveSoundPreference(enabled: boolean) {
  localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
}
