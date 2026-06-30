"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import {
  applyThemeToDocument,
  getThemeStorageKey,
  readStoredTheme,
  type AppTheme,
} from "@/lib/route-theme";

type RouteThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  /** False on landing — no toggle, no global theme writes */
  canToggle: boolean;
};

const RouteThemeContext = createContext<RouteThemeContextValue | null>(null);

function RouteThemeScope({
  children,
  storageKey,
  defaultTheme,
}: {
  children: ReactNode;
  storageKey: string;
  defaultTheme: AppTheme;
}) {
  const [theme, setThemeState] = useState<AppTheme>(() =>
    readStoredTheme(storageKey, defaultTheme),
  );

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = useCallback(
    (next: AppTheme) => {
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // ignore
      }

      setThemeState(next);
    },
    [storageKey],
  );

  const value = useMemo(
    () => ({ theme, setTheme, canToggle: true as const }),
    [theme, setTheme],
  );

  return (
    <RouteThemeContext.Provider value={value}>{children}</RouteThemeContext.Provider>
  );
}

export function RouteThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: ReactNode;
  defaultTheme?: AppTheme;
}) {
  const pathname = usePathname();
  const storageKey = getThemeStorageKey(pathname);

  if (!storageKey) {
    const value: RouteThemeContextValue = {
      theme: defaultTheme,
      setTheme: () => {},
      canToggle: false,
    };

    return (
      <RouteThemeContext.Provider value={value}>{children}</RouteThemeContext.Provider>
    );
  }

  return (
    <RouteThemeScope key={storageKey} storageKey={storageKey} defaultTheme={defaultTheme}>
      {children}
    </RouteThemeScope>
  );
}

export function useRouteTheme() {
  const context = useContext(RouteThemeContext);
  if (!context) {
    throw new Error("useRouteTheme must be used within RouteThemeProvider");
  }
  return context;
}
