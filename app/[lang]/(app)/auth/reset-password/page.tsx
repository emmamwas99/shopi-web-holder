import { isValidLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { AuthDesktopShell } from "@/features/auth/components/AuthDesktopShell";
import { AuthMobileScreen } from "@/features/auth/components/AuthMobileScreen";

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
      <AuthMobileScreen
        backHref={`/${lang}/auth/login`}
        title="Set a new password"
        subtitle="Choose a strong password you don’t use anywhere else."
      >
        <ResetPasswordForm token={token} lang={lang} />
      </AuthMobileScreen>

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
