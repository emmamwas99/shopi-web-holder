/**
 * Shopi Agent (the AI-guided create flow) is paused while its AI provider
 * billing is sorted. The chooser keeps showing it, disabled with a short
 * reason, and every way into /upload/create-ai falls back to the manual
 * composer. Flip back to true to bring it back.
 */
export const SHOPI_AGENT_AVAILABLE = false;

export const SHOPI_AGENT_PAUSED_LABEL = "Under maintenance";
export const SHOPI_AGENT_PAUSED_REASON =
  "Agent is under maintenance. Use Manual for now.";
