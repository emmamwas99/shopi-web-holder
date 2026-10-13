"use client";

import { MessageCircle, X } from "lucide-react";

export function SupportChatButton({
  open,
  unreadCount = 0,
  onClick,
}: {
  open: boolean;
  unreadCount?: number;
  onClick: () => void;
}) {
  const unreadLabel = `${unreadCount} unread support message${unreadCount === 1 ? "" : "s"}`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        open
          ? "Close support chat"
          : unreadCount
            ? `Talk to us, ${unreadLabel}`
            : "Talk to us"
      }
      aria-expanded={open}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <span className="relative inline-flex">
        {open ? (
          <X size={18} aria-hidden />
        ) : (
          <MessageCircle size={18} aria-hidden />
        )}
        {!open && unreadCount > 0 ? (
          <span className="absolute -right-3 -top-3 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-primary bg-white px-1 text-[10px] font-bold leading-none text-primary">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </span>
      {open ? "Close" : "Talk to us"}
    </button>
  );
}
