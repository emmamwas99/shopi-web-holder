import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Feed cards must size media with svh, never dvh. dvh changes whenever iOS
  // Safari's toolbar collapses or expands mid-scroll, which resizes every card
  // above the viewport and makes the feed jump when scrolling back up. This
  // line has been reverted to dvh by merges four times, so fail loudly.
  {
    files: ["features/feed/components/PostCard.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/dvh/]",
          message:
            "Use svh, not dvh, for feed media: dvh resizes cards as the iOS toolbar collapses and makes the feed jump on scroll.",
        },
        {
          selector: "TemplateElement[value.raw=/dvh/]",
          message:
            "Use svh, not dvh, for feed media: dvh resizes cards as the iOS toolbar collapses and makes the feed jump on scroll.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
