import { Suspense } from "react";
import { DashboardModal } from "@/features/dashboard/components/DashboardModal";

type Props = { params: Promise<{ lang: string }> };

export default async function DashboardPage({ params }: Props) {
  const { lang } = await params;
  // Intercepted navigation keeps the previous page behind this dialog. On a
  // refresh there is no intercepted route state, so render the same dialog
  // directly instead of falling back to a plain dashboard page.
  return <Suspense fallback={null}><DashboardModal lang={lang} forceOpen /></Suspense>;
}
