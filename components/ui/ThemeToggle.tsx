"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/theme";
import { Switch } from "@/components/ui/switch";

export function ThemeToggle({ showIcons = true }: { showIcons?: boolean }) {
  const { resolvedTheme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  // Only render after mount — prevents SSR/client mismatch
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Switch
        disabled
        aria-label="Toggle dark mode"
        className="opacity-0"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="inline-flex items-center gap-2">
      {showIcons ? (
        <Sun
          size={14}
          strokeWidth={2.1}
          className={isDark ? "text-placeholder" : "text-highlight"}
          aria-hidden
        />
      ) : null}
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
      {showIcons ? (
        <Moon
          size={14}
          strokeWidth={2.1}
          className={isDark ? "text-accent" : "text-placeholder"}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
