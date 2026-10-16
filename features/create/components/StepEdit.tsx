"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { ArrowRight, ChevronLeft, X } from "lucide-react";
import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";
import { useForm, useWatch } from "react-hook-form";
import { useCreateStore } from "@/stores/create";
import {
  AutosaveDraftDocument,
  AdvanceDraftStepDocument,
  SuggestedPostLocationDocument,
  MyContactPhoneDocument,
} from "@/types/__generated__/graphql";
import { LocationPicker } from "./LocationPicker";
import { PhoneInput } from "./PhoneInput";
import { SpecsEditor } from "./SpecsEditor";
import { MediaPicker } from "./MediaPicker";
import { CategoryPickerDrawer } from "./CategoryPickerDrawer";
import { FormIssues, FormNotice, type FormIssue } from "./FormIssues";
import {
  isDraftAutosaveBlocked,
  trackDraftAutosave,
} from "@/features/create/utils/draftAutosave";
import { Switch } from "@/components/ui/switch";
import { trackPostJourney } from "@/lib/analytics";
import {
  descriptionProgressHint,
  LISTING_TITLE_HINT,
  listingDescriptionProblem,
  listingTitleProblem,
} from "@/lib/listingText";

interface EditFormValues {
  caption: string;
}

const MAX_TITLE = 120;
const MAX_CAPTION = 2000;

/** Grow a textarea to fit its content — call whenever value changes */
function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

/** Focus the visible title textarea (there are mobile + desktop copies). */
function focusTitle() {
  const inputs = Array.from(
    document.querySelectorAll<HTMLTextAreaElement>(
      "textarea[data-title-input]",
    ),
  );
  const visible = inputs.find((el) => el.offsetParent !== null) ?? inputs[0];
  visible?.focus();
}

/** Scroll a required field into view so its inline error is visible when the
 *  user taps Next from the bottom of a long, scrolled form. */
function scrollFieldIntoView(field: string) {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-field="${field}"]`),
  );
  const visible = els.find((el) => el.offsetParent !== null) ?? els[0];
  visible?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function StepEdit({
  onBack,
  embedded = false,
}: {
  onBack?: () => void;
  /** Inside the desktop create dialog: it owns the header (back/stepper) and
   *  the live preview panel, so this step renders only the form column. */
  embedded?: boolean;
}) {
  const {
    draftId,
    title,
    caption,
    hashtags,
    categoryId,
    categoryName,
    subcategoryId,
    subcategoryName,
    price,
    currency,
    isFree,
    negotiable,
    specs,
    location,
    contactPhone,
    mediaItems,
    setTitle,
    setCaption,
    setHashtags,
    setCategory,
    setSubcategory,
    setPrice,
    setNegotiable,
    setSpecs,
    setLocation,
    setContactPhone,
    setStep,
    setError,
    error,
  } = useCreateStore();

  const [autosaveMutation] = useMutation(AutosaveDraftDocument);
  const [advanceStep, { loading: advancing }] = useMutation(
    AdvanceDraftStepDocument,
  );

  // ── Title (autosize textarea) ──────────────────────────────────────────────
  const [titleValue, setTitleValue] = useState(title);
  // Nothing is flagged until the seller first taps Next. From then on every
  // inline message, and the list over the button, follows what they type, so
  // a message clears the moment its field is good enough rather than waiting
  // for the next tap.
  const [attempted, setAttempted] = useState(false);
  // Covers the whole of onNext, including the wait for uploads to attach,
  // which the mutation's own loading flag doesn't.
  const [submitting, setSubmitting] = useState(false);
  const [uploadTimedOut, setUploadTimedOut] = useState(false);
  // Resize every rendered title textarea (mobile + desktop copies) whenever the
  // value changes — including a restored draft, which sets it programmatically.
  // Per-element so the hidden copy doesn't starve the visible one.
  useEffect(() => {
    document
      .querySelectorAll<HTMLTextAreaElement>("textarea[data-title-input]")
      .forEach((el) => autosize(el));
  }, [titleValue]);

  // ── Tag chip input ─────────────────────────────────────────────────────────
  const [tags, setTags] = useState<string[]>(hashtags);
  const [tagInput, setTagInput] = useState("");

  function addTag(raw: string) {
    const cleaned = raw.replace(/^#+/, "").trim().toLowerCase();
    if (cleaned && !tags.includes(cleaned)) {
      setTags((prev) => [...prev, cleaned]);
    }
    setTagInput("");
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  // ── Price ──────────────────────────────────────────────────────────────────
  const [priceInput, setPriceInput] = useState(
    price !== null && !isFree ? String(price) : "",
  );

  // ── Caption (react-hook-form) ──────────────────────────────────────────────
  const { register, control, handleSubmit } = useForm<EditFormValues>(
    {
      defaultValues: { caption },
      mode: "onChange",
    },
  );
  const watchCaption = useWatch({ control, name: "caption" }) ?? caption;

  const titleProblem = listingTitleProblem(titleValue);
  const descriptionProblem = listingDescriptionProblem(watchCaption);
  const titleError = attempted ? titleProblem : null;
  const descriptionError = attempted ? descriptionProblem : null;

  // ── Location auto-fill ─────────────────────────────────────────────────────
  // Pre-fill the location with the user's suggested location — their latest
  // post's location, falling back to their saved profile location (resolved
  // server-side). Runs once; never overrides a location the user (or a restored
  // draft) already has, so it's freely editable and a manual clear sticks.
  const locationAutofilledRef = useRef(false);
  const { data: suggestedLocationData } = useQuery(
    SuggestedPostLocationDocument,
    { fetchPolicy: "cache-first" },
  );
  useEffect(() => {
    if (locationAutofilledRef.current) return;
    if (location) return; // user/draft already has one — don't clobber it
    const suggested = suggestedLocationData?.suggestedPostLocation;
    if (!suggested?.placeName || !suggested.placeId) return;
    locationAutofilledRef.current = true;
    setLocation({
      placeName: suggested.placeName,
      formattedAddress: suggested.formattedAddress ?? "",
      placeId: suggested.placeId,
      county: suggested.county ?? undefined,
      subregion: suggested.subregion ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedLocationData, location]);

  // Pre-fill the contact number from the seller's saved one, on exactly the
  // same terms as the location above: once, and never over a value the draft
  // or the user already has. That's what makes it "type it once, edit it any
  // time" rather than a field that keeps snapping back to the old number.
  const phoneAutofilledRef = useRef(false);
  const { data: myPhoneData } = useQuery(MyContactPhoneDocument, {
    fetchPolicy: "cache-first",
  });
  useEffect(() => {
    if (phoneAutofilledRef.current) return;
    if (contactPhone) return; // draft or user already set one
    const saved = myPhoneData?.myContactPhone;
    if (!saved) return;
    phoneAutofilledRef.current = true;
    setContactPhone(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPhoneData, contactPhone]);

  // No AI here by design. This is the manual composer: the seller writes the
  // title, description, specs, price and picks the category themselves. The
  // AI-assisted path lives entirely in GuidedCreateFlow — keep it that way, so
  // "manual" never silently calls a model or overwrites what the user typed.

  // ── Debounced autosave ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!draftId) return;
    const timer = setTimeout(() => {
      if (isDraftAutosaveBlocked(draftId)) return;
      void trackDraftAutosave(
        draftId,
        autosaveMutation({
          variables: {
            id: draftId,
            input: {
              title: titleValue || undefined,
              caption: watchCaption || undefined,
              hashtags: tags.length ? tags : undefined,
              categoryId: categoryId ?? undefined,
              aiClassification: subcategoryName
                ? { level1: categoryName ?? undefined, level2: subcategoryName }
                : undefined,
              specs: specs.length
                ? specs
                    .filter((s) => s.key.trim() && s.value.trim())
                    .map((s) => ({ key: s.key.trim(), value: s.value.trim() }))
                : undefined,
              location: location
                ? {
                    placeName: location.placeName,
                    formattedAddress: location.formattedAddress,
                    placeId: location.placeId,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    county: location.county,
                    subregion: location.subregion,
                  }
                : undefined,
              // Already canonical `254XXXXXXXXX` (PhoneInput only ever emits
              // that or null), so the server normalisation is a no-op here.
              contactPhone: contactPhone ?? undefined,
            },
          },
        }),
      ).catch(() => undefined);
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleValue, watchCaption, tags, categoryId, subcategoryName, location, contactPhone]);

  // ── Live-sync to store ─────────────────────────────────────────────────────
  // Mirror the local form state into the create store as the user types so the
  // desktop dialog's live preview panel updates in real time. Lightly debounced
  // to avoid a sessionStorage write per keystroke (the store is persisted).
  // Local state never reads back from the store after mount, so no loop.
  useEffect(() => {
    const timer = setTimeout(() => {
      setTitle(titleValue);
      setCaption(watchCaption ?? "");
      setHashtags(tags);
      const parsed = priceInput.trim() ? Number(priceInput) : 0;
      if (Number.isFinite(parsed) && parsed >= 0) {
        setPrice(parsed, parsed === 0);
      }
    }, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleValue, watchCaption, tags, priceInput]);

  // ── Form validity ──────────────────────────────────────────────────────────
  // Everything checkable without a request. The wait for uploads to attach
  // stays inside onNext.
  const parsedPriceValue = priceInput.trim() ? Number(priceInput) : 0;
  const priceValid = Number.isFinite(parsedPriceValue) && parsedPriceValue >= 0;
  const hasUsableMedia =
    mediaItems.length > 0 && !mediaItems.every((m) => m.status === "error");

  /**
   * Level 2 is free-form: the AI writes a plain label ("Laptops") and there is
   * no seeded row to select, so most subcategories have a name and no id. The
   * publish payload sends `aiClassification.level2` — the NAME — and never the
   * id, so the name is what "has a subcategory" actually means.
   *
   * Gating on the id meant a seller saw the AI's subcategory sitting in the
   * field, filled in, and was still told to choose one; opening the picker and
   * tapping the same value only worked because that path happens to also set an
   * id nothing reads.
   */
  const hasSubcategory = !!(subcategoryId || subcategoryName?.trim());

  // ── What's wrong, field by field ───────────────────────────────────────────
  // The full sentence goes under the field; the short one goes in the list
  // over the Next button. Null while the field is fine. In form order, so the
  // list reads top to bottom like the page.
  const mediaError = !hasUsableMedia
    ? mediaItems.length === 0
      ? "Add at least one photo or video."
      : "Your upload failed. Remove it and add the photo or video again."
    : uploadTimedOut
      ? "Your upload is taking too long. Check your connection and tap Next again."
      : null;
  const categoryProblem = !categoryId
    ? "Choose a category."
    : !hasSubcategory
      ? "Choose a subcategory."
      : null;
  const priceProblem = priceValid ? null : "Enter a price of 0 or more.";
  const locationProblem = location ? null : "Add where the item is, so nearby buyers find it.";
  // Null means empty or not yet a complete 9-digit number — PhoneInput can't
  // represent a half-typed number as valid.
  const phoneProblem = contactPhone ? null : "Add a phone number so buyers can call you.";

  const issues: FormIssue[] = [];
  if (mediaError) {
    issues.push({
      field: "media",
      label: "Photos",
      message: !hasUsableMedia
        ? mediaItems.length === 0
          ? "Add a photo or video"
          : "Upload failed, add it again"
        : "Upload is taking too long",
    });
  }
  if (titleProblem) {
    issues.push({
      field: "title",
      label: "Title",
      message: titleValue.trim() ? "Use at least 2 words" : "Add a title",
    });
  }
  if (descriptionProblem) {
    issues.push({
      field: "description",
      label: "Description",
      message: watchCaption.trim()
        ? (descriptionProgressHint(watchCaption) ?? "Add a few more words")
        : "Add a description",
    });
  }
  if (categoryProblem) {
    issues.push({
      field: "category",
      label: !categoryId ? "Category" : "Subcategory",
      message: !categoryId ? "Choose a category" : "Choose a subcategory",
    });
  }
  if (priceProblem) {
    issues.push({ field: "price", label: "Price", message: "Enter 0 or more" });
  }
  if (locationProblem) {
    issues.push({ field: "location", label: "Location", message: "Add where the item is" });
  }
  if (phoneProblem) {
    issues.push({ field: "phone", label: "Phone", message: "Add a number buyers can call" });
  }
  const shownIssues = attempted ? issues : [];
  const busy = submitting || advancing;

  /** Take the seller to a field from the list: into view, and into the
   *  keyboard when it's something they type. */
  function goToField(field: string) {
    scrollFieldIntoView(field);
    if (field === "title") focusTitle();
    else if (field === "description") document.getElementById("listing-description")?.focus();
    else if (field === "price") document.getElementById("listing-price")?.focus();
  }

  async function onNext(values: EditFormValues) {
    if (busy) return;
    if (!draftId) {
      setError("Your draft is still being set up. Wait a moment and tap Next again.");
      return;
    }
    setError(null);
    setAttempted(true);
    setUploadTimedOut(false);

    // Every problem at once: the list over the button names them all, and the
    // page scrolls to the first so the seller starts at the top.
    if (issues.length > 0) {
      scrollFieldIntoView(issues[0].field);
      return;
    }

    setSubmitting(true);
    try {
      await saveAndAdvance(values);
    } finally {
      setSubmitting(false);
    }
  }

  async function saveAndAdvance(values: EditFormValues) {
    if (!draftId) return;
    const trimmedTitle = titleValue.trim();

    // Wait for any items still in "uploading" status — those haven't been
    // attached to the draft yet (attach happens after the R2 PUT completes).
    // Items in "processing" or "ready" are already attached server-side.
    const ATTACH_TIMEOUT_MS = 30_000;
    const ATTACH_POLL_MS = 300;
    let remainingAttachChecks = Math.ceil(ATTACH_TIMEOUT_MS / ATTACH_POLL_MS);
    while (
      useCreateStore
        .getState()
        .mediaItems.some((m) => m.status === "uploading") &&
      remainingAttachChecks > 0
    ) {
      remainingAttachChecks -= 1;
      await new Promise((r) => setTimeout(r, ATTACH_POLL_MS));
    }
    if (
      useCreateStore.getState().mediaItems.some((m) => m.status === "uploading")
    ) {
      setUploadTimedOut(true);
      scrollFieldIntoView("media");
      return;
    }
    // An upload can fail during the wait.
    if (useCreateStore.getState().mediaItems.every((m) => m.status === "error")) {
      scrollFieldIntoView("media");
      return;
    }

    const parsedPrice = parsedPriceValue;
    const finalIsFree = parsedPrice === 0;
    setPrice(parsedPrice, finalIsFree);

    try {
      // Final autosave (including price + location)
      const { error: saveError } = await autosaveMutation({
        variables: {
          id: draftId,
          input: {
            title: trimmedTitle,
            caption: values.caption,
            hashtags: tags,
            categoryId: categoryId ?? undefined,
            aiClassification: subcategoryName
              ? { level1: categoryName ?? undefined, level2: subcategoryName }
              : undefined,
            specs: specs
              .filter((s) => s.key.trim() && s.value.trim())
              .map((s) => ({ key: s.key.trim(), value: s.value.trim() })),
            price: { amount: parsedPrice, currency, negotiable },
            location: location
              ? {
                  placeName: location.placeName,
                  formattedAddress: location.formattedAddress,
                  placeId: location.placeId,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  county: location.county,
                  subregion: location.subregion,
                }
              : undefined,
          },
        },
      });
      if (saveError) {
        setError(saveError.message ?? "Could not save details");
        return;
      }

      setTitle(trimmedTitle);
      setCaption(values.caption);
      setHashtags(tags);

      let serverStep: string | undefined;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data: stepData, error: stepError } = await advanceStep({
          variables: { id: draftId },
        });
        if (stepError) {
          // The server holds the same title/description floor; its message
          // names the field, so the inline hints are switched on as well.
          if (/title|description/i.test(stepError.message ?? "")) {
            setAttempted(true);
          }
          setError(stepError.message ?? "Could not advance step");
          return;
        }
        serverStep = stepData?.advanceDraftStep?.currentStep as
          | string
          | undefined;
        if (serverStep === "PUBLISHING_OPTIONS" || serverStep === "READY") {
          setStep("options");
          trackPostJourney("post_details_submitted", {
            method: useCreateStore.getState().creationMode ?? "unknown",
            category: categoryName ?? "unknown",
            content_type: useCreateStore.getState().contentType ?? "unknown",
          });
          return;
        }
        if (serverStep !== "EDITING") break;
      }

      setError(
        serverStep === "MEDIA_UPLOAD"
          ? "Your media is still attaching. Please wait a moment and try again."
          : "Please complete the required details before continuing.",
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/title|description/i.test(message)) setAttempted(true);
      setError(message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Shared sub-components (form fields) extracted so we can render them in
  // both the mobile column layout and the desktop two-column layout.
  // ─────────────────────────────────────────────────────────────────────────

  const titleBlock = (
    <div className="flex-1 flex flex-col justify-start pt-1" data-field="title">
      <textarea
        // Callback ref sizes whichever copy (mobile/desktop) is actually
        // visible. A shared useRef breaks here because the title is rendered in
        // two places — the hidden copy has scrollHeight 0 and starves the other.
        ref={(el) => {
          autosize(el);
        }}
        value={titleValue}
        onChange={(e) => {
          if (e.target.value.length <= MAX_TITLE) {
            setTitleValue(e.target.value);
          }
          autosize(e.currentTarget);
        }}
        onInput={(e) => autosize(e.currentTarget)}
        placeholder="Add a title…"
        rows={1}
        data-title-input
        aria-invalid={!!titleError}
        className={`w-full overflow-hidden bg-transparent outline-none resize-none placeholder:text-base font-semibold leading-snug text-md caret-primary ${
          titleError ? "text-error" : "text-foreground"
        }`}
      />
      <div className="mt-1 flex items-start justify-between gap-3 text-xs">
        {titleError ? (
          <span className="font-medium text-error">{titleError}</span>
        ) : (
          <span className="text-muted">{LISTING_TITLE_HINT}</span>
        )}
        <span className="shrink-0 text-muted tabular-nums">
          {titleValue.length}/{MAX_TITLE}
        </span>
      </div>
    </div>
  );

  // The line under the description: the error once Next has been tapped;
  // before that, how far there is to go.
  const descriptionHint = descriptionError ? null : descriptionProgressHint(watchCaption);

  const captionBlock = (
    <div data-field="description">
      <div className="mb-1.5 flex items-center gap-2">
        <label
          htmlFor="listing-description"
          className="text-sm font-medium text-muted"
        >
          Description
        </label>
      </div>
      <textarea
        id="listing-description"
        {...register("caption", {
          maxLength: {
            value: MAX_CAPTION,
            message: `Max ${MAX_CAPTION} chars`,
          },
        })}
        placeholder="Condition, size, colour, what’s included, why you’re selling…"
        rows={4}
        aria-invalid={!!descriptionError}
        aria-describedby="listing-description-hint"
        className={`w-full resize-none rounded-xl border bg-surface px-3 py-2.5 text-base text-foreground caret-primary outline-none transition-all ${
          descriptionError
            ? "border-[rgb(var(--color-error))]"
            : "border-border focus:border-primary"
        }`}
        maxLength={MAX_CAPTION}
      />
      <div
        id="listing-description-hint"
        className="mt-1 flex items-start justify-between gap-3 text-xs"
      >
        {descriptionError ? (
          <span className="font-medium text-error">{descriptionError}</span>
        ) : (
          <span className="text-muted">{descriptionHint}</span>
        )}
        <span className="shrink-0 text-muted tabular-nums">
          {watchCaption?.length ?? 0}/{MAX_CAPTION}
        </span>
      </div>
    </div>
  );

  const tagsBlock = (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-muted">
        Tags (optional)
      </label>
      <div
        className="flex min-h-11 flex-wrap gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5"
        onClick={() => document.getElementById("tag-input")?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary"
          >
            #{tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="-mr-1 flex size-4 items-center justify-center text-primary opacity-70"
              aria-label={`Remove ${tag}`}
            >
              <X size={12} strokeWidth={2.5} aria-hidden />
            </button>
          </span>
        ))}
        <input
          id="tag-input"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value.replace(/\s/g, ""))}
          onKeyDown={handleTagKeyDown}
          onBlur={() => {
            if (tagInput) addTag(tagInput);
          }}
          placeholder={
            tags.length === 0 ? "fashion, style… (Enter to add)" : ""
          }
          className="min-w-30 flex-1 bg-transparent text-base text-foreground caret-primary outline-none"
        />
      </div>
      <p className="mt-1 text-xs text-muted">
        Press Enter or comma to add a tag
      </p>
    </div>
  );

  const categoryBlock = (
    <div data-field="category">
      <label className="mb-1.5 block text-sm font-medium text-muted">
        Category
      </label>
      <CategoryPickerDrawer
        value={categoryId}
        fallbackLabel={categoryName}
        onChange={(id, name) => setCategory(id, name, "manual")}
      />
      <label className="mb-1.5 mt-3 block text-sm font-medium text-muted">
        Subcategory
      </label>
      <CategoryPickerDrawer
        value={subcategoryId}
        fallbackLabel={subcategoryName}
        parentId={categoryId}
        title="Subcategory"
        placeholderLabel="Choose subcategory"
        emptyLabel="No subcategories yet for this category."
        onChange={(id, name) => setSubcategory(id, name)}
      />
      {attempted && categoryProblem && (
        <p className="mt-1.5 text-xs font-medium text-error">
          {categoryProblem}
        </p>
      )}
    </div>
  );

  const priceBlock = (
    <div data-field="price">
      <label
        htmlFor="listing-price"
        className="mb-1.5 block text-sm font-medium text-muted"
      >
        Price (optional)
      </label>
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 flex-1 items-center gap-2 rounded-xl border bg-surface px-3 ${
            attempted && priceProblem ? "border-error" : "border-border"
          }`}
        >
          <span className="text-sm font-medium text-muted">{currency}</span>
          <input
            id="listing-price"
            type="number"
            inputMode="numeric"
            aria-invalid={attempted && !!priceProblem}
            min="0"
            step="1"
            placeholder="0"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            className="flex-1 bg-transparent text-md text-foreground outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setPriceInput("");
            setPrice(0, true);
          }}
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            !priceInput || priceInput === "0"
              ? "bg-primary-soft text-primary"
              : "bg-surface text-muted"
          }`}
        >
          Custom
        </button>
      </div>
      {attempted && priceProblem ? (
        <p className="mt-1.5 text-xs font-medium text-error">{priceProblem}</p>
      ) : (
        <p className="mt-1.5 text-xs text-muted">
          Set a price in {currency} or leave at 0 for custom
        </p>
      )}
      <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-3">
        <div className="min-w-0 pr-4">
          <p className="text-sm font-medium text-foreground">Negotiable</p>
          <p className="text-xs text-muted">
            Buyers can discuss the price with you
          </p>
        </div>
        <Switch
          checked={negotiable}
          onCheckedChange={setNegotiable}
          aria-label="Mark price as negotiable"
        />
      </div>
    </div>
  );

  const locationBlock = (
    <div data-field="location">
      <label className="mb-1.5 block text-sm font-medium text-muted">
        Location
      </label>
      <LocationPicker
        value={location}
        onSelect={(loc) => setLocation(loc)}
        onClear={() => setLocation(null)}
      />
      {attempted && locationProblem ? (
        <p className="mt-1.5 text-xs font-medium text-error">
          {locationProblem}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-muted">
          Helps buyers find your listing nearby
        </p>
      )}
    </div>
  );

  const phoneBlock = (
    <div data-field="phone">
      <label
        htmlFor="contact-phone"
        className="mb-1.5 block text-sm font-medium text-muted"
      >
        Phone number
      </label>
      <PhoneInput
        value={contactPhone}
        onChange={setContactPhone}
        error={attempted ? phoneProblem : null}
      />
    </div>
  );

  const specsBlock = <SpecsEditor specs={specs} onChange={setSpecs} />;

  // Inline media validation message — rendered directly under the MediaPicker
  // (both mobile + desktop copies) so "add at least one photo" appears where the
  // media is, not buried in the bottom error bar.
  const mediaErrorBlock =
    attempted && mediaError ? (
      <p className="mt-2 text-xs font-medium text-error">{mediaError}</p>
    ) : null;

  // ── Desktop media preview panel (left column) ──────────────────────────────
  const desktopPreview = (
    <div className="hidden w-85 shrink-0 border-r border-border bg-surface md:flex md:flex-col md:gap-4 md:p-8 md:overflow-y-auto">
      <div data-field="media">
        <MediaPicker />
        {mediaErrorBlock}
      </div>

      {/* Title preview */}
      {titleValue && (
        <p className="line-clamp-2 text-center text-base font-semibold text-foreground">
          {titleValue}
        </p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-full flex-1">
      {/* ── Desktop left panel — media preview (standalone page only; the
             dialog shows the live preview panel instead) ── */}
      {!embedded && desktopPreview}

      {/* ── Right / mobile column — header + form ── */}
      <div className="flex flex-col flex-1 h-full min-h-0">
        {/* Header — sticky so it stays pinned while the form scrolls.
            Hidden when embedded: the dialog header owns back + stepper. */}
        {!embedded && (
          <div className="sticky top-0 z-50 flex shrink-0 items-center justify-between border-b border-border bg-background px-4 pt-4 pb-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to media"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <ChevronLeft size={23} strokeWidth={2.2} />
            </button>
            <h2 className="text-lg font-semibold text-foreground">Details</h2>
            {/* Spacer balances the back button so the title stays centred.
                The primary action now lives in the sticky bottom bar. */}
            <span aria-hidden className="w-10 shrink-0" />
          </div>
        )}

        <div
          className={`flex-1 overflow-y-auto pb-8 ${embedded ? "px-8" : "px-4"}`}
        >
          {/* Media picker (dotted picker / photo grid / video). On the
              standalone page desktop shows it in the left panel instead. */}
          <div
            className={`mb-5 mt-4 ${embedded ? "" : "md:hidden"}`}
            data-field="media"
          >
            <MediaPicker />
            {mediaErrorBlock}
          </div>

          {/* Title — full width on both layouts (media lives above/in left panel) */}
          <div className="mb-5">{titleBlock}</div>

          <Divider />

          {/* Caption */}
          <div className="mt-4">{captionBlock}</div>

          <Divider className="mt-4" />

          {/* Tags */}
          <div className="mt-4">{tagsBlock}</div>

          <Divider className="mt-4" />

          {/* Category */}
          <div className="mt-4">{categoryBlock}</div>

          <Divider className="mt-4" />

          {/* Price */}
          <div className="mt-4">{priceBlock}</div>

          <Divider className="mt-4" />

          {/* Specifications (hand-entered) — hidden for now.
              Remove `hidden` to let sellers add specs in the manual flow. */}
          <div className="mt-4 hidden">{specsBlock}</div>
          <div className="hidden">
            <Divider className="mt-4" />
          </div>

          {/* Location */}
          <div className="mt-4">{locationBlock}</div>

          <Divider className="mt-4" />

          {/* Contact number — sits with Location as the "how buyers reach this
              listing" pair, and last so the form still opens on the fun part. */}
          <div className="mt-4">{phoneBlock}</div>
        </div>

        {/* Sticky bottom action bar. Next never greys out: tapping it with
            something missing lists every problem right above it, each row
            jumping to its field, and marks the fields themselves. */}
        <div
          className={`sticky bottom-0 z-50 shrink-0 border-t border-border bg-background pt-3 pb-[calc(0.75rem+var(--safe-bottom))] ${embedded ? "px-8" : "px-4"}`}
        >
          {shownIssues.length > 0 ? (
            <FormIssues issues={shownIssues} onSelect={goToField} />
          ) : error ? (
            <FormNotice>{error}</FormNotice>
          ) : null}
          <button
            type="button"
            onClick={handleSubmit(onNext)}
            aria-busy={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {busy ? (
              <>
                <InterlockingBalls size={18} />
                Saving
              </>
            ) : (
              <>
                Next
                <ArrowRight size={18} aria-hidden />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Divider({ className = "" }: { className?: string }) {
  return <div className={`h-px bg-border ${className}`} />;
}
