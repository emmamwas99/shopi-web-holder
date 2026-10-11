import { Suspense } from "react";
import { DashboardModal } from "@/features/dashboard/components/DashboardModal";

type Props = { params: Promise<{ lang: string }> };

export default async function DashboardModalPage({ params }: Props) {
  const { lang } = await params;
  return <Suspense fallback={null}><DashboardModal lang={lang} /></Suspense>;
}
