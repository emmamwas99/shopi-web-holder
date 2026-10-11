"use client";

import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Compass, X } from "lucide-react";

export type DashboardTourStepId =
  | "overview"
  | "growth"
  | "listings"
  | "create-listing"
  | "bulk-menu"
  | "bulk-workflow"
  | "drafts"
  | "audience";

export interface DashboardTourStep {
  id: DashboardTourStepId;
  tab: string;
  target: string;
  title: string;
  description: string;
}

const TOUR_STEPS: DashboardTourStep[] = [
  {
    id: "overview",
    tab: "overview",
    target: "dashboard-tour-overview",
    title: "Your shop at a glance",
    description: "Start here for a quick summary of active listings, views, saves, and the categories you sell in.",
  },
  {
    id: "growth",
    tab: "overview",
    target: "dashboard-tour-growth",
    title: "Track shop growth",
    description: "Compare daily views and saves over the last 30 days to see when buyers are discovering and saving your listings.",
  },
  {
    id: "listings",
    tab: "listings",
    target: "dashboard-tour-listings-page",
    title: "Manage your listings",
    description: "Open My listings to review status, price, views, and saves, or edit and remove a listing.",
  },
  {
    id: "create-listing",
    tab: "listings",
    target: "dashboard-tour-create-listing",
    title: "Add a listing",
    description: "Use Post a listing for a single item or to open the bulk upload options.",
  },
  {
    id: "bulk-menu",
    tab: "listings",
    target: "dashboard-tour-bulk-upload",
    title: "Upload many listings at once",
    description: "Choose Bulk upload from Excel. The template only needs a title, optional description, price, and whether the price is negotiable. Set one location for the whole batch.",
  },
  {
    id: "bulk-workflow",
    tab: "listings",
    target: "dashboard-tour-listing-table",
    title: "Shopi Agent finishes the details",
    description: "After upload, add a photo or video for each new item. Shopi Agent fills in category and specs; review each listing and publish it from the bulk checklist.",
  },
  {
    id: "drafts",
    tab: "drafts",
    target: "dashboard-tour-drafts-page",
    title: "Pick up where you left off",
    description: "Drafts keep unfinished work and its media. Open a draft to continue editing, or publish a completed draft when you’re ready.",
  },
  {
    id: "audience",
    tab: "analytics",
    target: "dashboard-tour-audience-page",
    title: "Understand your audience",
    description: "Analytics, followers, and profile visitors are grouped under Audience. Messages, notifications, and account settings are lower in the sidebar.",
  },
];

const REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

const MY_DASHBOARD_TOUR_PROGRESS = gql`
  query MyDashboardTourProgress {
    myDashboardTourProgress {
      status
      step
      remindAt
    }
  }
` as TypedDocumentNode<MyDashboardTourProgressQuery, Record<string, never>>;

const SAVE_MY_DASHBOARD_TOUR_PROGRESS = gql`
  mutation SaveMyDashboardTourProgress($status: String!, $step: String, $remindAt: DateTimeISO) {
    saveMyDashboardTourProgress(status: $status, step: $step, remindAt: $remindAt) {
      status
      step
      remindAt
    }
  }
` as TypedDocumentNode<SaveMyDashboardTourProgressMutation, SaveMyDashboardTourProgressVariables>;

type DashboardTourProgressRecord = {
  status: "not_started" | "in_progress" | "completed" | "dismissed" | "snoozed";
  step: DashboardTourStepId | null;
  remindAt: string | null;
};

type MyDashboardTourProgressQuery = {
  myDashboardTourProgress: DashboardTourProgressRecord;
};

type SaveMyDashboardTourProgressMutation = {
  saveMyDashboardTourProgress: DashboardTourProgressRecord;
};

type SaveMyDashboardTourProgressVariables = {
  status: DashboardTourProgressRecord["status"];
  step: DashboardTourStepId | null;
  remindAt: string | null;
};

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  rootWidth: number;
  rootHeight: number;
};

export function DashboardTour({
  enabled,
  userId,
  onStepChange,
}: {
  enabled: boolean;
  userId: string | null;
  onStepChange: (step: DashboardTourStep | null) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const initializedUserRef = useRef<string | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const { data: progressData, loading: progressLoading, error: progressError } = useQuery(
    MY_DASHBOARD_TOUR_PROGRESS,
    { skip: !enabled || !userId, fetchPolicy: "network-only" },
  );
  const [saveProgress] = useMutation(
    SAVE_MY_DASHBOARD_TOUR_PROGRESS,
  );

  useEffect(() => {
    if (!enabled || !userId || progressLoading || (!progressData && !progressError)) return;
    if (initializedUserRef.current === userId) return;

    let progress = progressData?.myDashboardTourProgress;
    if (progress?.status === "not_started") {
      const legacyKey = `shopi:dashboard-tour:v1:${userId}`;
      try {
        const stored = window.localStorage.getItem(legacyKey);
        const legacy = stored
          ? JSON.parse(stored) as { status?: string; remindAt?: number }
          : null;
        if (
          legacy?.status === "dismissed" ||
          legacy?.status === "completed" ||
          legacy?.status === "snoozed"
        ) {
          const remindAt = typeof legacy.remindAt === "number"
            ? new Date(legacy.remindAt).toISOString()
            : null;
          progress = { status: legacy.status, step: null, remindAt } as DashboardTourProgressRecord;
          saveProgress({
            variables: { status: progress.status, step: null, remindAt },
          }).then(() => window.localStorage.removeItem(legacyKey)).catch(() => {});
        }
      } catch {
        // Ignore a malformed legacy browser record and use the server state.
      }
    }
    if (progress?.status === "dismissed" || progress?.status === "completed") {
      initializedUserRef.current = userId;
      return;
    }
    if (progress?.status === "snoozed" && progress.remindAt && Date.parse(progress.remindAt) > Date.now()) {
      initializedUserRef.current = userId;
      return;
    }

    const savedStepIndex = progress?.step
      ? TOUR_STEPS.findIndex((step) => step.id === progress.step)
      : -1;
    const frame = window.requestAnimationFrame(() => {
      if (initializedUserRef.current === userId) return;
      initializedUserRef.current = userId;
      if (savedStepIndex >= 0 && (progress?.status === "in_progress" || progress?.status === "snoozed")) {
        setStepIndex(savedStepIndex);
        onStepChange(TOUR_STEPS[savedStepIndex]);
        if (progress?.status === "snoozed") {
          saveProgress({
            variables: { status: "in_progress", step: TOUR_STEPS[savedStepIndex].id, remindAt: null },
          }).catch(() => {});
        }
      }
      setVisible(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [enabled, userId, progressLoading, progressData, progressError, onStepChange, saveProgress]);

  const activeStep = stepIndex === null ? null : TOUR_STEPS[stepIndex] ?? null;

  useEffect(() => {
    if (!visible || !activeStep) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let retryTimer = 0;
    let cleanupMeasure = () => {};

    const locateTarget = () => {
      if (cancelled) return;
      const element = document.querySelector<HTMLElement>(
        `[data-dashboard-tour="${activeStep.target}"]`,
      );
      if (!element) {
        attempts += 1;
        if (attempts < 30) retryTimer = window.setTimeout(locateTarget, 80);
        return;
      }

      element.scrollIntoView({ block: "nearest", inline: "nearest" });
      const measure = () => {
        if (cancelled) return;
        const rootRect = rootRef.current?.getBoundingClientRect();
        if (!rootRect) return;
        const rect = element.getBoundingClientRect();
        setTargetRect({
          top: rect.top - rootRect.top,
          left: rect.left - rootRect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom - rootRect.top,
          rootWidth: rootRect.width,
          rootHeight: rootRect.height,
        });
      };
      window.requestAnimationFrame(measure);
      window.addEventListener("resize", measure);
      window.addEventListener("scroll", measure, true);
      cleanupMeasure = () => {
        window.removeEventListener("resize", measure);
        window.removeEventListener("scroll", measure, true);
      };
    };

    locateTarget();
    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      cleanupMeasure();
    };
  }, [activeStep, visible]);

  const persistProgress = (
    status: SaveMyDashboardTourProgressVariables["status"],
    step: DashboardTourStepId | null,
    remindAt: string | null = null,
  ) => {
    if (!userId) return;
    saveQueueRef.current = saveQueueRef.current
      .then(() => saveProgress({ variables: { status, step, remindAt } }))
      .then(() => undefined)
      .catch(() => undefined);
  };

  const stopTour = () => {
    setVisible(false);
    setStepIndex(null);
    onStepChange(null);
  };

  const remindLater = () => {
    persistProgress(
      "snoozed",
      activeStep?.id ?? null,
      new Date(Date.now() + REMIND_AFTER_MS).toISOString(),
    );
    stopTour();
  };

  const dismissPermanently = () => {
    persistProgress("dismissed", activeStep?.id ?? null);
    stopTour();
  };

  const finishTour = () => {
    persistProgress("completed", activeStep?.id ?? "audience");
    stopTour();
  };

  const startTour = () => {
    setStepIndex(0);
    onStepChange(TOUR_STEPS[0]);
    persistProgress("in_progress", TOUR_STEPS[0].id);
  };

  const goToStep = (index: number) => {
    if (index >= TOUR_STEPS.length) {
      finishTour();
      return;
    }
    setTargetRect(null);
    const boundedIndex = Math.max(0, index);
    setStepIndex(boundedIndex);
    onStepChange(TOUR_STEPS[boundedIndex]);
    persistProgress("in_progress", TOUR_STEPS[boundedIndex].id);
  };

  const tooltipStyle = useMemo(() => {
    if (!targetRect) return undefined;
    const width = Math.min(360, targetRect.rootWidth - 32);
    const left = Math.max(16, Math.min(targetRect.left, targetRect.rootWidth - width - 16));
    const estimatedHeight = 270;
    const below = targetRect.bottom + 16;
    const top = below + estimatedHeight < targetRect.rootHeight
      ? below
      : Math.max(16, targetRect.top - estimatedHeight - 16);
    return { top, left, width };
  }, [targetRect]);

  if (!enabled || !visible) return null;

  return (
    <div ref={rootRef} className="absolute inset-0 z-[100]" aria-live="polite">
      {activeStep && targetRect ? (
        <div
          className="pointer-events-none absolute rounded-2xl border-2 border-primary shadow-[0_0_0_9999px_rgba(15,18,30,0.62)] transition-all duration-200"
          style={{
            top: targetRect.top - 7,
            left: targetRect.left - 7,
            width: targetRect.width + 14,
            height: targetRect.height + 14,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/55" />
      )}

      {activeStep ? (
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-tour-title"
          className="absolute z-[101] rounded-2xl border border-border bg-elevated p-5 text-main shadow-2xl"
          style={tooltipStyle ?? { left: "50%", bottom: 24, width: "min(360px, calc(100% - 32px))", transform: "translateX(-50%)" }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
              Dashboard tour · {stepIndex! + 1} of {TOUR_STEPS.length}
            </span>
            <button type="button" onClick={remindLater} className="rounded-full p-1 text-muted hover:bg-surface hover:text-main" aria-label="Remind me later">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="mb-3 flex gap-1" aria-hidden>
            {TOUR_STEPS.map((step, index) => (
              <span key={step.id} className={`h-1 flex-1 rounded-full ${index <= stepIndex! ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>
          <h2 id="dashboard-tour-title" className="text-lg font-extrabold tracking-tight">{activeStep.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{activeStep.description}</p>
          <div className="mt-5 flex items-center justify-between gap-2">
            <button type="button" onClick={remindLater} className="text-xs font-semibold text-muted underline-offset-4 hover:text-main hover:underline">Remind me later</button>
            <div className="flex items-center gap-2">
              {stepIndex! > 0 && (
                <button type="button" onClick={() => goToStep(stepIndex! - 1)} className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-xs font-bold hover:bg-surface">
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Back
                </button>
              )}
              {stepIndex! === TOUR_STEPS.length - 1 ? (
                <button type="button" onClick={finishTour} className="inline-flex h-9 items-center gap-1 rounded-xl bg-primary px-4 text-xs font-bold text-white hover:opacity-90">Finish tour</button>
              ) : (
                <button type="button" onClick={() => goToStep(stepIndex! + 1)} className="inline-flex h-9 items-center gap-1 rounded-xl bg-primary px-4 text-xs font-bold text-white hover:opacity-90">
                  Next <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          </div>
          <button type="button" onClick={dismissPermanently} className="mt-4 w-full text-center text-[11px] font-medium text-muted hover:text-main">Don’t show this tour again</button>
        </section>
      ) : (
        <section role="dialog" aria-modal="true" aria-labelledby="dashboard-tour-welcome" className="absolute left-1/2 top-1/2 z-[101] w-[min(440px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-elevated p-6 text-center text-main shadow-2xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Compass className="h-6 w-6" aria-hidden /></div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Seller workspace guide</p>
          <h2 id="dashboard-tour-welcome" className="mt-2 text-xl font-extrabold tracking-tight">Take a quick dashboard tour?</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">See where to manage listings, track your audience, and use the agent-powered bulk upload.</p>
          <button type="button" onClick={startTour} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:opacity-90">Start 8-step tour <ChevronRight className="h-4 w-4" aria-hidden /></button>
          <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold">
            <button type="button" onClick={remindLater} className="text-muted hover:text-main">Remind me in 7 days</button>
            <button type="button" onClick={dismissPermanently} className="text-muted hover:text-main">Not needed · don’t show again</button>
          </div>
        </section>
      )}
    </div>
  );
}
