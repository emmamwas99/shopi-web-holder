import { isValidLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Divider } from "@/features/auth/components/AuthIcons";
import { SocialButtons } from "@/features/auth/components/SocialButtons";
import { AuthDesktopShell } from "@/features/auth/components/AuthDesktopShell";
import { AuthExitButton } from "@/features/auth/components/AuthExitButton";
import { authPrimaryButtonClass } from "@/features/auth/components/authStyles";

export const metadata = { title: "Welcome" };

export default async function WelcomePage({
  params,
  searchParams,
}: PageProps<"/[lang]/auth/auth-welcome">) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  const sp = await searchParams;
  const from = typeof sp?.["from"] === "string" ? sp["from"] : undefined;
  const qs = from ? `?from=${encodeURIComponent(from)}` : "";

  /**
   * Match the screen to the button that produced it.
   *
   * The proxy sends anyone who taps a post CTA here with `from=/{lang}/upload`.
   * They arrived intending to sell, and this page used to answer with buyer
   * copy — "Everything for sale near you, in one feed. Create your free account
   * to start scrolling." Promising scrolling to someone holding a photo of a
   * sofa is a dropped handoff at the exact step where a signup is won.
   */
  const sellerIntent = from?.includes("/upload") ?? false;

  const copy = sellerIntent
    ? {
        mobileHeadline: "Your listing is one photo away.",
        mobileBody:
          "Create your free account to publish it. Posting costs nothing and Shopi takes no commission.",
        desktopHeadline: "Create your free account to post",
        desktopBody:
          "Posting is free, Shopi takes 0% commission, and buyers message you directly.",
      }
    : {
        mobileHeadline: "Everything for sale near you, in one feed.",
        mobileBody: "Create your free account to start scrolling.",
        desktopHeadline: "Create your free account",
        desktopBody:
          "Start discovering what people near you are selling — in seconds.",
      };

  const CTAs = (
    <div className="flex flex-col gap-3">
      {/* Social sign-up buttons — top priority per design */}
      <SocialButtons lang={lang} from={from} verb="Continue" surface="welcome" />

      <Divider label="or use email" />

      {/* Email CTA */}
      <Link
        href={`/${lang}/auth/register${qs}`}
        className={authPrimaryButtonClass}
      >
        Sign up with Email
      </Link>

      <p className="text-center text-xs text-placeholder leading-relaxed pt-1">
        By continuing you confirm you&apos;re 18 or older and agree to our{" "}
        <Link
          href={`/${lang}/terms-and-conditions`}
          className="text-muted underline underline-offset-2"
        >
          Terms
        </Link>{" "}
        &{" "}
        <Link
          href={`/${lang}/privacy-policy`}
          className="text-muted underline underline-offset-2"
        >
          Privacy Policy
        </Link>
        .
      </p>

      <p className="text-center text-sm text-muted">
        Already a member?{" "}
        <Link
          href={`/${lang}/auth/login${qs}`}
          className="font-semibold text-primary"
        >
          Sign in
        </Link>
      </p>
    </div>
  );

  return (
    <AuthDesktopShell lang={lang} from={from}>
      {/* ── Mobile layout ─────────────────────────────────────── */}
      {/* min-h, not h: a fixed screen height clipped the sign-in link off
          short phones. */}
      <div className="relative mx-auto flex min-h-svh max-w-107.5 flex-col overflow-hidden bg-app lg:hidden">
        {/* Hero photo — a seller and a buyer settling a listing on a phone:
            local buying and selling, done over the phone, in one picture.
            Capped in height so the CTAs still fit on short phones, cropped
            from the top so the faces and the phone always stay in frame, and
            faded into the page so the headline sits on the page colour. */}
        <div className="relative h-[min(44svh,22rem)] w-full shrink-0">
          <Image
            src="/assets/hero/marketplace-banner-mobile.webp"
            alt="A furniture seller showing a buyer a listing on a phone"
            fill
            sizes="(max-width: 430px) 100vw, 430px"
            priority
            fetchPriority="high"
            className="object-cover object-top"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-[rgb(var(--color-bg))] to-transparent"
          />

          {/* Left-aligned: this is a back control now, and back controls live
              on the left. Frosted so it reads over the photo. */}
          <div className="absolute inset-x-0 top-0 z-10 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
            <AuthExitButton
              lang={lang}
              from={from}
              iconOnly
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-opacity active:opacity-60"
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center px-6 pb-6 pt-2 text-center">
          <h1 className="text-2xl font-bold text-default font-display leading-[1.2] tracking-tight text-balance">
            {copy.mobileHeadline}
          </h1>
          <p className="app-subcopy mt-2">{copy.mobileBody}</p>
        </div>

        {/* CTAs pinned to bottom */}
        <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shrink-0">
          {CTAs}
        </div>
      </div>

      {/* ── Desktop right-panel content ───────────────────────── */}
      <div className="hidden lg:flex flex-col gap-6">
        <div>
          <h1 className="text-[28px] text-center font-bold text-default font-display leading-tight tracking-tight">
            {copy.desktopHeadline}
          </h1>
          <p className="app-subcopy mt-2 text-center">
            {copy.desktopBody}
          </p>
        </div>
        {CTAs}
      </div>
    </AuthDesktopShell>
  );
}
