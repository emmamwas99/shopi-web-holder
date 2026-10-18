"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Check, ChevronRight } from "lucide-react";
import { CategoriesDocument } from "@/types/__generated__/graphql";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { DrawerLoadingIndicator } from "@/components/ui/drawer-loading-indicator";
import { useIsDesktop } from "@/hooks/useIsDesktop";

type CategoryPickerDrawerProps = {
  value: string | null;
  fallbackLabel?: string | null;
  onChange: (id: string, name: string) => void;
  /**
   * When omitted, this pickers the fixed Level-1 roots (depth 0). Pass a
   * category id to pick its Level-2 children instead (depth 1) — e.g. the
   * subcategory step right after a category is chosen. `null`/`undefined`
   * with this prop *present* (subcategory mode) means "no parent chosen yet",
   * which the caller should handle by disabling the trigger rather than
   * relying on this component to guess.
   */
  parentId?: string | null;
  title?: string;
  placeholderLabel?: string;
  emptyLabel?: string;
};

export function CategoryPickerDrawer({
  value,
  fallbackLabel,
  onChange,
  parentId,
  title = "Category",
  placeholderLabel = "Choose category",
  emptyLabel = "No active categories available right now.",
}: CategoryPickerDrawerProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop({ ssrDefault: false });
  const isSubcategoryMode = parentId !== undefined;
  const { data, loading } = useQuery(CategoriesDocument, {
    fetchPolicy: "cache-and-network",
  });

  const categories = useMemo(() => {
    const all = data?.categories ?? [];
    // The flat `categories` query returns every active category regardless
    // of depth, so the root picker must filter to depth 0 itself — without
    // this, every seeded subcategory would show up mixed into the top-level
    // list too.
    return isSubcategoryMode
      ? all.filter((category) => category.parentId === parentId)
      : all.filter((category) => category.depth === 0);
  }, [data?.categories, isSubcategoryMode, parentId]);

  const selected =
    categories.find((category) => category.id === value) ??
    categories.find((category) => category.name === fallbackLabel);
  const selectedLabel =
    selected?.name ?? fallbackLabel ?? (value ? "Selected" : placeholderLabel);

  function selectCategory(id: string) {
    const category = categories.find((item) => item.id === id);
    if (!category) return;
    onChange(category.id, category.name);
    setOpen(false);
  }

  const disabled = isSubcategoryMode && !parentId;

  const triggerButton = (
    <button
      type="button"
      disabled={disabled}
      className="flex min-h-13 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        backgroundColor: "rgb(var(--color-bg-subtle))",
        border: "1px solid rgb(var(--color-border))",
      }}
    >
      <span className="min-w-0 flex-1">
        <span
          className="block truncate font-medium"
          style={{
            color: value
              ? "rgb(var(--color-text))"
              : "rgb(var(--color-text-placeholder))",
            fontSize: "var(--text-base)",
          }}
        >
          {disabled ? "Choose a category first" : selectedLabel}
        </span>
        {value && (
          <span
            className="block truncate"
            style={{
              color: "rgb(var(--color-text-muted))",
              fontSize: "var(--text-xs)",
            }}
          >
            Selected
          </span>
        )}
      </span>
      <ChevronRight
        className="h-5 w-5 shrink-0"
        style={{ color: "rgb(var(--color-text-muted))" }}
      />
    </button>
  );

  const pickerList =
    loading && categories.length === 0 ? (
      <DrawerLoadingIndicator className="h-32 min-h-0" />
    ) : categories.length === 0 ? (
      <div
        className="flex h-32 items-center justify-center text-center"
        style={{
          color: "rgb(var(--color-text-muted))",
          fontSize: "var(--text-sm)",
        }}
      >
        {emptyLabel}
      </div>
    ) : (
      <div
        role="radiogroup"
        aria-label={title}
        className="flex flex-col gap-2 pb-2"
      >
        {categories.map((category) => {
          const checked = category.id === selected?.id;
          return (
            // A real <button>, not a div+onClick: inside a vaul drawer the click
            // has to survive the pointer-capture/drag gesture, and a native
            // button is also keyboard- and screen-reader-reachable.
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => selectCategory(category.id)}
              className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left"
              style={{
                backgroundColor: checked
                  ? "rgb(var(--brand-primary) / 0.1)"
                  : "rgb(var(--color-bg-subtle))",
                border: checked
                  ? "1px solid rgb(var(--brand-primary) / 0.35)"
                  : "1px solid rgb(var(--color-border))",
              }}
            >
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate font-medium"
                  style={{
                    color: "rgb(var(--color-text))",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  {category.name}
                </span>
                {category.description && (
                  <span
                    className="line-clamp-1"
                    style={{
                      color: "rgb(var(--color-text-muted))",
                      fontSize: "var(--text-xs)",
                    }}
                  >
                    {category.description}
                  </span>
                )}
              </span>
              {checked && (
                <Check
                  className="h-4 w-4 shrink-0"
                  style={{ color: "rgb(var(--brand-primary))" }}
                />
              )}
            </button>
          );
        })}
      </div>
    );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
        <DialogContent className="w-[min(92vw,760px)] max-w-none gap-0 overflow-hidden rounded-3xl border border-[rgb(229_231_235)] bg-app p-0">
          <DialogHeader className="border-b border-[rgb(229_231_235)] px-6 py-5 text-left">
            <DialogTitle
              style={{
                color: "rgb(var(--color-text))",
                fontSize: "var(--text-lg)",
              }}
            >
              {title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Select a post {title.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[min(68svh,560px)] overflow-y-auto px-6 py-4">
            {pickerList}
          </div>

          <DialogFooter className="border-t border-[rgb(229_231_235)] px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>

      {/* svh, not vh: with viewport-fit=cover an installed PWA counts the area
          behind the status bar and the gesture bar in `vh`, which pushed the
          footer under the system nav where taps never reach the page. */}
      <DrawerContent
        className="flex max-h-[85svh] flex-col border-default bg-app"
        style={{ borderColor: "rgb(var(--color-border))" }}
      >
        <DrawerHeader className="shrink-0 px-5 text-left">
          <DrawerTitle
            style={{
              color: "rgb(var(--color-text))",
              fontSize: "var(--text-lg)",
            }}
          >
            {title}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Select a post {title.toLowerCase()}.
          </DrawerDescription>
        </DrawerHeader>

        {/* `data-vaul-no-drag` is vaul's escape hatch: without it vaul treats a
            press inside the list as the start of a drawer drag, the drawer
            nudges and springs back, and the browser cancels the click that was
            about to select a category. */}
        <div
          data-vaul-no-drag
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5"
        >
          {pickerList}
        </div>

        <DrawerFooter
          data-vaul-no-drag
          className="shrink-0 px-5"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Done
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
