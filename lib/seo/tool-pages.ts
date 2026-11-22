/**
 * Shared shape of the free-tool pages (TikTok tools in tiktok-tools.ts, the
 * Facebook video downloader in facebook-tools.ts). Each page is data; the
 * page components lay it out tool-first and turn it into structured data.
 */

/** A content block under the tool: cards, a comparison table or a list. */
export type ToolSection =
  | {
      kind: "cards";
      id: string;
      heading: string;
      intro?: string;
      cards: { title: string; body: string }[];
    }
  | {
      kind: "table";
      id: string;
      heading: string;
      intro?: string;
      head: string[];
      rows: string[][];
      note?: string;
    }
  | {
      kind: "list";
      id: string;
      heading: string;
      intro?: string;
      items: string[];
      closing?: string;
    };

/** What a tool page needs for its WebPage, WebApplication and HowTo schema. */
export type ToolPageSchemaInput = {
  /** <title>; the layout appends " | Shopi". */
  title: string;
  description: string;
  /** Name of the WebApplication in structured data. */
  appName: string;
  featureList: string[];
  howToName: string;
  steps: { title: string; body: string }[];
};
