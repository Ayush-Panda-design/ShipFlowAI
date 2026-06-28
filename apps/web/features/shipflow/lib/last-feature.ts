const STORAGE_KEY = "shipflow:last-feature";

export type LastFeature = {
  id: string;
  title: string;
  status: string;
  projectId?: string;
  updatedAt: number;
};

export function isTerminalFeatureStatus(status: string) {
  return status === "shipped" || status === "rejected" || status === "duplicate";
}

export function rememberLastFeature(feature: Omit<LastFeature, "updatedAt">) {
  if (typeof window === "undefined") return;
  try {
    const payload: LastFeature = { ...feature, updatedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export function readLastFeature(): LastFeature | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastFeature;
    if (!parsed?.id || !parsed?.title) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLastFeature() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
