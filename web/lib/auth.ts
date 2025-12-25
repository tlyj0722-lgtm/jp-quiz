// web/lib/auth.ts
export type Profile = { name: string; studentId: string };

const TOKEN_KEY = 'jpq_token';
const PROFILE_KEY = 'jpq_profile';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getToken(): string | null {
  if (!canUseStorage()) return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth() {
  if (!canUseStorage()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export function setProfile(p: Profile) {
  if (!canUseStorage()) return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

export function getProfile(): Profile | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}
