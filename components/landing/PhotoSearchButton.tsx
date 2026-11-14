"use client";

import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { useImageSearchPicker } from "@/components/search/ImageSearchButton";
import { trackHomepageButtonClick } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * "Search with a photo" on marketing pages. Opens the phone's own picker
 * (camera or gallery) straight away — the same flow as the camera in the
 * search bar — then shows the matches on Browse while the photo is analysed.
 */
export function PhotoSearchButton({
  lang,
  label,
  placement,
  className,
}: {
  lang: string;
  label: string;
  /** Where on the page the button sits, for analytics. */
  placement: string;
  className?: string;
}) {
  const router = useRouter();
  const destination = `/${lang}/explore`;
  const picker = useImageSearchPicker({
    surface: "HOME",
    target: "explore",
    onPicked: () => router.push(destination),
  });

  return (
    <>
      {picker.input}
      <button
        type="button"
        onClick={() => {
          trackHomepageButtonClick("photo_search", placement, destination);
          picker.open();
        }}
        className={cn(
          "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-[0.9375rem] font-semibold text-white hover:opacity-90",
          className,
        )}
      >
        <Camera size={18} aria-hidden />
        {label}
      </button>
    </>
  );
}
