"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import {
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Images,
  Music2,
  PenLine,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { useCreateStore } from "@/stores/create";
import { useUiStore } from "@/stores/ui";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { CreateDraftDocument } from "@/types/__generated__/graphql";
import { DesktopCreateFlow, CreateBanner } from "./DesktopCreateFlow";
import { CreateFlow } from "./CreateFlow";
import { TikTokPicker } from "./TikTokPicker";
import { CreateErrorDialog, createErrorMessage } from "./CreateErrorDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SHOW_TIKTOK_CREATE_OPTIONS } from "@/features/create/utils/tiktokAvailability";
import { getSuspendedAccountMessage } from "@/lib/apollo/suspended-account";
import { trackPostJourney } from "@/lib/analytics";
import { goBackOr } from "@/lib/useAppBack";

/**
 * /upload - the "Upload & sell" entry point.
 *
 * Desktop (>= md): the whole create flow lives here in a shadcn Dialog with a
 * stepper and a live post preview (DesktopCreateFlow); no route hops.
 *
 * Mobile: manual creation has a shareable route of its own. It shows the media
 * picker until a draft exists, then mounts the full-page editor on this route.
 */
export function UploadPickerPage({
  lang,
  manualRoute = false,
}: {
  lang: string;
  manualRoute?: boolean;
}) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<"pick" | "tiktok">("pick");
  const [createError, setCreateError] = useState<string | null>(null);

  const {
    creationMode,
    setCreationMode,
    setDraftId,
    setContentType,
    setStep,
    setError,
    draftId,
    draftPending,
    step,
  } = useCreateStore();
  const [createDraft] = useMutation(CreateDraftDocument);

  useEffect(() => {
    if (useCreateStore.persist.hasHydrated()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot external-store hydration latch
      setStoreHydrated(true);
      return;
    }
    return useCreateStore.persist.onFinishHydration(() =>
      setStoreHydrated(true),
    );
  }, []);

  useEffect(() => {
    if (!storeHydrated || manualRoute) return;
    trackPostJourney("post_flow_started", { surface: "upload_picker" });
  }, [manualRoute, storeHydrated]);

  const hasActiveDraft = !!draftId && step !== "pick";
  const showingManual =
    manualRoute ||
    (hasActiveDraft && creationMode !== "ai" && creationMode !== "choose");

  useEffect(() => {
    if (storeHydrated && hasActiveDraft && creationMode === "ai") {
      router.replace(`/${lang}/upload/create-ai`);
      return;
    }
    if (storeHydrated && manualRoute && creationMode !== "manual") {
      setCreationMode("manual");
    }
  }, [creationMode, hasActiveDraft, lang, manualRoute, router, setCreationMode, storeHydrated]);

  useEffect(() => {
    if (
      showingManual &&
      !manualRoute &&
      isDesktop === false &&
      view === "pick" &&
      draftId &&
      step !== "pick"
    ) {
      router.replace(`/${lang}/upload/create-manual`);
    }
  }, [isDesktop, view, draftId, step, lang, manualRoute, router, showingManual]);

  if (isDesktop === null || !storeHydrated) return null;

  if (hasActiveDraft && creationMode === "ai") return null;

  if (manualRoute && (hasActiveDraft || draftPending)) {
    return isDesktop ? <DesktopCreateFlow lang={lang} /> : <CreateFlow lang={lang} />;
  }

  if (!showingManual) {
    return (
      <CreationModeChooser
        lang={lang}
        isDesktop={isDesktop}
        onManual={() => {
          trackPostJourney("post_method_selected", { method: "manual" });
          setCreationMode("manual");
          router.push(`/${lang}/upload/create-manual`);
        }}
        onAgent={() => {
          trackPostJourney("post_method_selected", { method: "ai_agent" });
          setCreationMode("ai");
          router.push(`/${lang}/upload/create-ai`);
        }}
        onBulkUpload={() => {
          router.push(`/${lang}/dashboard?tab=listings&bulk=1`);
        }}
      />
    );
  }

  if (isDesktop) return <DesktopCreateFlow lang={lang} />;

  async function handlePickType(kind: "image" | "video") {
    if (creating) return;
    trackPostJourney("post_content_type_selected", { content_type: kind });
    setError(null);
    setCreating(true);
    try {
      const { data, error } = await createDraft({
        variables: { input: { type: kind === "video" ? "VIDEO" : "IMAGE" } },
      });
      if (error || !data?.createDraft)
        throw new Error(error?.message ?? "Failed to create draft");
      setDraftId(data.createDraft.id);
      setContentType(kind);
      setStep("edit");
      if (!manualRoute) router.push(`/${lang}/upload/create-manual`);
    } catch (err) {
      if (getSuspendedAccountMessage(err)) {
        setCreating(false);
        return;
      }
      setCreateError(createErrorMessage(err));
      setCreating(false);
    }
  }

  function closePicker() {
    goBackOr(router, `/${lang}/for-you`);
  }

  const options = [
    {
      label: "Video",
      description: "Start with one short product clip.",
      icon: Video,
      onClick: () => handlePickType("video"),
    },
    {
      label: "Photos",
      description: "Add up to 10 clear item photos.",
      icon: Images,
      onClick: () => handlePickType("image"),
    },
    {
      label: "TikTok Import",
      description: "Reuse a video you already posted.",
      icon: Music2,
      onClick: () => setView("tiktok"),
      hidden: !SHOW_TIKTOK_CREATE_OPTIONS,
    },
  ];

  if (view === "tiktok") {
    return (
      <div className="fixed inset-0 z-60 flex flex-col overflow-hidden bg-app">
        <CreateErrorDialog
          message={createError}
          onClose={() => setCreateError(null)}
        />
        <header className="shrink-0 border-b border-border bg-app ">
          <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-3 px-4">
            <button
              onClick={() => setView("pick")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground"
              aria-label="Back"
            >
              <ChevronLeft size={22} />
            </button>
            <h1 className="text-base font-semibold text-foreground">
              Add from TikTok
            </h1>
          </div>
        </header>
        <TikTokPicker
          lang={lang}
          onUsed={() => {
            if (!manualRoute) router.push(`/${lang}/upload/create-manual`);
          }}
          onError={(message) => setCreateError(message)}
        />
      </div>
    );
  }

  return (
    <div className="create-flow-card flex min-h-svh flex-col bg-app">
      <CreateErrorDialog
        message={createError}
        onClose={() => setCreateError(null)}
      />
      <header className="shrink-0 border-b border-border bg-app ">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-3 px-4">
          <button
            onClick={closePicker}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground active:opacity-70"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-foreground">
              Choose media
            </h1>
            <p className="text-xs leading-tight text-muted">
              You can review everything before posting.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-8 pt-7">
        <div className="mb-5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Add photos or a video
          </h2>
          <p className="mt-1 text-sm text-muted">
            Choose the media that best shows your item.
          </p>
        </div>

        <div className="grid gap-3">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.label}
                onClick={opt.onClick}
                disabled={creating}
                className={`${opt.hidden ? "hidden" : "flex"} min-h-[82px] w-full items-center gap-3 rounded-2xl border border-border bg-elevated px-4 py-4 text-left transition-[border-color,background-color] hover:border-primary/35 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:bg-primary/5 disabled:opacity-50`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={19} strokeWidth={2.1} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-foreground">
                    {opt.label}
                  </span>
                  <span className="mt-1 block text-[13px] leading-5 text-muted">
                    {opt.description}
                  </span>
                </span>

                <ChevronRight className="shrink-0 text-muted" size={18} aria-hidden />
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

type CreationModeKey = "agent" | "manual" | "bulk";

const CREATION_MODES = [
  {
    key: "agent" as const,
    label: "Shopi Agent",
    icon: Bot,
    recommended: true,
    description: "Get help with your title, category, and item details.",
  },
  {
    key: "manual" as const,
    label: "Manual",
    icon: PenLine,
    recommended: false,
    description: "Add the listing details yourself, step by step.",
  },
  {
    key: "bulk" as const,
    label: "Bulk upload",
    icon: FileSpreadsheet,
    recommended: false,
    description: "Upload multiple listings from an Excel spreadsheet.",
  },
];

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
        selected ? "border-primary bg-primary" : "border-border bg-elevated"
      }`}
    >
      {selected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
    </span>
  );
}

function CreationModeChooser({
  lang,
  isDesktop,
  onManual,
  onAgent,
  onBulkUpload,
}: {
  lang: string;
  isDesktop: boolean;
  onManual: () => void;
  onAgent: () => void;
  onBulkUpload: () => void;
}) {
  const router = useRouter();
  const setBottomNavHidden = useUiStore((s) => s.setBottomNavHidden);
  const [selected, setSelected] = useState<CreationModeKey>("agent");

  useLayoutEffect(() => {
    setBottomNavHidden(true);
    return () => setBottomNavHidden(false);
  }, [setBottomNavHidden]);

  function close() {
    router.replace(`/${lang}/for-you`);
  }

  function handleContinue() {
    if (selected === "agent") onAgent();
    else if (selected === "manual") onManual();
    else if (isDesktop) onBulkUpload();
  }

  const modeCards = (
    <div
      role="radiogroup"
      aria-label="How would you like to create your listing?"
      className="grid gap-3"
    >
      {CREATION_MODES.map((mode) => {
        const isSelected = selected === mode.key;
        const Icon = mode.icon;
        return (
          <button
            key={mode.key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-disabled={mode.key === "bulk" && !isDesktop}
            disabled={mode.key === "bulk" && !isDesktop}
            onClick={() => setSelected(mode.key)}
            className={`flex min-h-[88px] w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left outline-none transition-[border-color,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed ${
              mode.key === "bulk" && !isDesktop
                ? "border-border bg-surface/70"
                : isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-elevated hover:border-primary/35 hover:bg-surface"
            }`}
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
            >
              <Icon size={19} strokeWidth={2.1} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-semibold text-foreground">
                  {mode.label}
                </span>
                {mode.recommended ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <Sparkles size={11} /> Recommended
                  </span>
                ) : mode.key === "bulk" ? (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">
                    Desktop only
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-[13px] leading-5 text-muted">
                {mode.key === "bulk" && !isDesktop
                  ? "Use a computer to upload multiple listings from Excel."
                  : mode.key === "bulk"
                    ? "Upload an Excel file. Shopi Agent fills in categories and product specs."
                    : mode.description}
              </span>
            </span>

            {mode.key === "bulk" && !isDesktop ? (
              <span className="shrink-0 text-xs font-semibold text-muted">Unavailable</span>
            ) : (
              <RadioDot selected={isSelected} />
            )}
          </button>
        );
      })}
    </div>
  );

  const continueButton = (
    <button
      type="button"
      onClick={handleContinue}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.99]"
    >
      Continue
    </button>
  );

  if (isDesktop) {
    return (
      <>
        <CreateBanner />
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) close();
          }}
        >
          <DialogContent className="w-[min(94vw,440px)] max-w-none gap-0 overflow-hidden rounded-xl border border-default bg-app p-0 shadow-xl">
            <DialogTitle className="sr-only">Create a listing</DialogTitle>
            <DialogDescription className="sr-only">
              Choose how you&apos;d like to create your listing.
            </DialogDescription>

            <div className="px-6 pb-6 pt-7">
              <div className="pr-8">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Create a listing
                </h1>
                <p className="mt-1.5 text-sm text-muted">
                  Choose how you&apos;d like to get started.
                </p>
              </div>

              <div className="mt-6">{modeCards}</div>
              <div className="mt-6">{continueButton}</div>

              <p className="mt-3 text-center text-xs text-muted">
                Your listing only goes live after you confirm it.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b border-border bg-elevated">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center px-4 md:px-6">
          <button
            type="button"
            onClick={close}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground"
            aria-label="Close create"
          >
            <X size={20} />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-base font-semibold text-foreground">
              New listing
            </h1>
          </div>
          <span aria-hidden className="h-10 w-10 shrink-0" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-8 pt-7 md:px-6 md:py-10">
        <div className="mb-5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Create a listing
          </h1>
          <p className="mt-1 text-sm text-muted">
            Choose how you&apos;d like to get started.
          </p>
        </div>
        {modeCards}

        <p className="mt-4 px-1 text-xs text-muted">
          Your listing only goes live after you confirm it.
        </p>
      </main>

      <footer className="border-t border-border bg-elevated px-4 py-4 pb-[calc(1rem+var(--safe-bottom,0px))] md:px-6">
        <div className="mx-auto w-full max-w-2xl">{continueButton}</div>
      </footer>
    </div>
  );
}
