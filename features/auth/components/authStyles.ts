/**
 * Field and button styles shared by the auth forms.
 *
 * Phones get native-app controls: filled, borderless fields and pill buttons
 * (the same shape as Google's button above them). The desktop card keeps
 * outlined fields and rounded-rectangle buttons.
 *
 * Built from layered theme utilities only. `.bg-app`, `.bg-elevated` and
 * `.text-placeholder` are unlayered classes in globals.css, so a breakpoint
 * variant can't override them and `placeholder:text-placeholder` does nothing.
 */
export function authInputClass(hasError: boolean) {
  return [
    "h-12 w-full rounded-xl border bg-background px-4 text-base text-default outline-none transition-all",
    "placeholder:text-[rgb(var(--color-text-placeholder))]",
    "focus:border-primary focus:ring-2 focus:ring-primary/20",
    "max-lg:bg-subtle max-lg:focus:bg-background",
    hasError ? "border-error" : "border-border max-lg:border-transparent",
  ].join(" ");
}

export const authPrimaryButtonClass =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-60 max-lg:rounded-full";

/** The show/hide toggle inside a password field — a full 40px tap target. */
export const authPasswordToggleClass =
  "absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-opacity active:opacity-60";
