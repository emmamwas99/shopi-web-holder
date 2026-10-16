"use client";

import { ArrowUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type InventoryChip<K extends string> = {
  key: K;
  label: string;
  count: number;
  /** Work waiting: a dot stays on the chip while it isn't selected. */
  attention?: boolean;
};

/**
 * Search, sort and status chips for the seller's own lists (Posts, Drafts).
 *
 * Chips rather than a dropdown: the statuses and their counts are the first
 * thing a seller wants to read, and a closed dropdown hid them behind a tap.
 * The sort is a native <select> on purpose — on a phone it opens the system
 * picker, which is the most native control there is and needs no sheet.
 */
export function InventoryControls<F extends string, S extends string>({
  search,
  onSearchChange,
  searchPlaceholder,
  chips,
  filter,
  onFilterChange,
  sortOptions,
  sort,
  onSortChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  chips: InventoryChip<F>[];
  filter: F;
  onFilterChange: (key: F) => void;
  sortOptions?: { key: S; label: string }[];
  sort?: S;
  onSortChange?: (key: S) => void;
}) {
  const sortLabel = sortOptions?.find((option) => option.key === sort)?.label;

  return (
    <div className="mb-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label className="relative flex h-10 min-w-0 flex-1 items-center rounded-full bg-surface">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            enterKeyHint="search"
            className="h-full w-full min-w-0 rounded-full bg-transparent pl-10 pr-10 text-[15px] text-main outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
            aria-label={searchPlaceholder}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-full text-muted active:bg-black/5"
            >
              <X size={16} />
            </button>
          )}
        </label>

        {sortOptions && sort && onSortChange && (
          <label
            className="relative flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-semibold text-main"
            title="Sort"
          >
            <ArrowUpDown size={15} aria-hidden />
            {/* The label reads on wider screens; on a phone the icon is enough
                and the search keeps the width. */}
            <span className="hidden sm:inline">{sortLabel}</span>
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as S)}
              aria-label="Sort"
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {sortOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Bleeds to the screen edge on a phone so the chips scroll edge to
          edge, the way native filter bars do. */}
      <div
        role="tablist"
        aria-label="Filter"
        className="no-scroll-indicator -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        {chips.map((chip) => {
          const active = chip.key === filter;
          return (
            <button
              key={chip.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onFilterChange(chip.key)}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
                active
                  ? "bg-main text-[rgb(var(--color-bg))]"
                  : "bg-surface text-main active:opacity-70",
              )}
            >
              {chip.label}
              <span
                className={cn(
                  "tabular-nums",
                  active ? "opacity-70" : "text-muted",
                )}
              >
                {chip.count}
              </span>
              {chip.attention && !active && chip.count > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
