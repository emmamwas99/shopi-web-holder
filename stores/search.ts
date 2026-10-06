import { create } from "zustand";

/**
 * The discover search term, shared between the desktop nav's search box
 * (components/layout/SideNav.tsx) and DiscoverPage, which renders /explore and
 * /search.
 *
 * Those two live in different trees — the nav is mounted by the app shell layout,
 * DiscoverPage by the route — so there is no common ancestor to hold the term.
 * The obvious alternative, letting both read and write `?q=`, means two
 * debounced writers racing on one URL param: DiscoverPage already mirrors its
 * filters into the URL, so a second writer there tends to clobber half-typed
 * terms when the echo comes back.
 *
 * Instead the nav is a remote control for this one value, and DiscoverPage
 * stays the only thing that writes `?q=`. Deep links still work because
 * DiscoverPage seeds this store from `?q=` when it mounts.
 *
 * Deliberately not persisted: a search term is per-visit, and restoring one
 * into an empty-looking results page on the next launch would be a bug.
 */
interface SearchState {
  /** What is in the input right now, before debouncing into a query. */
  draft: string;
  setDraft: (draft: string) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  draft: "",
  setDraft: (draft) => set({ draft }),
}));
