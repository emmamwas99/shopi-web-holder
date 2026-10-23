// NEXT_PUBLIC_NODE_ENV distinguishes production from preview/staging builds,
// where NODE_ENV is also "production". Fall back to NODE_ENV when the deploy
// marker is not configured.
const isProductionEnvironment =
  (process.env.NEXT_PUBLIC_NODE_ENV ?? process.env.NODE_ENV) === "production";

// Production keeps the established paste-a-link importer. Other environments
// use the connected TikTok account and video browser.
export const SHOW_TIKTOK_CREATE_OPTIONS = isProductionEnvironment;
export const SHOW_CONNECTED_TIKTOK_IMPORT = !isProductionEnvironment;
