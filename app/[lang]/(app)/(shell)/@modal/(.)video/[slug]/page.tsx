import { ImmersiveVideoViewer } from "@/features/feed/components/immersive/ImmersiveVideoViewer";

type Props = { params: Promise<{ lang: string; slug: string }> };

/**
 * Intercepts /[lang]/video/[slug] when it is opened from inside the app, so the
 * viewer renders in the @modal slot with the feed still mounted behind it.
 * That is what lets the back button restore the feed's exact scroll position
 * instead of remounting and refetching it.
 */
export default async function VideoModalPage({ params }: Props) {
  const { lang, slug } = await params;

  return (
    <>
      {/* The feed behind the viewer must not move — see the same marker in
          (.)content/[id]/page.tsx. */}
      <span data-route-overlay="" hidden />
      <ImmersiveVideoViewer seed={slug} lang={lang} />
    </>
  );
}
