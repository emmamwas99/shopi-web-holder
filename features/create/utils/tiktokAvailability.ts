// TikTok in the create flow is the paste-a-link importer, everywhere: phone
// and desktop, production and preview alike. Shopi doesn't offer "connect
// your TikTok account" to sellers, so that browser stays off unless a build
// opts in to work on it (NEXT_PUBLIC_TIKTOK_CONNECTED_IMPORT=true).
//
// It used to follow the environment instead (link importer in production,
// account browser everywhere else), which made desktop and local builds show
// sellers an option the product doesn't have.
export const SHOW_CONNECTED_TIKTOK_IMPORT =
  process.env.NEXT_PUBLIC_TIKTOK_CONNECTED_IMPORT === "true";
export const SHOW_TIKTOK_CREATE_OPTIONS = !SHOW_CONNECTED_TIKTOK_IMPORT;
