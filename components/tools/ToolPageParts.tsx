import { siteConfig } from "@/config/site";
import type { ToolPageSchemaInput, ToolSection } from "@/lib/seo/tool-pages";

/**
 * Pieces shared by the free-tool pages (TiktokToolPage, FacebookToolPage):
 * the type scale, the content-section renderer and the page's structured
 * data. Each page keeps its own layout around them.
 */

export const TOOL_H2 =
  "mb-3 font-display text-[1.35rem] font-bold leading-tight text-foreground md:text-[1.5rem]";
export const TOOL_BODY = "text-[0.95rem] leading-[1.7] text-muted md:text-[0.98rem]";

export function ToolSectionBlock({ section }: { section: ToolSection }) {
  return (
    <section id={section.id} className="mb-12 scroll-mt-24">
      <h2 className={TOOL_H2}>{section.heading}</h2>
      {section.intro ? <p className={`mb-5 max-w-176 ${TOOL_BODY}`}>{section.intro}</p> : null}

      {section.kind === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {section.cards.map((card) => (
            <div key={card.title} className="rounded-lg border border-border bg-elevated p-4 sm:p-5">
              <h3 className="mb-1.5 font-semibold text-foreground">{card.title}</h3>
              <p className="text-[0.92rem] leading-[1.65] text-muted">{card.body}</p>
            </div>
          ))}
        </div>
      ) : null}

      {section.kind === "table" ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-120 border-collapse text-left text-[0.9rem]">
              <thead className="bg-elevated">
                <tr>
                  {section.head.map((cell, i) => (
                    <th
                      key={`${cell}-${i}`}
                      scope="col"
                      className="border-b border-border px-3 py-2.5 font-semibold text-foreground"
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map(([label, ...cells]) => (
                  <tr key={label} className="border-b border-border last:border-b-0">
                    <th scope="row" className="px-3 py-2.5 align-top font-semibold text-foreground">
                      {label}
                    </th>
                    {cells.map((cell, i) => (
                      <td key={i} className="px-3 py-2.5 align-top text-muted">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {section.note ? <p className={`mt-3 ${TOOL_BODY}`}>{section.note}</p> : null}
        </>
      ) : null}

      {section.kind === "list" ? (
        <>
          <ul className={`flex flex-col gap-2.5 pl-5 ${TOOL_BODY} [&>li]:list-disc`}>
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {section.closing ? (
            <p className="mt-4 text-[0.98rem] font-medium leading-[1.7] text-foreground">
              {section.closing}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

/**
 * WebPage → WebApplication → HowTo for a tool page. The WebPage's main entity
 * is the tool itself, so engines read the page as "a free web app that does X"
 * rather than an article about X. Breadcrumbs and FAQPage are added by the
 * page, which knows its trail and questions.
 */
export function toolPageSchemas(
  page: ToolPageSchemaInput,
  canonical: string,
  dateModified: string,
): object[] {
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: page.title,
    description: page.description,
    inLanguage: "en-KE",
    dateModified,
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    publisher: { "@id": `${siteConfig.url}/#organization` },
    mainEntity: { "@id": `${canonical}#app` },
  };

  const appSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${canonical}#app`,
    name: page.appName,
    url: canonical,
    description: page.description,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any (runs in a web browser)",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "KES" },
    featureList: page.featureList,
    provider: { "@id": `${siteConfig.url}/#organization` },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${canonical}#howto`,
    name: page.howToName,
    step: page.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.title,
      text: step.body,
    })),
  };

  return [webPageSchema, appSchema, howToSchema];
}
