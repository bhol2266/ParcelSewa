"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

type Theme = "light" | "dark";
interface ThemeContextValue { theme: Theme; toggleTheme: () => void; }
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "parcelsewa-theme";
const THEME_EVENT = "parcelsewa-theme-change";

export const themeInitScript = `(function(){try{document.documentElement.classList.toggle("dark",localStorage.getItem("${STORAGE_KEY}")==="dark");}catch(e){}})();`;

function subscribe(listener: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY || event.key === null) {
      document.documentElement.classList.toggle("dark", event.newValue === "dark");
      listener();
    }
  }
  window.addEventListener(THEME_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(THEME_EVENT, listener); window.removeEventListener("storage", onStorage); };
}
function getSnapshot(): Theme { return document.documentElement.classList.contains("dark") ? "dark" : "light"; }
function getServerSnapshot(): Theme { return "light"; }
function toggleTheme() {
  const next = getSnapshot() === "dark" ? "light" : "dark";
  document.documentElement.classList.toggle("dark", next === "dark");
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Theme still works when storage is unavailable. */ }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
