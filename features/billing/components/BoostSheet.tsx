"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import Image from "next/image";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import {
  AlertTriangle,
  Check,
  Clock,
  ImageIcon,
  Lock,
  RotateCcw,
  Smartphone,
  X,
  Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";
import { useBackDismiss } from "@/hooks/useBackDismiss";
import { cn } from "@/lib/utils";
import {
  BOOST_CHECKOUT,
  START_BOOST_PAYMENT,
  type BillingPayment,
  type BoostCheckout,
  type BoostCheckoutPackage,
  type BoostTier,
} from "../api";
import { usePaymentWatcher } from "../hooks/usePaymentWatcher";
import {
  daysLeft,
  formatPhoneInput,
  kes,
  newIdempotencyKey,
  normalizeKenyanPhone,
  shortDay,
} from "../lib/money";

export type BoostSheetPost = {
  id: string;
  title: string;
  thumbnail?: string | null;
};

/**
 * Buying a boost: pick a package, confirm the M-Pesa number, approve the
 * prompt on the phone, done.
 *
 * A bottom sheet on a phone, a dialog on desktop. Closing it never cancels a
 * payment — the server settles it either way, and opening the sheet again
 * picks the payment back up where it is.
 */
export function BoostSheet({
  post,
  open,
  desktop,
  onClose,
  onBoosted,
}: {
  post: BoostSheetPost | null;
  open: boolean;
  desktop: boolean | null;
  onClose: () => void;
  /** Called once when a payment for this post completes. */
  onBoosted?: () => void;
}) {
  const { requestClose } = useBackDismiss(open, onClose);

  // Keep the last post on screen while the sheet animates closed, and start a
  // fresh flow (fresh data, fresh form) every time it opens.
  const [shown, setShown] = useState(post);
  if (post && (post.id !== shown?.id || post.title !== shown.title || post.thumbnail !== shown.thumbnail)) {
    setShown(post);
  }
  const [wasOpen, setWasOpen] = useState(open);
  const [session, setSession] = useState(0);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((value) => value + 1);
  }

  const flow = shown ? (
    <BoostFlow key={`${shown.id}:${session}`} post={shown} onClose={requestClose} onBoosted={onBoosted} />
  ) : null;

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
        <DialogContent
          className="z-[85] flex h-[min(86vh,760px)] w-[min(92vw,520px)] flex-col gap-0 overflow-hidden rounded-[28px] border border-default bg-app p-0 [&>button:last-child]:hidden"
          overlayClassName="z-[82]"
        >
          <DialogTitle className="sr-only">Boost this post</DialogTitle>
          <DialogDescription className="sr-only">
            Choose a package and pay with M-Pesa to show this post to more buyers.
          </DialogDescription>
          {flow}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(next) => !next && requestClose()}>
      <DrawerContent className="mx-auto flex h-[90svh] w-full max-w-[480px] flex-col rounded-t-[22px] border-default bg-app">
        <DrawerTitle className="sr-only">Boost this post</DrawerTitle>
        <DrawerDescription className="sr-only">
          Choose a package and pay with M-Pesa to show this post to more buyers.
        </DrawerDescription>
        {flow}
      </DrawerContent>
    </Drawer>
  );
}

// ── The flow ────────────────────────────────────────────────────────────────

function BoostFlow({
  post,
  onClose,
  onBoosted,
}: {
  post: BoostSheetPost;
  onClose: () => void;
  onBoosted?: () => void;
}) {
  const client = useApolloClient();
  const { data, error, refetch } = useQuery(BOOST_CHECKOUT, {
    variables: { contentId: post.id },
    fetchPolicy: "network-only",
  });
  const checkout = data?.boostCheckout;

  const [tier, setTier] = useState<BoostTier | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [seed, setSeed] = useState<BillingPayment | null>(null);
  // One key per checkout attempt. Kept after a network error so tapping Pay
  // again returns the same payment instead of sending a second prompt.
  const attemptKey = useRef<string | null>(null);
  const [startPayment, { loading: starting }] = useMutation(START_BOOST_PAYMENT);

  // Pick up a payment that is still in progress — once, when the data arrives.
  const [resumeChecked, setResumeChecked] = useState(false);
  if (checkout && !resumeChecked) {
    setResumeChecked(true);
    if (checkout.openPayment) {
      setSeed(checkout.openPayment);
      setPaymentId(checkout.openPayment.id);
    }
  }

  const { payment } = usePaymentWatcher(paymentId, seed);

  // Refresh what the seller sees about the post once the boost is live.
  const announced = useRef(false);
  useEffect(() => {
    if (payment?.status !== "COMPLETED" || announced.current) return;
    announced.current = true;
    void refetch();
    void client.refetchQueries({ include: ["MyManagedContent", "MyManagedContentDetail"] }).catch(() => {});
    onBoosted?.();
  }, [payment?.status, refetch, client, onBoosted]);

  if (!checkout) {
    return (
      <Frame title="Boost post" onClose={onClose}>
        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-[14px] text-muted">{errorText(error, "Couldn't load boost options.")}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="h-10 rounded-full border border-default px-4 text-[14px] font-semibold text-main"
            >
              Try again
            </button>
          </div>
        ) : (
          <ChooseSkeleton />
        )}
      </Frame>
    );
  }

  const packages = checkout.packages;
  const selected =
    packages.find((pkg) => pkg.tier === tier && pkg.available) ??
    packages.find((pkg) => pkg.recommended) ??
    null;
  const phoneValue = phone ?? (checkout.defaultPhone ? formatPhoneInput(checkout.defaultPhone) : "");

  async function pay() {
    if (!selected) return;
    const normalized = normalizeKenyanPhone(phoneValue);
    if (!normalized) {
      setPhoneError("Enter an M-Pesa number like 0712 345 678.");
      return;
    }
    setSubmitError(null);
    const key = attemptKey.current ?? newIdempotencyKey();
    attemptKey.current = key;
    try {
      const result = await startPayment({
        variables: { input: { contentId: post.id, tier: selected.tier, phone: normalized, idempotencyKey: key } },
      });
      const started = result.data?.startBoostPayment;
      if (started) {
        attemptKey.current = null;
        setSeed(started);
        setPaymentId(started.id);
      }
    } catch (err) {
      // The server answered and said no: the next tap is a new attempt.
      if (CombinedGraphQLErrors.is(err)) attemptKey.current = null;
      setSubmitError(errorText(err, "Couldn't start the payment. Check your connection and try again."));
    }
  }

  function tryAgain() {
    setPaymentId(null);
    setSeed(null);
    announced.current = false;
    void refetch();
  }

  if (paymentId && payment) {
    return (
      <PaymentProgress
        payment={payment}
        checkout={checkout}
        onClose={onClose}
        onTryAgain={tryAgain}
      />
    );
  }

  const canPay = checkout.paymentsEnabled && checkout.canBoost && Boolean(selected) && !starting;

  return (
    <Frame
      title="Boost post"
      onClose={onClose}
      footer={
        <>
          {submitError && (
            <p role="alert" className="mb-2.5 rounded-xl bg-rose-500/10 px-3 py-2 text-[13px] text-rose-600 dark:text-rose-400">
              {submitError}
            </p>
          )}
          <button
            type="button"
            onClick={() => void pay()}
            disabled={!canPay}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-45"
          >
            {starting ? (
              <>
                <InterlockingBalls size={20} /> Sending prompt…
              </>
            ) : selected ? (
              `Pay ${kes(selected.priceKes)} with M-Pesa`
            ) : (
              "Choose a package"
            )}
          </button>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-muted">
            <Lock className="size-3 shrink-0" />
            You approve it with your M-Pesa PIN. Shopi never sees your PIN.
          </p>
        </>
      }
    >
      <div className="space-y-4 px-4 pb-5 pt-1 md:px-6">
        <PostStrip post={post} />

        {checkout.activeBoost && (
          <Notice tone="brand" icon={Zap}>
            <strong className="font-semibold">{checkout.activeBoost.name} boost running</strong> ·{" "}
            {daysLabel(daysLeft(checkout.activeBoost.endsAt))} left. Buying again adds the new days on top — none
            are lost.
          </Notice>
        )}
        {checkout.paymentInReview && (
          <Notice tone="amber" icon={Clock}>
            We received {kes(checkout.paymentInReview.amount)} for this post and our team is finishing it. You
            don&apos;t need to pay again.
          </Notice>
        )}
        {!checkout.paymentsEnabled && (
          <Notice tone="neutral" icon={Clock}>
            M-Pesa payments are being set up. You&apos;ll be able to boost posts here soon.
          </Notice>
        )}
        {checkout.paymentsEnabled && !checkout.canBoost && checkout.blockedReason && (
          <Notice tone="rose" icon={AlertTriangle}>
            {checkout.blockedReason}
          </Notice>
        )}

        <div role="radiogroup" aria-label="Boost package" className="space-y-2.5">
          {packages.map((pkg) => (
            <PackageOption
              key={pkg.tier}
              pkg={pkg}
              selected={selected?.tier === pkg.tier}
              blocked={!checkout.canBoost}
              onSelect={() => setTier(pkg.tier)}
            />
          ))}
        </div>

        <ul className="space-y-1.5 rounded-2xl bg-surface px-3.5 py-3 text-[13px] text-main">
          <Benefit>Shows higher in For You, Nearby and Explore</Benefit>
          <Benefit>Starts the moment your payment goes through</Benefit>
          <Benefit>Boost again any time — extra days are added, never lost</Benefit>
        </ul>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-main">M-Pesa number</span>
          <span
            className={cn(
              "flex h-12 items-center gap-2.5 rounded-xl border bg-app px-3.5 transition-colors focus-within:border-primary",
              phoneError ? "border-rose-500" : "border-default",
            )}
          >
            <Smartphone className="size-4 shrink-0 text-muted" />
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0712 345 678"
              value={phoneValue}
              onChange={(event) => {
                setPhone(formatPhoneInput(event.target.value));
                setPhoneError(null);
              }}
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] tabular-nums text-main outline-none placeholder:text-muted"
            />
          </span>
          <span
            className={cn("mt-1.5 block text-[12px]", phoneError ? "text-rose-600 dark:text-rose-400" : "text-muted")}
          >
            {phoneError ?? "We'll send the payment prompt to this phone."}
          </span>
        </label>
      </div>
    </Frame>
  );
}

// ── Payment progress ────────────────────────────────────────────────────────

function PaymentProgress({
  payment,
  checkout,
  onClose,
  onTryAgain,
}: {
  payment: BillingPayment;
  checkout: BoostCheckout;
  onClose: () => void;
  onTryAgain: () => void;
}) {
  const waiting = payment.status === "INITIATED" || payment.status === "PENDING";
  const elapsed = useElapsedSeconds(payment.createdAt, waiting);
  // The payment stores the tier as the API's value ("gold"); packages use the GraphQL name ("GOLD").
  const boughtTier = payment.itemCode.toUpperCase();
  const tierName = checkout.packages.find((pkg) => pkg.tier === boughtTier)?.name ?? "Your";
  const boostedUntil =
    checkout.activeBoost && checkout.activeBoost.tier === boughtTier ? checkout.activeBoost.endsAt : null;

  let hero: ReactNode;
  let footer: ReactNode;
  let extra: ReactNode = null;

  switch (payment.status) {
    case "INITIATED":
    case "PENDING":
      hero = (
        <Hero
          tone="brand"
          visual={<PhonePulse />}
          title="Check your phone"
          body={
            <>
              Enter your M-Pesa PIN to pay <strong className="font-semibold text-main">{kes(payment.amount)}</strong>{" "}
              to Shopi.
            </>
          }
        />
      );
      extra = (
        <>
          <Steps
            steps={[
              { label: `Prompt sent to ${payment.phone}`, state: payment.status === "INITIATED" ? "active" : "done" },
              { label: "Waiting for your PIN", state: payment.status === "PENDING" ? "active" : "todo" },
              { label: "Your boost starts", state: "todo" },
            ]}
          />
          {elapsed >= 30 && (
            <Notice tone="neutral" icon={Smartphone}>
              No prompt yet? Unlock your phone and make sure it has network. If the prompt expired, you&apos;ll be able
              to try again in a moment.
            </Notice>
          )}
        </>
      );
      footer = (
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-12 w-full rounded-full border border-default text-[15px] font-semibold text-main transition-colors active:bg-surface"
          >
            Close
          </button>
          <p className="mt-2 text-center text-[11.5px] text-muted">
            You can close this. Your boost starts by itself once you pay.
          </p>
        </>
      );
      break;

    case "PAID":
      hero = (
        <Hero
          tone="brand"
          visual={<InterlockingBalls size={34} />}
          title="Payment received"
          body="Starting your boost…"
        />
      );
      footer = null;
      break;

    case "COMPLETED":
      hero = (
        <Hero
          tone="green"
          visual={<Check className="size-9" strokeWidth={2.6} />}
          title="Your post is boosted!"
          body={
            <>
              {tierName} boost is live{boostedUntil ? ` until ${shortDay(boostedUntil)}` : ""}. Buyers will see it
              higher in For You, Nearby and Explore.
            </>
          }
        />
      );
      footer = <PrimaryButton onClick={onClose}>Done</PrimaryButton>;
      break;

    case "FAILED":
      hero = (
        <Hero
          tone="rose"
          visual={<X className="size-9" strokeWidth={2.6} />}
          title="Payment didn't go through"
          body={payment.failureReason || "M-Pesa didn't complete the payment."}
        />
      );
      footer = (
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-full border border-default px-5 text-[15px] font-semibold text-main transition-colors active:bg-surface"
          >
            Close
          </button>
          <PrimaryButton onClick={onTryAgain}>
            <RotateCcw className="size-4" /> Try again
          </PrimaryButton>
        </div>
      );
      break;

    case "NEEDS_REVIEW":
      hero = payment.moneyReceived ? (
        <Hero
          tone="amber"
          visual={<Clock className="size-9" />}
          title="Payment received"
          body="We're finishing your boost. Our team has been alerted and will sort it out shortly — you don't need to pay again."
        />
      ) : (
        <Hero
          tone="amber"
          visual={<Clock className="size-9" />}
          title="Still confirming with M-Pesa"
          body="Please don't pay again. This updates by itself: if money left your M-Pesa, it goes to this boost or comes back to you."
        />
      );
      footer = <PrimaryButton onClick={onClose}>Close</PrimaryButton>;
      break;

    case "REFUNDED":
      hero = (
        <Hero
          tone="neutral"
          visual={<RotateCcw className="size-8" />}
          title="Payment refunded"
          body={`We sent ${kes(payment.amount)} back to ${payment.phone}.`}
        />
      );
      footer = <PrimaryButton onClick={onClose}>Close</PrimaryButton>;
      break;
  }

  return (
    <Frame title="M-Pesa payment" onClose={onClose} footer={footer}>
      <div className="space-y-5 px-4 pb-5 pt-4 md:px-6">
        <div aria-live="polite">{hero}</div>
        {extra}
        <dl className="divide-y divide-border rounded-2xl border border-default px-3.5 text-[13.5px]">
          <Row label="Package">{payment.itemLabel}</Row>
          <Row label="Amount">
            <span className="font-semibold tabular-nums">{kes(payment.amount)}</span>
          </Row>
          {payment.receipt && (
            <Row label="M-Pesa receipt">
              <span className="font-mono text-[13px]">{payment.receipt}</span>
            </Row>
          )}
          <Row label="Reference">
            <span className="font-mono text-[13px]">{payment.reference}</span>
          </Row>
        </dl>
      </div>
    </Frame>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function Frame({
  title,
  onClose,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-2.5 md:px-6 md:pt-5">
        <p className="text-[17px] font-semibold text-main">{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-1.5 flex size-9 items-center justify-center rounded-full text-muted transition-colors active:bg-surface"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">{children}</div>
      {footer && (
        <div
          className="shrink-0 border-t border-default bg-app px-4 pt-3 md:px-6 md:pb-5"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

function PostStrip({ post }: { post: BoostSheetPost }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-default bg-surface">
        {post.thumbnail ? (
          <Image src={post.thumbnail} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          <ImageIcon className="absolute inset-0 m-auto size-5 text-muted" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-main">{post.title || "Your post"}</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-muted">Put it in front of more buyers.</p>
      </div>
    </div>
  );
}

function PackageOption({
  pkg,
  selected,
  blocked,
  onSelect,
}: {
  pkg: BoostCheckoutPackage;
  selected: boolean;
  blocked: boolean;
  onSelect: () => void;
}) {
  const disabled = !pkg.available;
  const perDay = Math.round(pkg.priceKes / pkg.durationDays);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "relative w-full rounded-2xl border p-3.5 text-left transition-[border-color,background-color,box-shadow] active:scale-[0.995]",
        selected && !disabled
          ? "border-primary bg-primary-soft shadow-[0_0_0_1px_rgb(var(--brand-primary))]"
          : "border-default bg-app",
        disabled && "opacity-55",
      )}
    >
      <span className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
            selected && !disabled ? "border-primary bg-primary" : "border-default",
          )}
        >
          {selected && !disabled && <span className="size-2 rounded-full bg-white" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15px] font-semibold text-main">{pkg.name}</span>
            {pkg.tier === "GOLD" && (
              <span className="rounded-full bg-primary px-2 py-[3px] text-[10.5px] font-semibold leading-none text-white">
                Most popular
              </span>
            )}
          </span>
          <span className="mt-1 block text-[12.5px] leading-snug text-muted">{pkg.description}</span>
          <span className="mt-2 flex items-center gap-2 text-[12px] font-medium text-main">
            <Strength level={pkg.priority} />
            {pkg.durationDays} days
          </span>
          {disabled && !blocked && pkg.unavailableReason && (
            <span className="mt-1.5 block text-[12px] text-muted">{pkg.unavailableReason}</span>
          )}
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[15px] font-bold tabular-nums text-main">{kes(pkg.priceKes)}</span>
          {perDay >= 1 && <span className="block text-[11.5px] tabular-nums text-muted">{kes(perDay)}/day</span>}
        </span>
      </span>
    </button>
  );
}

/** How hard the package pushes, as three rising bars. */
function Strength({ level }: { level: number }) {
  return (
    <span className="flex items-end gap-[3px]" aria-label={`Reach level ${level} of 3`}>
      {[1, 2, 3].map((bar) => (
        <span
          key={bar}
          className={cn("w-[4px] rounded-full", bar <= level ? "bg-primary" : "bg-black/15 dark:bg-white/20")}
          style={{ height: 4 + bar * 3 }}
        />
      ))}
    </span>
  );
}

function Benefit({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-[3px] size-3.5 shrink-0 text-primary" strokeWidth={3} />
      <span>{children}</span>
    </li>
  );
}

const NOTICE_TONES = {
  brand: "bg-primary-soft text-main [&_svg]:text-primary",
  amber: "bg-amber-500/12 text-main [&_svg]:text-amber-600 dark:[&_svg]:text-amber-400",
  rose: "bg-rose-500/10 text-main [&_svg]:text-rose-600 dark:[&_svg]:text-rose-400",
  neutral: "bg-surface text-main [&_svg]:text-muted",
} as const;

function Notice({
  tone,
  icon: Icon,
  children,
}: {
  tone: keyof typeof NOTICE_TONES;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-2xl px-3.5 py-3 text-[13px] leading-snug", NOTICE_TONES[tone])}>
      <Icon className="mt-px size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

const HERO_TONES = {
  brand: "bg-primary-soft text-primary",
  green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  rose: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  neutral: "bg-surface text-muted",
} as const;

function Hero({
  tone,
  visual,
  title,
  body,
}: {
  tone: keyof typeof HERO_TONES;
  visual: ReactNode;
  title: string;
  body: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-2 pt-2 text-center">
      <div className={cn("flex size-20 items-center justify-center rounded-full", HERO_TONES[tone])}>{visual}</div>
      <h2 className="mt-4 text-[20px] font-semibold leading-tight text-main">{title}</h2>
      <p className="mt-1.5 max-w-[22rem] text-[14px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

/** A phone with rings going out from it: "something was sent to you". */
function PhonePulse() {
  return (
    <span className="relative flex size-full items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-primary/20 motion-safe:animate-ping [animation-duration:1.8s]" />
      <Smartphone className="relative size-9" />
    </span>
  );
}

type StepState = "done" | "active" | "todo";

function Steps({ steps }: { steps: Array<{ label: string; state: StepState }> }) {
  return (
    <ol className="space-y-3 rounded-2xl border border-default px-3.5 py-3.5">
      {steps.map((step) => (
        <li key={step.label} className="flex items-center gap-3 text-[13.5px]">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full",
              step.state === "done" && "bg-primary text-white",
              step.state === "active" && "border-2 border-primary",
              step.state === "todo" && "border-2 border-default",
            )}
          >
            {step.state === "done" && <Check className="size-3.5" strokeWidth={3} />}
            {step.state === "active" && <span className="size-2 rounded-full bg-primary motion-safe:animate-pulse" />}
          </span>
          <span className={cn(step.state === "todo" ? "text-muted" : "font-medium text-main")}>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-main">{children}</dd>
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-semibold text-white transition-opacity active:opacity-80"
    >
      {children}
    </button>
  );
}

function ChooseSkeleton() {
  return (
    <div className="space-y-4 px-4 pt-1 md:px-6" aria-busy="true" aria-label="Loading boost options">
      <div className="flex items-center gap-3">
        <div className="size-14 animate-pulse rounded-xl bg-surface" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-surface" />
        </div>
      </div>
      {[0, 1, 2].map((key) => (
        <div key={key} className="h-[104px] animate-pulse rounded-2xl bg-surface" />
      ))}
    </div>
  );
}

function useElapsedSeconds(since: string, running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  return Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
}

function daysLabel(days: number): string {
  return `${days} day${days === 1 ? "" : "s"}`;
}

function errorText(error: unknown, fallback: string): string {
  if (CombinedGraphQLErrors.is(error)) return error.errors[0]?.message || fallback;
  return fallback;
}
