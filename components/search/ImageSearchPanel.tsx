"use client";

import Image from "next/image";
import { LoaderCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageSearchSession } from "@/stores/imageSearch";
import { useImageSearchPicker } from "./ImageSearchButton";
import type { ImageSearchPhase } from "./useImageSearchResults";

function copyFor(phase: ImageSearchPhase, count: number, error: string | null) {
  switch (phase) {
    case "analyzing":
      return { title: "Analyzing your photo…", body: "Looking for the item in your image" };
    case "searching":
      return { title: "Finding similar items…", body: "Matching it against listings on Shopi" };
    case "error":
      return { title: "Photo search didn’t finish", body: error ?? "Try again in a moment." };
    case "done":
      return count > 0
        ? {
            title: "Results for your photo",
            body: `${count} similar ${count === 1 ? "item" : "items"}`,
          }
        : { title: "No similar items yet", body: "Try a clearer, closer photo of the item." };
  }
}

/**
 * The photo at the top of photo-search results: the search's equivalent of
 * the typed term in the box, plus what is happening to it. The grid under it
 * is the same one a typed search fills.
 */
export function ImageSearchPanel({
  session,
  phase,
  count,
  error,
  onClose,
  className,
}: {
  session: ImageSearchSession;
  phase: ImageSearchPhase;
  count: number;
  error: string | null;
  onClose: () => void;
  className?: string;
}) {
  const picker = useImageSearchPicker({
    surface: session.surface,
    target: session.target,
    onPicked: () => window.scrollTo({ top: 0 }),
  });
  const busy = phase === "analyzing" || phase === "searching";
  const failed = phase === "error" || (phase === "done" && count === 0);
  const copy = copyFor(phase, count, error);

  return (
    <section
      aria-label="Search by photo"
      className={cn("flex items-center gap-3 rounded-2xl bg-subtle p-2.5", className)}
    >
      {picker.input}
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-app md:size-20">
        <Image
          src={session.preview}
          alt="Your photo"
          fill
          unoptimized
          sizes="80px"
          className="object-cover"
        />
        {phase === "analyzing" ? (
          <>
            <span className="absolute inset-0 bg-black/25" aria-hidden />
            <span className="shopi-image-scan" aria-hidden />
          </>
        ) : null}
      </div>

      <div className="min-w-0 flex-1" role="status" aria-live="polite">
        <p className="flex items-center gap-1.5 text-[14px] font-semibold leading-5 text-main md:text-[15px]">
          {busy ? (
            <LoaderCircle size={14} className="shrink-0 animate-spin text-primary" aria-hidden />
          ) : null}
          <span className="truncate">{copy.title}</span>
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-muted md:text-[13px] md:leading-5">
          {copy.body}
        </p>
        <button
          type="button"
          onClick={picker.open}
          className="mt-1 -ml-1 rounded px-1 py-0.5 text-[12px] font-semibold text-primary active:opacity-70 md:text-[13px]"
        >
          {failed ? "Try another photo" : "Change photo"}
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Exit photo search"
        className="grid size-8 shrink-0 place-items-center self-start rounded-full text-muted transition-colors hover:text-main active:bg-app"
      >
        <X size={18} aria-hidden />
      </button>
    </section>
  );
}
