import { LoginForm } from "@/features/auth/components/LoginForm";
import { isValidLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";

import { SocialButtons } from "@/features/auth/components/SocialButtons";
import { AuthDesktopShell } from "@/features/auth/components/AuthDesktopShell";
import { AuthMobileScreen } from "@/features/auth/components/AuthMobileScreen";
import { Divider } from "@/features/auth/components/AuthIcons";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[lang]/auth/login">) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  const sp = await searchParams;
  const from = typeof sp?.["from"] === "string" ? sp["from"] : undefined;

  const registerHref = from
    ? `/${lang}/auth/register?from=${encodeURIComponent(from)}`
    : `/${lang}/auth/register`;

  const SocialTop = (
    <div className="mb-5 flex flex-col gap-4">
      <SocialButtons lang={lang} from={from} verb="Sign in" surface="login" />
      <Divider label="or use email" />
    </div>
  );

  const Footer = (
    <div className="mt-5 flex flex-col gap-3">
      {/* Google/Apple here can create a new account, so the same notice as
          sign-up applies. */}
      <p className="text-center text-xs leading-relaxed text-placeholder">
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
        New to Shopi?{" "}
        <Link href={registerHref} className="font-semibold text-primary">
          Create an account
        </Link>
      </p>
    </div>
  );

  return (
    <AuthDesktopShell lang={lang} from={from}>
      {/* ── Mobile layout ─────────────────────────────────────── */}
      <AuthMobileScreen
        backHref={`/${lang}/auth/auth-welcome${from ? `?from=${encodeURIComponent(from)}` : ""}`}
        title="Welcome back"
        subtitle="Sign in to keep your feed personalized."
        footer={Footer}
      >
        {SocialTop}
        <LoginForm from={from} lang={lang} />
      </AuthMobileScreen>

      {/* ── Desktop right-panel content ───────────────────────── */}
      <div className="hidden lg:flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-default font-display tracking-tight">
            Welcome back
          </h1>
          <p className="app-subcopy mt-1.5">
            Sign in to keep your feed personalized.
          </p>
        </div>
        {SocialTop}
        <LoginForm from={from} lang={lang} />
        {Footer}
      </div>
    </AuthDesktopShell>
  );
}
