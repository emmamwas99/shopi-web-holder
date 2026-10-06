import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { isValidLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShopiLogo, Divider } from "@/features/auth/components/AuthIcons";
import { SocialButtons } from "@/features/auth/components/SocialButtons";
import { AuthDesktopShell } from "@/features/auth/components/AuthDesktopShell";
import { ChevronLeftIcon } from "lucide-react";

export const metadata = { title: "Create account" };

export default async function RegisterPage({
  params,
  searchParams,
}: PageProps<"/[lang]/auth/register">) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  const sp = await searchParams;
  const from = typeof sp?.["from"] === "string" ? sp["from"] : undefined;

  const loginHref = from
    ? `/${lang}/auth/login?from=${encodeURIComponent(from)}`
    : `/${lang}/auth/login`;

  const SocialTop = (
    <div className="mb-5 flex flex-col gap-4">
      <SocialButtons lang={lang} from={from} verb="Sign up" surface="register" />
      <Divider label="or use email" />
    </div>
  );

  const Footer = (
    <div className="flex flex-col gap-3 mt-5">
      <p className="text-center text-xs text-placeholder leading-relaxed">
        By creating an account you agree to our{" "}
        <Link
          href={`/${lang}/terms`}
          className="text-muted underline underline-offset-2 font-semibold"
        >
          Terms
        </Link>{" "}
        &{" "}
        <Link
          href={`/${lang}/privacy`}
          className="text-muted underline underline-offset-2 font-semibold"
        >
          Privacy Policy
        </Link>
        .
      </p>
      <p className="text-center text-sm text-muted">
        Already a member?{" "}
        <Link href={loginHref} className="font-semibold text-primary">
          Sign in
        </Link>
      </p>
    </div>
  );

  return (
    <AuthDesktopShell lang={lang} from={from}>
      {/* ── Mobile layout ─────────────────────────────────────── */}
      <div className="relative mx-auto flex min-h-svh max-w-107.5 flex-col bg-app px-4 pb-6 pt-4 lg:hidden">
        <div className="flex items-center justify-between">
          <Link
            href={`/${lang}/auth/auth-welcome${from ? `?from=${encodeURIComponent(from)}` : ""}`}
            aria-label="Back"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-elevated text-muted shadow-sm transition-opacity active:opacity-70"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
        </div>

        <div className="flex shrink-0 flex-col items-center px-4 pb-5 pt-8 text-center">
          <Link href={`/${lang}`} className="mb-5 inline-flex">
            <ShopiLogo height={76} />
          </Link>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-default">
            Create your account
          </h1>
          <p className="app-subcopy mt-2">
            Takes less than a minute.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-elevated p-5 shadow-lg">
          {SocialTop}
          <RegisterForm from={from} lang={lang} footer={Footer} />
        </div>
      </div>

      {/* ── Desktop right-panel content ───────────────────────── */}
      <div className="hidden lg:flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-default font-display tracking-tight">
            Create your Shopi account
          </h1>
          <p className="app-subcopy mt-1.5">
            Takes less than a minute.
          </p>
        </div>
        {SocialTop}
        <RegisterForm from={from} lang={lang} footer={Footer} />
      </div>
    </AuthDesktopShell>
  );
}
