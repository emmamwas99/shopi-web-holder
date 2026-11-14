"use client";

import { useRef, type ReactNode } from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageSearchSurface } from "@/lib/imageSearch";
import { useImageSearchStore, type ImageSearchTarget } from "@/stores/imageSearch";

type PickerOptions = {
  /** Which search box started it, for the usage metrics. */
  surface: ImageSearchSurface;
  /** Where the results are shown — see stores/imageSearch.ts. */
  target?: ImageSearchTarget;
  /**
   * Runs as soon as a photo is chosen, before the search starts: the caller
   * gets the results on screen (navigates to Browse, opens its results view,
   * clears a typed term) while the photo is still being analysed.
   */
  onPicked?: () => void;
};

/**
 * A hidden file input and the function that opens it.
 *
 * The OS picker is the whole selection step — on a phone it already offers
 * the camera and the photo library — so there is no sheet of our own in front
 * of it. Choosing a photo hands it to the image search store and the results
 * screen takes over from there, the way a typed search does.
 */
export function useImageSearchPicker({
  surface,
  target = "explore",
  onPicked,
}: PickerOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const start = useImageSearchStore((s) => s.start);

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        // Cleared so picking the same photo again still fires a change.
        event.currentTarget.value = "";
        if (!file) return;
        onPicked?.();
        void start(file, { surface, target });
      }}
    />
  );

  return { open: () => inputRef.current?.click(), input };
}

export function ImageSearchButton({
  className,
  children,
  ...options
}: PickerOptions & { className?: string; children?: ReactNode }) {
  const picker = useImageSearchPicker(options);
  return (
    <>
      {picker.input}
      <button
        type="button"
        onClick={picker.open}
        aria-label="Search by image"
        title="Search by image"
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-primary",
          className,
        )}
      >
        {children ?? <Camera size={18} aria-hidden />}
      </button>
    </>
  );
}
