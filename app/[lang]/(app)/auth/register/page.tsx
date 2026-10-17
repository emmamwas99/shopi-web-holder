import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { isValidLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Divider } from "@/features/auth/components/AuthIcons";
import { SocialButtons } from "@/features/auth/components/SocialButtons";
import { AuthDesktopShell } from "@/features/auth/components/AuthDesktopShell";
import { AuthMobileScreen } from "@/features/auth/components/AuthMobileScreen";

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

  // The 18+/Terms notice is already in the form, right above "Create account".
  const Footer = (
    <p className="mt-1 text-center text-sm text-muted">
      Already a member?{" "}
      <Link href={loginHref} className="font-semibold text-primary">
        Sign in
      </Link>
    </p>
  );

  return (
    <AuthDesktopShell lang={lang} from={from}>
      {/* ── Mobile layout ─────────────────────────────────────── */}
      <AuthMobileScreen
        backHref={`/${lang}/auth/auth-welcome${from ? `?from=${encodeURIComponent(from)}` : ""}`}
        title="Create your account"
        subtitle="Takes less than a minute."
      >
        {SocialTop}
        <RegisterForm from={from} lang={lang} footer={Footer} />
      </AuthMobileScreen>

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
