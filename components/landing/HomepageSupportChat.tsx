"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { LockKeyhole, X } from "lucide-react";
import { TeamAvatar } from "@/features/team-messages/components/TeamAvatar";
import { useAuthSession } from "@/hooks/useAuthSession";
import { SupportChatButton } from "./SupportChatButton";

const OPEN_SUPPORT_CHAT_KEY = "shopi-open-home-support-chat";

const ApolloWrapper = dynamic(
  () => import("@/lib/apollo/ApolloWrapper").then((module) => module.ApolloWrapper),
  { ssr: false },
);

const AuthenticatedSupportChat = dynamic(
  () =>
    import("./AuthenticatedHomepageSupportChat").then(
      (module) => module.AuthenticatedHomepageSupportChat,
    ),
  { ssr: false },
);

function SignInPrompt({
  lang,
  onClose,
}: {
  lang: string;
  onClose: () => void;
}) {
  const router = useRouter();

  function continueToSignIn() {
    sessionStorage.setItem(OPEN_SUPPORT_CHAT_KEY, "1");
    router.push(
      `/${lang}/auth/auth-welcome?from=${encodeURIComponent(`/${lang}`)}`,
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-app" aria-label="Shopi support">
      <header className="flex items-center gap-3 border-b border-default px-4 py-3">
        <TeamAvatar size={38} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-main">Shopi support</h2>
          <p className="mt-0.5 text-xs text-muted">We’re here to help</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close support chat"
          className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-main"
        >
          <X size={18} />
        </button>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LockKeyhole size={19} aria-hidden />
        </span>
        <h3 className="mt-4 text-base font-semibold text-main">Sign in to chat with us</h3>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
          Your messages stay in your Shopi support thread, where our team can reply.
        </p>
        <button
          type="button"
          onClick={continueToSignIn}
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Sign in or create account
        </button>
      </div>
    </section>
  );
}

export function HomepageSupportChat({ lang }: { lang: string }) {
  const { hydrated, isAuthenticated } = useAuthSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(OPEN_SUPPORT_CHAT_KEY) === "1") {
      sessionStorage.removeItem(OPEN_SUPPORT_CHAT_KEY);
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (hydrated && isAuthenticated) {
    return (
      <ApolloWrapper>
        <AuthenticatedSupportChat
          lang={lang}
          open={open}
          setOpen={setOpen}
        />
      </ApolloWrapper>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {open ? (
        <div
          role="dialog"
          aria-label="Shopi support chat"
          className="h-[min(38rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-elevated shadow-2xl"
        >
          <SignInPrompt lang={lang} onClose={() => setOpen(false)} />
        </div>
      ) : null}
      <SupportChatButton open={open} onClick={() => setOpen(!open)} />
    </div>
  );
}
