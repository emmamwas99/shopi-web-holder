"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  Check,
  CircleAlert,
  FileText,
  ImagePlus,
  MapPin,
  Navigation,
  RotateCcw,
  X,
} from "lucide-react";
import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";
import { LocationPickerDrawer } from "@/features/create/components/LocationPickerDrawer";
import type { DraftLocation } from "@/stores/create";
import { cn } from "@/lib/utils";
import { MAX_UPLOAD_BYTES, useShopVerificationActions } from "../hooks/useShopVerification";
import type {
  MyShopVerification,
  SaveShopVerificationInput,
  ShopVerificationDocument,
  ShopVerificationDocumentKind,
  ShopVerificationIssueDetail,
  ShopVerificationLocation,
  ShopVerificationLocationInput,
  ShopVerificationRequirement,
} from "../api";
import { ORDER, STEP_COPY } from "../copy";

const NAME_MAX = 120;
const ADDRESS_MAX = 200;
const AUTOSAVE_MS = 700;

function hasPin(location: ShopVerificationLocation | null): boolean {
  return typeof location?.latitude === "number" && typeof location?.longitude === "number";
}

function hasArea(location: ShopVerificationLocation | null): boolean {
  return Boolean(location && (location.placeName || location.subregion || location.county));
}

function toInput(location: ShopVerificationLocation | null, addressLine: string): ShopVerificationLocationInput {
  return {
    county: location?.county ?? null,
    subregion: location?.subregion ?? null,
    placeName: location?.placeName ?? null,
    formattedAddress: location?.formattedAddress ?? null,
    placeId: location?.placeId ?? null,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    addressLine: addressLine.trim() || null,
  };
}

function fromPicker(picked: DraftLocation): ShopVerificationLocation {
  return {
    placeName: picked.placeName || null,
    formattedAddress: picked.formattedAddress || null,
    placeId: picked.placeId || null,
    latitude: picked.latitude ?? null,
    longitude: picked.longitude ?? null,
    county: picked.county ?? null,
    subregion: picked.subregion ?? null,
  };
}

function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

// ── Step card ────────────────────────────────────────────────────────────────

function StepCard({
  index,
  requirement,
  done,
  issue,
  resolved,
  children,
}: {
  index: number;
  requirement: ShopVerificationRequirement;
  done: boolean;
  /** The reviewer's reason this part needs fixing, while the seller hasn't changed it. */
  issue?: ShopVerificationIssueDetail;
  resolved?: boolean;
  children: React.ReactNode;
}) {
  const copy = STEP_COPY[requirement];
  const flagged = Boolean(issue) && !resolved;
  return (
    <section
      aria-labelledby={`step-${requirement}`}
      className={cn(
        "rounded-2xl border bg-elevated p-4 md:p-5",
        flagged ? "border-rose-300 dark:border-rose-500/50" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
            done ? "bg-[#1D9BF0] text-white" : "bg-subtle text-main",
          )}
          aria-hidden
        >
          {done ? <Check size={13} strokeWidth={3} /> : index}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`step-${requirement}`} className="text-[15px] font-semibold leading-6 text-main">
            {copy.title}
            {done ? <span className="sr-only"> — done</span> : null}
          </h3>
          <p className="mt-0.5 text-[13px] leading-5 text-muted">{copy.hint}</p>
        </div>
      </div>

      {issue ? (
        <div
          className={cn(
            "mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13px] leading-5",
            resolved
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300",
          )}
        >
          {resolved ? (
            <Check size={15} strokeWidth={2.4} className="mt-0.5 shrink-0" aria-hidden />
          ) : (
            <CircleAlert size={15} strokeWidth={2.2} className="mt-0.5 shrink-0" aria-hidden />
          )}
          <p>
            {resolved ? (
              "Updated — we'll check it again when you resubmit."
            ) : (
              <>
                <span className="font-semibold">{issue.title}.</span> {issue.detail}
              </>
            )}
          </p>
        </div>
      ) : null}

      <div className="mt-4">{children}</div>
    </section>
  );
}

// ── Document field ───────────────────────────────────────────────────────────

type UploadState = { progress: number; preview: string | null; isPdf: boolean; name: string } | null;

function DocumentField({
  kind,
  document,
  disabled,
  onUploaded,
  onRemoved,
}: {
  kind: ShopVerificationDocumentKind;
  document?: ShopVerificationDocument | null;
  disabled?: boolean;
  onUploaded: () => void;
  onRemoved: () => void;
}) {
  const { upload, removeDocument, removing } = useShopVerificationActions();
  const [state, setState] = useState<UploadState>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const isPermit = kind === "PERMIT";
  const noun = isPermit ? "permit" : "shop photo";

  // Free the local preview when it's replaced or the field goes away.
  useEffect(() => () => {
    if (state?.preview) URL.revokeObjectURL(state.preview);
  }, [state?.preview]);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES * 2) {
      setError("That file is too large. Try a photo from your camera, or a smaller PDF.");
      return;
    }
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPermit && isPdf) {
      setError("Upload a photo of your shop — a PDF can't show us your storefront.");
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setPreviewFailed(false);
    setState({
      progress: 0,
      preview: isPdf ? null : URL.createObjectURL(file),
      isPdf,
      name: file.name,
    });
    try {
      await upload(kind, file, (progress) => setState((current) => (current ? { ...current, progress } : current)), controller.signal);
      onUploaded();
      setState(null);
    } catch (err) {
      setState(null);
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(errorMessage(err, "Upload failed. Please try again."));
    } finally {
      abortRef.current = null;
    }
  }

  async function handleRemove() {
    setError(null);
    try {
      await removeDocument({ variables: { kind } });
      onRemoved();
    } catch (err) {
      setError(errorMessage(err, `Could not remove the ${noun}.`));
    }
  }

  const pickers = (
    <>
      <input
        ref={pickRef}
        type="file"
        accept={isPermit ? "image/*,application/pdf" : "image/*"}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void handleFile(file);
        }}
      />
      {!isPermit ? (
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void handleFile(file);
          }}
        />
      ) : null}
    </>
  );

  // Uploading: the local copy with live progress, so the wait looks like work.
  if (state) {
    const percent = Math.round(state.progress * 100);
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border p-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-subtle">
          {state.preview ? (
            <img src={state.preview} alt="" className="h-full w-full object-cover opacity-70" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted">
              <FileText size={22} strokeWidth={1.7} aria-hidden />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-main">{state.name}</p>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={`Uploading ${noun}`}
          >
            <div className="h-full rounded-full bg-[#1D9BF0] transition-[width] duration-200" style={{ width: `${Math.max(4, percent)}%` }} />
          </div>
          <p className="mt-1 text-[12px] text-muted">{percent < 100 ? `Uploading… ${percent}%` : "Checking the file…"}</p>
        </div>
        <button
          type="button"
          onClick={() => abortRef.current?.abort()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-main"
          aria-label="Cancel upload"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>
    );
  }

  if (document) {
    const showImage = !document.isPdf && document.contentType.startsWith("image/") && document.url && !previewFailed;
    return (
      <div>
        {pickers}
        <div className="flex items-center gap-3 rounded-xl border border-border p-2.5">
          <a
            href={document.url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-subtle"
            aria-label={`View your ${noun}`}
          >
            {showImage ? (
              <img src={document.url} alt="" className="h-full w-full object-cover" onError={() => setPreviewFailed(true)} />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-muted">
                <FileText size={22} strokeWidth={1.7} aria-hidden />
              </span>
            )}
          </a>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-main">{document.fileName ?? (isPermit ? "Business permit" : "Shop photo")}</p>
            <p className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-[12px] text-muted">
              <Check size={13} strokeWidth={2.6} className="shrink-0 text-[#1D9BF0]" aria-hidden />
              Uploaded · {fileSize(document.sizeBytes)}
            </p>
          </div>
          {!disabled ? (
            <div className="flex shrink-0 items-center">
              {/* A phone's file chooser already offers the camera too. */}
              <button
                type="button"
                onClick={() => pickRef.current?.click()}
                className="h-9 rounded-full px-2.5 text-[13px] font-semibold text-main transition-colors hover:bg-subtle"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => void handleRemove()}
                disabled={removing}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-main disabled:opacity-50"
                aria-label={`Remove ${noun}`}
              >
                <X size={17} strokeWidth={2} />
              </button>
            </div>
          ) : null}
        </div>
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
    );
  }

  return (
    <div>
      {pickers}
      {isPermit ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => pickRef.current?.click()}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[rgb(var(--color-border-strong))] px-4 py-4 text-left transition-colors hover:bg-subtle active:bg-subtle disabled:opacity-50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-subtle text-main">
            <FileText size={19} strokeWidth={1.8} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-main">Upload your permit</span>
            <span className="block text-[12px] text-muted">Photo or PDF · up to 15 MB</span>
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
          {/* On a phone the camera is the honest way to show a real shop. */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[rgb(var(--color-border-strong))] px-3 py-4 text-center transition-colors hover:bg-subtle active:bg-subtle disabled:opacity-50 md:hidden"
          >
            <Camera size={20} strokeWidth={1.8} className="text-main" aria-hidden />
            <span className="text-[13px] font-semibold text-main">Take a photo</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => pickRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[rgb(var(--color-border-strong))] px-3 py-4 text-center transition-colors hover:bg-subtle active:bg-subtle disabled:opacity-50 md:flex-row md:justify-start md:gap-3 md:px-4 md:text-left"
          >
            <span className="flex md:h-10 md:w-10 md:shrink-0 md:items-center md:justify-center md:rounded-full md:bg-subtle">
              <ImagePlus size={20} strokeWidth={1.8} className="text-main" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-main md:text-[14px]">
                <span className="md:hidden">Choose photo</span>
                <span className="hidden md:inline">Upload a photo of your shop</span>
              </span>
              <span className="hidden text-[12px] text-muted md:block">JPG, PNG or HEIC · up to 15 MB</span>
            </span>
          </button>
        </div>
      )}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] leading-5 text-rose-600 dark:text-rose-400">
      <CircleAlert size={15} strokeWidth={2.2} className="mt-0.5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

// ── The form ─────────────────────────────────────────────────────────────────

/**
 * The application itself: four steps, each saved as the seller goes, so a
 * permit uploaded on the bus is still there at the shop. On a returned
 * application the reviewer's reasons sit on the step they're about, and turn
 * green once that step has been changed.
 */
export function VerificationForm({
  verification,
  embedded,
}: {
  verification: MyShopVerification;
  embedded?: boolean;
}) {
  const application = verification.application ?? null;
  const { saveDraft, submit, submitting } = useShopVerificationActions();

  const suggested = !application?.location && verification.suggestedLocation ? verification.suggestedLocation : null;
  const [businessName, setBusinessName] = useState(application?.businessName ?? "");
  const [location, setLocation] = useState<ShopVerificationLocation | null>(application?.location ?? suggested);
  const [addressLine, setAddressLine] = useState(application?.location?.addressLine ?? "");
  const [locationIsSuggestion, setLocationIsSuggestion] = useState(Boolean(suggested));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [changed, setChanged] = useState<Set<ShopVerificationRequirement>>(new Set());
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const status = application?.status;
  const issues = application?.issues ?? [];
  const issueFor = (requirement: ShopVerificationRequirement) => issues.find((issue) => issue.requirement === requirement);
  const generalIssues = issues.filter((issue) => !issue.requirement);

  useEffect(
    () => () => {
      if (nameTimer.current) clearTimeout(nameTimer.current);
      if (addressTimer.current) clearTimeout(addressTimer.current);
    },
    [],
  );

  const done: Record<ShopVerificationRequirement, boolean> = {
    BUSINESS_NAME: businessName.trim().length >= 2,
    PERMIT: Boolean(application?.permit),
    SHOP_PHOTO: Boolean(application?.shopPhoto),
    LOCATION: hasArea(location) && (hasPin(location) || addressLine.trim().length > 0),
  };
  const doneCount = ORDER.filter((requirement) => done[requirement]).length;
  const complete = doneCount === ORDER.length;

  function markChanged(requirement: ShopVerificationRequirement) {
    setChanged((current) => (current.has(requirement) ? current : new Set(current).add(requirement)));
  }

  async function save(input: SaveShopVerificationInput) {
    setSaveState("saving");
    try {
      await saveDraft({ variables: { input } });
      setSaveState("saved");
    } catch (err) {
      setSaveState("failed");
      toast.error(errorMessage(err, "We couldn't save that. Check your connection."));
    }
  }

  function handleNameChange(value: string) {
    setBusinessName(value);
    markChanged("BUSINESS_NAME");
    if (nameTimer.current) clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(() => void save({ businessName: value.trim() }), AUTOSAVE_MS);
  }

  function handlePicked(picked: DraftLocation) {
    const next = fromPicker(picked);
    setLocation(next);
    setLocationIsSuggestion(false);
    markChanged("LOCATION");
    void save({ location: toInput(next, addressLine) });
  }

  function handleAddressChange(value: string) {
    setAddressLine(value);
    markChanged("LOCATION");
    if (addressTimer.current) clearTimeout(addressTimer.current);
    addressTimer.current = setTimeout(() => void save({ location: toInput(location, value) }), AUTOSAVE_MS);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!complete || !confirmed || submitting) return;
    setSubmitError(null);
    if (nameTimer.current) clearTimeout(nameTimer.current);
    if (addressTimer.current) clearTimeout(addressTimer.current);
    try {
      await submit({
        variables: {
          input: {
            businessName: businessName.trim(),
            location: toInput(location, addressLine),
            confirmed: true,
          },
        },
      });
      toast.success("Sent for review. We'll let you know as soon as we're done.");
      topRef.current?.scrollIntoView({ block: "start" });
    } catch (err) {
      setSubmitError(errorMessage(err, "We couldn't submit your application. Please try again."));
    }
  }

  const placeTitle = location?.placeName || location?.subregion || location?.county || "";
  const placeRegion = [location?.subregion, location?.county].filter((part) => part && part !== placeTitle).join(", ");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div ref={topRef} className="scroll-mt-20" />

      {status === "REJECTED" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-main">
            <RotateCcw size={16} strokeWidth={2.2} aria-hidden />
            A few things need fixing
          </p>
          <p className="mt-1 text-[13px] leading-5 text-main">
            Change what&rsquo;s marked below and resubmit — everything else you sent is saved.
          </p>
          {generalIssues.length > 0 || application?.decisionNote ? (
            <div className="mt-2.5 flex flex-col gap-1.5 text-[13px] leading-5 text-main">
              {generalIssues.map((issue) => (
                <p key={issue.issue}>
                  <span className="font-semibold">{issue.title}.</span> {issue.detail}
                </p>
              ))}
              {application?.decisionNote ? (
                <p>
                  <span className="font-semibold">Note from our team:</span> {application.decisionNote}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : status === "REVOKED" ? (
        <div className="rounded-2xl border border-border bg-subtle p-4">
          <p className="text-[15px] font-semibold text-main">Your verification was removed</p>
          {application?.decisionNote ? (
            <p className="mt-1 text-[13px] leading-5 text-main">{application.decisionNote}</p>
          ) : null}
          <p className="mt-1 text-[13px] leading-5 text-muted">
            Check your details are up to date, then resubmit to get your blue tick back.
          </p>
        </div>
      ) : (
        <div>
          <h2 className="text-[18px] font-bold leading-6 text-main">Verify your shop</h2>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            We check these by hand. Your progress saves as you go.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3" aria-live="polite">
        <div className="flex flex-1 gap-1" aria-hidden>
          {ORDER.map((requirement) => (
            <span
              key={requirement}
              className={cn("h-1.5 flex-1 rounded-full transition-colors", done[requirement] ? "bg-[#1D9BF0]" : "bg-subtle")}
            />
          ))}
        </div>
        <span className="shrink-0 text-[12px] tabular-nums text-muted">
          {doneCount} of {ORDER.length} done
          {saveState === "saving" ? " · Saving…" : saveState === "saved" ? " · Saved" : ""}
        </span>
      </div>

      <StepCard
        index={1}
        requirement="BUSINESS_NAME"
        done={done.BUSINESS_NAME}
        issue={issueFor("BUSINESS_NAME")}
        resolved={changed.has("BUSINESS_NAME")}
      >
        <label htmlFor="business-name" className="sr-only">
          Business name
        </label>
        <input
          id="business-name"
          value={businessName}
          maxLength={NAME_MAX}
          autoComplete="organization"
          onChange={(event) => handleNameChange(event.target.value)}
          onBlur={() => {
            if (nameTimer.current) {
              clearTimeout(nameTimer.current);
              nameTimer.current = null;
              void save({ businessName: businessName.trim() });
            }
          }}
          placeholder="e.g. Wanjiku Fashions"
          className="h-12 w-full rounded-xl border border-border bg-app px-3.5 text-main outline-none transition-colors placeholder:text-[15px] focus:border-[#1D9BF0]"
        />
      </StepCard>

      <StepCard
        index={2}
        requirement="PERMIT"
        done={done.PERMIT}
        issue={issueFor("PERMIT")}
        resolved={changed.has("PERMIT")}
      >
        <DocumentField
          kind="PERMIT"
          document={application?.permit}
          onUploaded={() => markChanged("PERMIT")}
          onRemoved={() => markChanged("PERMIT")}
        />
      </StepCard>

      <StepCard
        index={3}
        requirement="SHOP_PHOTO"
        done={done.SHOP_PHOTO}
        issue={issueFor("SHOP_PHOTO")}
        resolved={changed.has("SHOP_PHOTO")}
      >
        <DocumentField
          kind="SHOP_PHOTO"
          document={application?.shopPhoto}
          onUploaded={() => markChanged("SHOP_PHOTO")}
          onRemoved={() => markChanged("SHOP_PHOTO")}
        />
      </StepCard>

      <StepCard
        index={4}
        requirement="LOCATION"
        done={done.LOCATION}
        issue={issueFor("LOCATION")}
        resolved={changed.has("LOCATION")}
      >
        {location && hasArea(location) ? (
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-subtle text-main">
              <MapPin size={18} strokeWidth={1.9} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-main">{placeTitle}</p>
              {placeRegion ? <p className="truncate text-[12px] text-muted">{placeRegion}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="h-9 shrink-0 rounded-full px-3 text-[13px] font-semibold text-main transition-colors hover:bg-subtle"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[rgb(var(--color-border-strong))] px-4 py-4 text-left transition-colors hover:bg-subtle active:bg-subtle"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-subtle text-main">
              <MapPin size={19} strokeWidth={1.8} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-main">Choose your shop&rsquo;s area</span>
              <span className="block text-[12px] text-muted">Use your current location or search</span>
            </span>
          </button>
        )}

        {location && hasArea(location) ? (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
            {hasPin(location) ? (
              <>
                <Navigation size={12} strokeWidth={2.2} className="text-[#1D9BF0]" aria-hidden />
                Map pin added
                {locationIsSuggestion
                  ? ` · from your ${verification.suggestedLocationSource === "PROFILE" ? "profile" : "latest listing"}`
                  : ""}
              </>
            ) : locationIsSuggestion ? (
              `From your ${verification.suggestedLocationSource === "PROFILE" ? "profile" : "latest listing"} — change it if your shop is elsewhere`
            ) : (
              "No map pin — add the building and street below"
            )}
          </p>
        ) : null}

        <div className="mt-4">
          <label htmlFor="address-line" className="text-[13px] font-semibold text-main">
            Building, street or landmark
            {hasPin(location) ? <span className="font-normal text-muted"> · optional</span> : null}
          </label>
          <input
            id="address-line"
            value={addressLine}
            maxLength={ADDRESS_MAX}
            autoComplete="street-address"
            onChange={(event) => handleAddressChange(event.target.value)}
            placeholder="e.g. Bazaar Plaza, 2nd floor, shop B12"
            className="mt-1.5 h-12 w-full rounded-xl border border-border bg-app px-3.5 text-main outline-none transition-colors placeholder:text-[15px] focus:border-[#1D9BF0]"
          />
        </div>

        <LocationPickerDrawer open={pickerOpen} onOpenChange={setPickerOpen} onSelect={handlePicked} />
      </StepCard>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-elevated p-4">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#1D9BF0]"
        />
        <span className="text-[13px] leading-5 text-main">
          I confirm these details are true and that this business is mine.
        </span>
      </label>

      {submitError ? <FieldError>{submitError}</FieldError> : null}

      <div
        className={cn(
          "flex flex-col gap-2",
          !embedded &&
            "sticky bottom-0 -mx-4 border-t border-border bg-app/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
        )}
      >
        <button
          type="submit"
          disabled={!complete || !confirmed || submitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-45 md:h-11 md:w-auto md:self-start md:px-8"
        >
          {submitting ? <InterlockingBalls size={16} /> : null}
          {submitting ? "Submitting…" : status === "REJECTED" || status === "REVOKED" ? "Resubmit for review" : "Submit for review"}
        </button>
        <p className="text-center text-[12px] leading-4 text-muted md:text-left">
          {!complete
            ? `Finish ${ORDER.length - doneCount === 1 ? "the last step" : `the ${ORDER.length - doneCount} steps left`} to submit.`
            : !confirmed
              ? "Tick the confirmation to submit."
              : "We review every shop by hand and let you know as soon as it's done."}
        </p>
      </div>
    </form>
  );
}
