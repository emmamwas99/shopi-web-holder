import { create } from "zustand";
import {
  imageSearchQuery,
  prepareSearchImage,
  type ImageSearchSurface,
} from "@/lib/imageSearch";

/**
 * Where a photo search's results are shown.
 *
 * - `explore`: the Browse results page (DiscoverPage), the same place a typed
 *   search lands. Every search box except the home feed's sends photos here.
 * - `home`: the home feed's full-screen search (MobileSearchScreen), which has
 *   its own results view and stays on the feed.
 */
export type ImageSearchTarget = "explore" | "home";

export type ImageSearchSession = {
  /** Increments per photo, so a slow answer for an old photo is dropped. */
  key: number;
  /** Object URL of the picked photo, shown in the results' image section. */
  preview: string;
  surface: ImageSearchSurface;
  target: ImageSearchTarget;
  /** `analyzing` covers resizing, upload and the visual match itself. */
  status: "analyzing" | "ready" | "error";
  /** Matched listing ids, best match first. */
  ids: string[];
  error: string | null;
};

interface ImageSearchState {
  session: ImageSearchSession | null;
  start: (
    file: File,
    options: { surface: ImageSearchSurface; target: ImageSearchTarget },
  ) => Promise<void>;
  /** Ends the photo search — only one shown at `target`, when given. */
  clear: (target?: ImageSearchTarget) => void;
}

let nextKey = 0;

function revoke(session: ImageSearchSession | null) {
  if (session?.preview.startsWith("blob:")) URL.revokeObjectURL(session.preview);
}

/**
 * The current photo search, kept outside any one screen.
 *
 * Picking a photo from the desktop nav or the homepage navigates to Browse
 * while the search is still running; holding it here (not in the button that
 * started it) means the navigation neither cancels it nor loses the photo.
 * It also outlives a trip into a result and back, the way a typed search's
 * ?q= does. Deliberately not persisted: a reload starts clean.
 */
export const useImageSearchStore = create<ImageSearchState>((set, get) => ({
  session: null,

  async start(file, { surface, target }) {
    const key = ++nextKey;
    revoke(get().session);
    set({
      session: {
        key,
        preview: URL.createObjectURL(file),
        surface,
        target,
        status: "analyzing",
        ids: [],
        error: null,
      },
    });

    const update = (patch: Partial<ImageSearchSession>) => {
      const current = get().session;
      if (current?.key !== key) return; // a newer photo, or cleared
      set({ session: { ...current, ...patch } });
    };

    try {
      const imageDataUrl = await prepareSearchImage(file);
      const matches = await imageSearchQuery(imageDataUrl, surface);
      update({ status: "ready", ids: matches.map((match) => match.id) });
    } catch (failure) {
      update({
        status: "error",
        error:
          failure instanceof Error && failure.message
            ? failure.message
            : "Image search failed. Try again.",
      });
    }
  },

  clear(target) {
    const current = get().session;
    if (!current || (target && current.target !== target)) return;
    revoke(current);
    set({ session: null });
  },
}));
