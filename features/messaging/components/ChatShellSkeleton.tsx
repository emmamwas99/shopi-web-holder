/**
 * The chat-detail shell with no data — header avatar/name placeholders, an empty
 * message area, and a composer row. Used both as the route's loading.tsx and as
 * an instant overlay the moment a chat is opened from a post, so opening a chat
 * never flashes a blank page during the route transition.
 */
export function ChatShellSkeleton() {
  return (
    <div className="flex h-full min-h-svh flex-col bg-app md:min-h-0 md:h-svh">
      {/* Header */}
      <div
        className="shrink-0 border-b px-4 pb-3"
        style={{
          borderColor: "rgb(var(--color-border))",
          backgroundColor: "rgb(var(--color-bg))",
          paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)",
        }}
      >
        <div className="flex items-center gap-3">
          {/* Back chevron placeholder (mobile only, matches ChatDetail) */}
          <div className="h-5 w-5 md:hidden" />

          <div className="h-10 w-10 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />

          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-28 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-1.5 h-2.5 w-16 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          </div>
        </div>
      </div>

      {/* Message area (empty while resolving — no spinner) */}
      <div className="flex-1 bg-subtle" />

      {/* Composer */}
      <div
        className="shrink-0 border-t px-4 pt-3"
        style={{
          borderColor: "rgb(var(--color-border))",
          backgroundColor: "rgb(var(--color-bg))",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
        }}
      >
        <div className="flex items-end gap-2">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
          <div className="h-10 flex-1 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}
