"use client";

import { useEffect } from "react";

const BROADCAST_KEY = "better-auth.message";

function isValidBroadcastValue(value: string | null) {
  if (!value) {
    return true;
  }

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function AuthStorageGuard() {
  useEffect(() => {
    if (!isValidBroadcastValue(localStorage.getItem(BROADCAST_KEY))) {
      localStorage.removeItem(BROADCAST_KEY);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== BROADCAST_KEY) {
        return;
      }

      if (!isValidBroadcastValue(event.newValue)) {
        localStorage.removeItem(BROADCAST_KEY);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return null;
}
