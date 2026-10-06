import { ContentDetailSheet } from "@/features/feed/components/ContentDetailSheet";

type Props = { params: Promise<{ lang: string; id: string }> };

export default async function ContentDetailModalPage({ params }: Props) {
  const { lang, id } = await params;

  return (
    <>
      {/* Tells scroll restoration this listing is drawn OVER the page that
          opened it, so that page must stay exactly where it is. Rendered here
          rather than inside the sheet because it has to be in the DOM in the
          same commit as the URL change, before the sheet's client-side mount. */}
      <span data-route-overlay="" hidden />
      <ContentDetailSheet id={id} lang={lang} />
    </>
  );
}
