import { isValidLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import { AuthDesktopShell } from "@/features/auth/components/AuthDesktopShell";
import { AuthMobileScreen } from "@/features/auth/components/AuthMobileScreen";

export const metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  return (
    <AuthDesktopShell lang={lang}>
      {/* ── Mobile layout ─────────────────────────────────────── */}
      <AuthMobileScreen
        lang={lang}
        backHref={`/${lang}/auth/login`}
        title="Forgot your password?"
        subtitle="Enter your email and we’ll send you a link to reset it."
      >
        <ForgotPasswordForm lang={lang} />
      </AuthMobileScreen>

      {/* ── Desktop right-panel content ───────────────────────── */}
      <div className="hidden lg:flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-default font-display tracking-tight">
            Forgot your password?
          </h1>
          <p className="mt-1.5 text-base text-muted leading-relaxed">
            Enter your email and we&rsquo;ll send you a link to reset it.
          </p>
        </div>
        <ForgotPasswordForm lang={lang} />
      </div>
    </AuthDesktopShell>
  );
}
