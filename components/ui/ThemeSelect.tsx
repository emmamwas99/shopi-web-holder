"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/theme";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Theme = "light" | "dark" | "system";

const OPTIONS = [
  { value: "light", label: "Light", labelSw: "Mwanga", Icon: Sun },
  { value: "dark", label: "Dark", labelSw: "Giza", Icon: Moon },
  { value: "system", label: "System", labelSw: "Mfumo", Icon: Monitor },
] as const;

/**
 * Light / Dark / System dropdown. Writes the same persisted store as the app's
 * dark-mode toggle (stores/theme.ts), so a choice made here applies across the
 * whole app, and one made in the app shows here.
 */
export function ThemeSelect({
  lang = "en",
  className,
}: {
  lang?: string;
  className?: string;
}) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [mounted, setMounted] = useState(false);
  const sw = lang === "sw";

  // The choice lives in localStorage, so the server can't know it: show the
  // placeholder until mounted to keep hydration consistent.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  return (
    <Select
      value={mounted ? theme : ""}
      onValueChange={(value) => setTheme(value as Theme)}
    >
      <SelectTrigger
        aria-label={sw ? "Chagua mandhari" : "Choose theme"}
        className={cn(
          "h-10 w-auto min-w-30 cursor-pointer gap-2 rounded-full border-landing-line bg-landing-page px-4 font-medium text-landing-ink",
          className,
        )}
      >
        <SelectValue placeholder={sw ? "Mandhari" : "Theme"} />
      </SelectTrigger>
      <SelectContent className="z-[60]">
        {OPTIONS.map(({ value, label, labelSw, Icon }) => (
          <SelectItem key={value} value={value} className="cursor-pointer">
            <span className="inline-flex items-center gap-2">
              <Icon size={15} strokeWidth={2.1} aria-hidden />
              {sw ? labelSw : label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
