import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

function applyTheme(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = resolved === "dark";
  // Keep the browser chrome (address/status bars on mobile) in step with the
  // in-app theme, which can differ from the device's OS appearance.
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#18191a" : "#ffffff");
  if (root.classList.contains("dark") === dark) return;

  // Flip the theme atomically: the global 0.18s per-element color transition
  // (globals.css) makes surfaces, borders and images repaint at different
  // moments during a switch, which reads as the page shifting. Suppressing
  // transitions for the flip makes every element change in the same frame.
  root.classList.add("theme-switching");
  root.classList.toggle("dark", dark);
  window.setTimeout(() => root.classList.remove("theme-switching"), 80);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Default to light until the user explicitly chooses a theme.
      theme: "light",
      // Read the class the inline script already applied so the first
      // render matches — avoids a sun/moon icon flicker on hydration.
      resolvedTheme:
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark")
          ? "dark"
          : "light",

      setTheme(theme) {
        const resolved = resolveTheme(theme);
        applyTheme(resolved);
        set({ theme, resolvedTheme: resolved });
      },

      toggleTheme() {
        const next = get().resolvedTheme === "dark" ? "light" : "dark";
        get().setTheme(next);
      },
    }),
    {
      name: "shopi-theme",
      // Persist both the choice and the resolved value so the store
      // is correct immediately on rehydration — no async race.
      partialize: (s) => ({ theme: s.theme, resolvedTheme: s.resolvedTheme }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Re-resolve in case OS preference changed since last visit,
        // but only for "system" — explicit user choices are honoured as-is.
        const resolved =
          state.theme === "system"
            ? resolveTheme("system")
            : state.resolvedTheme;
        applyTheme(resolved);
        // Use set via the returned callback to trigger a proper re-render.
        state.resolvedTheme = resolved;
      },
    },
  ),
);
