import { isValidLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";

import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { AuthDesktopShell } from "@/features/auth/components/AuthDesktopShell";
import { ChevronLeftIcon } from "lucide-react";
import { ShopiLogo } from "@/features/auth/components/AuthIcons";

export const metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  const sp = await searchParams;
  const token = typeof sp?.["token"] === "string" ? sp["token"] : undefined;

  return (
    <AuthDesktopShell lang={lang}>
      {/* ── Mobile layout ─────────────────────────────────────── */}
      <div className="relative mx-auto flex h-svh max-w-107.5 flex-col overflow-hidden bg-app lg:hidden">
        <div className="flex items-center justify-between">
          <Link
            href={`/${lang}/auth/login`}
            aria-label="Back"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface text-muted active:opacity-70 transition-opacity"
          >
            <ChevronLeftIcon />
          </Link>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl bg-[rgb(var(--brand-primary)/0.07)]"
        />

        <div className="flex w-full justify-center items-center px-5 pt-5 pb-1 shrink-0">
          <ShopiLogo height={80} />
        </div>

        <div className="px-6 pt-4 pb-3 shrink-0 text-center">
          <h1 className="text-2xl font-bold leading-tight text-default font-display tracking-tight">
            Set a new password
          </h1>
          <p className="mt-1 text-sm text-muted">
            Choose a strong password you don&rsquo;t use anywhere else.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <ResetPasswordForm token={token} lang={lang} />
        </div>
      </div>

      {/* ── Desktop right-panel content ───────────────────────── */}
      <div className="hidden lg:flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-default font-display tracking-tight">
            Set a new password
          </h1>
          <p className="mt-1.5 text-base text-muted leading-relaxed">
            Choose a strong password you don&rsquo;t use anywhere else.
          </p>
        </div>
        <ResetPasswordForm token={token} lang={lang} />
      </div>
    </AuthDesktopShell>
  );
}
