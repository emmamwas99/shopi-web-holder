Shopi is a social-commerce marketplace built with Next.js.

## Project structure

Locale routes are split by responsibility with [route groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups), so the code is easy to navigate without adding folders to public URLs:

```text
app/[lang]/
├── (marketing)/       # Homepage, campaigns, referrals, blog, SEO and legal pages
├── (app)/
│   ├── (shell)/       # The signed-in marketplace experience and shared app chrome
│   └── auth/          # Sign-in, registration and account recovery
└── layout.tsx         # Shared locale document, analytics and metadata
```

Reusable UI lives in `components/`, domain-specific product code lives in `features/`, and shared framework or data helpers live in `lib/`.

## Brand palette

The homepage is the source of truth for Shopi's three core brand colors. They are defined in `app/globals.css` and exposed through matching Tailwind utilities:

- Primary `#d81470` (`primary`) for calls to action and active states.
- Secondary `#112126` (`secondary`) for strong dark brand surfaces.
- Tertiary `#e7f4ed` (`tertiary`) for soft highlighted surfaces.

Orange (`highlight`) and purple (`accent`) are supporting illustration and data-visualization colors. Semantic success, warning, and error colors remain separate because they communicate product state.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Blog content: SEO checks and freshness

Blog posts live in `lib/blog.ts`. Run the audit before merging content changes, and once a month:

```bash
npm run seo:audit                    # add -- --stale-days=120 to tighten the review window
```

It fails on hard rules: a meta description over 155 characters, `primaryKeyword` missing from the title, lead, body or description, a duplicate title, or a broken `/blog/` link. It warns about posts under ~1500 words, posts with fewer than two internal links, and posts not reviewed in 180 days.

For each post flagged as due for review:

1. Re-check anything that goes out of date: NTSA/TIMS steps, fees, prices, app features and screenshots of the flow.
2. Update or expand the sections that have drifted, and add links to any newer posts or landing pages on the same topic.
3. Set `updatedAt` to the date of the edit. This updates the sitemap `lastmod`, the Article schema `dateModified`, Open Graph `modifiedTime` and the "Updated" date on the page. Don't bump it for typo fixes.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
