  "use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { ChevronLeft, Check, Home, Images, Clapperboard } from "lucide-react";
import { useCreateStore } from "@/stores/create";
import { CreateDraftDocument } from "@/types/__generated__/graphql";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TikTokIcon } from "@/components/ui/TikTokIcon";
import { CreateFlow } from "./CreateFlow";
import { CreatePreviewPanel } from "./CreatePreviewPanel";
import { TikTokPicker } from "./TikTokPicker";
import { CreateErrorDialog, createErrorMessage } from "./CreateErrorDialog";
import { useDraftRequestKeys } from "@/features/create/utils/draftRequestKeys";
import { SHOW_TIKTOK_CREATE_OPTIONS } from "@/features/create/utils/tiktokAvailability";
import { getSuspendedAccountMessage } from "@/lib/apollo/suspended-account";
import { trackPostJourney } from "@/lib/analytics";
import { goBackOr } from "@/lib/useAppBack";

const STEPS = [
  { n: 1, label: "Choose type" },
  { n: 2, label: "Details" },
  { n: 3, label: "Publish" },
] as const;

/**
 * Desktop upload & sell experience — a single shadcn Dialog hosting the whole
 * create flow as a stepper (Choose type → Details → Publish), with a live post
 * preview on the right and a designed banner behind the dialog so the /upload
 * page never reads as a blank screen.
 *
 * Replaces the old parallel intercepting-route picker + the pseudo-dialog that
 * CreateFlow rendered at /upload/create. The entire flow stays on /upload: the
 * step lives in the create store (session-persisted), so a refresh resumes
 * where the user left off.
 */
export function DesktopCreateFlow({
  lang,
  embeddedInDashboard = false,
  onDashboardClose,
}: {
  lang: string;
  embeddedInDashboard?: boolean;
  onDashboardClose?: () => void;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  // TikTok import renders inline in this dialog (same surface as the other
  // types — no route hop). Local state: a refresh simply returns to the picker.
  const [tiktokOpen, setTiktokOpen] = useState(false);
  // Draft-creation failures (e.g. "Maximum active drafts reached") shown in a
  // dialog over this one.
  const [createError, setCreateError] = useState<string | null>(null);
  // Wait for the persisted store before trusting `step` — otherwise a refresh
  // mid-draft flashes the picker before jumping to the details step.
  const [hydrated, setHydrated] = useState(false);

  const {
    step,
    setCreationMode,
    setDraftId,
    setContentType,
    setStep,
    setError,
  } =
    useCreateStore();
  const [createDraft] = useMutation(CreateDraftDocument);
  const draftKeys = useDraftRequestKeys();

  useEffect(() => {
    if (useCreateStore.persist.hasHydrated()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration latch, same pattern as CreateFlow
      setHydrated(true);
      return;
    }
    return useCreateStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  const current = !hydrated || step === "pick" ? 1 : step === "options" ? 3 : 2;

  async function handlePickType(kind: "image" | "video") {
    if (creating) return;
    trackPostJourney("post_content_type_selected", { content_type: kind });
    setError(null);
    setCreating(true);
    try {
      const { data, error } = await createDraft({
        variables: {
          input: {
            type: kind === "video" ? "VIDEO" : "IMAGE",
            clientRequestId: draftKeys.get(kind),
          },
        },
      });
      if (error || !data?.createDraft)
        throw new Error(error?.message ?? "Failed to create draft");
      draftKeys.done(kind);
      setDraftId(data.createDraft.id);
      setContentType(kind);
      setStep("edit");
    } catch (err) {
      if (getSuspendedAccountMessage(err)) return;
      setCreateError(createErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  function goHome() {
    if (embeddedInDashboard) {
      if (step === "pick") setCreationMode(null);
      onDashboardClose?.();
      return;
    }
    // Keep the draft — it's autosaved and session-persisted, so coming back to
    // /upload resumes exactly where the user left off.
    if (step === "pick") setCreationMode(null);
    router.push(`/${lang}/for-you`);
  }

  function closeDialog() {
    if (embeddedInDashboard) {
      if (step === "pick") setCreationMode(null);
      onDashboardClose?.();
      return;
    }
    if (step === "pick") setCreationMode(null);
    goBackOr(router, `/${lang}/for-you`);
  }

  function handleBack() {
    if (current === 3) {
      setStep("edit");
      return;
    }
    if (current === 2) {
      // Same semantics as the mobile flow's Back: discard the in-progress
      // draft state so the picker doesn't immediately bounce forward again.
      useCreateStore.getState().reset();
      return;
    }
    if (tiktokOpen) {
      setTiktokOpen(false);
      return;
    }
    closeDialog();
  }

  /** Stepper clicks only navigate backwards, mirroring handleBack semantics. */
  function handleStepClick(n: number) {
    if (n >= current) return;
    if (n === 2) setStep("edit");
    if (n === 1) useCreateStore.getState().reset();
  }

  const pickOptions = [
    {
      label: "Video",
      description: "Share a short clip of what you're selling",
      icon: <Clapperboard size={26} />,
      onClick: () => handlePickType("video"),
    },
    {
      label: "Photos",
      description: "Up to 10 images of your item",
      icon: <Images size={26} />,
      onClick: () => handlePickType("image"),
    },
    {
      label: "TikTok Import",
      description: "Bring a video from your TikTok",
      icon: <TikTokIcon size={26} className="" />,
      // Inline in this dialog, like the other types — no route hop.
      onClick: () => setTiktokOpen(true),
      hidden: !SHOW_TIKTOK_CREATE_OPTIONS,
    },
  ];

  const flowContent = (
    <>
          {/* ── Header: back · stepper · home ── */}
          <div
            className="flex shrink-0 items-center gap-3 border-b px-5"
            style={{
              height: 60,
              borderColor: "rgb(var(--color-border))",
            }}
          >
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <ChevronLeft size={22} />
            </button>

            {/* Stepper */}
            <div className="flex flex-1 items-center justify-center gap-2">
              {STEPS.map((s, i) => {
                const done = s.n < current;
                const active = s.n === current;
                return (
                  <div key={s.n} className="flex items-center gap-2">
                    {i > 0 && (
                      <span
                        className="hidden h-px w-8 lg:block"
                        style={{
                          backgroundColor: done
                            ? "rgb(var(--brand-primary))"
                            : "rgb(var(--color-border))",
                        }}
                      />
                    )}
                    <button
                      onClick={() => handleStepClick(s.n)}
                      disabled={s.n >= current}
                      className="flex items-center gap-2 disabled:cursor-default"
                      aria-current={active ? "step" : undefined}
                    >
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full font-bold transition-colors"
                        style={{
                          fontSize: "var(--text-xs)",
                          backgroundColor:
                            active || done
                              ? "rgb(var(--brand-primary))"
                              : "rgb(var(--color-bg-subtle))",
                          border:
                            active || done
                              ? "none"
                              : "1px solid rgb(var(--color-border))",
                          color:
                            active || done
                              ? "white"
                              : "rgb(var(--color-text-muted))",
                        }}
                      >
                        {done ? <Check size={13} /> : s.n}
                      </span>
                      <span
                        className="hidden font-semibold md:block"
                        style={{
                          fontSize: "var(--text-sm)",
                          color: active
                            ? "rgb(var(--color-text))"
                            : "rgb(var(--color-text-muted))",
                        }}
                      >
                        {s.label}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={goHome}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors hover:bg-surface ${embeddedInDashboard ? "" : "mr-9"}`}
              style={{
                fontSize: "var(--text-sm)",
                color: "rgb(var(--color-text-muted))",
              }}
            >
              {embeddedInDashboard ? <ChevronLeft size={16} /> : <Home size={16} />}
              {embeddedInDashboard ? "Dashboard" : "Home"}
            </button>
          </div>

          {/* ── Body: step content + live preview ── */}
          <div className="flex min-h-0 flex-1">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {!hydrated ? (
                <div className="flex flex-1 items-center justify-center">
                  <InterlockingBalls size={32} />
                </div>
              ) : step === "pick" && tiktokOpen ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="shrink-0 px-6 pt-5 pb-1">
                    <h2
                      className="font-bold"
                      style={{
                        fontSize: "var(--text-lg)",
                        color: "rgb(var(--color-text))",
                      }}
                    >
                      Add from TikTok
                    </h2>
                    <p
                      className="mt-0.5"
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "rgb(var(--color-text-muted))",
                      }}
                    >
                      Paste a TikTok link, or reuse a video you&apos;ve
                      already saved.
                    </p>
                  </div>
                  <TikTokPicker
                    lang={lang}
                    // The store is already on the edit step; just close the
                    // inline picker so the dialog shows the details form.
                    onUsed={() => setTiktokOpen(false)}
                    // Route draft-creation failures (e.g. "Maximum active
                    // drafts reached") through the same dialog as the other
                    // create-flow entry points, instead of an inline banner.
                    onError={(message) => setCreateError(message)}
                  />
                </div>
              ) : step === "pick" ? (
                <div className="flex flex-1 flex-col justify-center gap-6 overflow-y-auto px-10 py-8">
                  <div>
                    <h2
                      className="font-bold"
                      style={{
                        fontSize: "var(--text-xl)",
                        color: "rgb(var(--color-text))",
                      }}
                    >
                      What are you posting today?
                    </h2>
                    <p
                      className="mt-1"
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "rgb(var(--color-text-muted))",
                      }}
                    >
                      Pick a format — our AI helps write the title, description
                      and price from your media.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {pickOptions.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={opt.onClick}
                        disabled={creating}
                        className={`group ${opt.hidden ? "flex" : "flex"} flex-col items-center gap-3 rounded-2xl px-4 py-8 text-center transition-all hover:-translate-y-0.5 disabled:opacity-50`}
                        style={{
                          backgroundColor: "rgb(var(--color-bg-elevated))",
                          border: "1px solid rgb(var(--color-border))",
                        }}
                      >
                        <span
                          className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
                          style={{
                            backgroundColor: "rgb(var(--brand-primary) / 0.1)",
                            color: "rgb(var(--brand-primary))",
                          }}
                        >
                          {opt.icon}
                        </span>
                        <span
                          className="font-semibold"
                          style={{
                            fontSize: "var(--text-base)",
                            color: "rgb(var(--color-text))",
                          }}
                        >
                          {opt.label}
                        </span>
                        <span
                          style={{
                            fontSize: "var(--text-sm)",
                            color: "rgb(var(--color-text-muted))",
                          }}
                        >
                          {opt.description}
                        </span>
                      </button>
                    ))}
                  </div>

                  {creating && (
                    <p
                      className="flex items-center gap-2"
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "rgb(var(--color-text-muted))",
                      }}
                    >
                      <InterlockingBalls size={16} />
                      Setting up your draft…
                    </p>
                  )}
                </div>
              ) : (
                <CreateFlow
                  lang={lang}
                  embedded
                  onExit={embeddedInDashboard ? onDashboardClose : undefined}
                />
              )}
            </div>

            {/* Live preview rail */}
            <aside
              className="hidden w-85 shrink-0 items-start justify-center overflow-y-auto border-l px-6 py-8 lg:flex"
              style={{
                borderColor: "rgb(var(--color-border))",
                backgroundColor: "rgb(var(--color-bg-subtle))",
              }}
            >
              <CreatePreviewPanel />
            </aside>
          </div>
    </>
  );

  if (embeddedInDashboard) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-app">
        <CreateErrorDialog
          message={createError}
          onClose={() => setCreateError(null)}
        />
        {flowContent}
      </div>
    );
  }

  return (
    <>
      <CreateBanner />
      <CreateErrorDialog
        message={createError}
        onClose={() => setCreateError(null)}
      />
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="flex h-[min(92vh,800px)] w-[min(96vw,1120px)] max-w-none flex-col gap-0 overflow-hidden rounded-3xl border border-default bg-app p-0">
          <DialogTitle className="sr-only">Upload & sell</DialogTitle>
          <DialogDescription className="sr-only">
            Create a new post in three steps: choose a type, add details, then
            publish.
          </DialogDescription>
          {flowContent}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Quiet backdrop behind the create dialog. Shared with the create-mode chooser
 * so both desktop entry surfaces feel like the same flow.
 */
export function CreateBanner() {
  return (
    <div
      className="relative hidden min-h-svh overflow-hidden bg-app md:block"
      aria-hidden
    >
      <div className="absolute inset-x-0 top-8 flex flex-col items-center gap-1 text-center">
        <p
          className="font-semibold"
          style={{
            fontSize: "var(--text-lg)",
            color: "rgb(var(--color-text))",
          }}
        >
          Turn your stuff into sales
        </p>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "rgb(var(--color-text-muted))",
          }}
        >
          Snap it, describe it, post it.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-3">
        {[
          "AI writes your listing",
          "Reach nearby buyers",
          "Post to TikTok too",
        ].map((tip) => (
          <span
            key={tip}
            className="rounded-full px-3 py-1 font-medium"
            style={{
              fontSize: "var(--text-xs)",
              backgroundColor: "rgb(var(--color-bg-subtle))",
              border: "1px solid rgb(var(--color-border))",
              color: "rgb(var(--color-text-muted))",
            }}
          >
            {tip}
          </span>
        ))}
      </div>
    </div>
  );
}
