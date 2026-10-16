"use client";

import { ArrowUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type InventoryChip<K extends string> = {
  key: K;
  label: string;
  count: number;
  /** Work waiting: its count stays highlighted while it isn't selected. */
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
        <label className="relative flex h-10 min-w-0 flex-1 items-center rounded-xl bg-surface">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            enterKeyHint="search"
            className="h-full w-full min-w-0 rounded-xl bg-transparent pl-9 pr-9 text-sm text-main outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
            aria-label={searchPlaceholder}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-1.5 flex size-7 items-center justify-center rounded-[8px] text-muted active:bg-black/5"
            >
              <X size={16} />
            </button>
          )}
        </label>

        {sortOptions && sort && onSortChange && (
          <label
            className="relative flex h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-surface px-3 text-[13px] font-medium text-main"
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
                "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors",
                active ? "bg-primary text-white" : "bg-surface text-main active:opacity-70",
              )}
            >
              {chip.label}
              {/* The admin's count: tinted when the tab is chosen, or when
                  it holds work waiting. */}
              <span
                className={cn(
                  "rounded-[6px] px-1.5 text-xs tabular-nums",
                  active
                    ? "bg-white/20 text-white"
                    : chip.attention && chip.count > 0
                      ? "bg-primary-soft font-medium text-primary-strong"
                      : "text-muted",
                )}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
