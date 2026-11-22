import type { ToolPageSchemaInput, ToolSection } from "./tool-pages";

/**
 * The Facebook video downloader page: one page for videos and Reels.
 *
 * Google autocomplete for Kenya (gl=ke, 22 Nov 2026, 27 seeds expanded a–z,
 * 3,275 suggestions; seeds in docs/seo-audit/seeds/facebook.txt, clusters in
 * docs/seo-audit/keyword-map.md) puts the demand in these shapes:
 * - "without watermark" is the biggest cluster (breadth 713) even though
 *   Facebook doesn't watermark files — the top suggestion overall is
 *   "download facebook video without watermark online". The copy answers it
 *   honestly: nothing is added, a creator's own logo stays.
 * - by link / URL (445), Reels (286), HD (274), gallery and Android (272),
 *   PC and "chrome extension" (231), iPhone (84).
 * - MP3 (606), Stories (329), private (223), live (141) and groups (44) are
 *   things the tool can't do. They get a plain "what it can't download"
 *   section and FAQ answers instead of a page pretending otherwise.
 * Reels are the same job as videos (an MP4 from a link), so they share this
 * page; a separate Reels page would compete with it for the same queries.
 *
 * Rules for the copy:
 * - Every capability claimed is something the API's /tools/facebook-save does
 *   today: public videos and Reels only; SD H.264 MP4, plus the HD file when
 *   Facebook has one (H.264, VP9 or AV1, often 720p or 1080p — no "4K"
 *   claims); sound included; no MP3; nothing stored.
 * - Questions are phrased the way people type them, because an FAQ answer is
 *   only quoted when it restates the question.
 * - Bump FACEBOOK_TOOLS_UPDATED when copy or behaviour changes; it feeds
 *   dateModified and the visible "Updated" line.
 */

export const FACEBOOK_TOOLS_UPDATED = "2026-11-22";

export type FacebookToolSlug = "facebook-video-downloader";

export type FacebookToolPageData = ToolPageSchemaInput & {
  slug: FacebookToolSlug;
  eyebrow: string;
  h1: string;
  /** Answer-first: the one paragraph an answer engine can quote whole. */
  intro: string;
  /** Short name for links and breadcrumbs. */
  shortName: string;
  sections: ToolSection[];
  faqHeading: string;
  faq: { q: string; a: string }[];
  keywords: string[];
  /** og:image alt; the card itself is drawn by opengraph-image.tsx. */
  ogAlt: string;
};

export const facebookToolPath = (slug: FacebookToolSlug) => `/${slug}` as const;

const VIDEO: FacebookToolPageData = {
  slug: "facebook-video-downloader",
  title: "Facebook Video Downloader — HD Videos & Reels, No Watermark",
  description:
    "Free Facebook video downloader: paste a link to save any public Facebook video or Reel as an MP4, in HD when available. No watermark, app or sign-up.",
  eyebrow: "Free Facebook video downloader",
  h1: "Download Facebook videos and Reels in HD",
  intro:
    "Paste a Facebook video or Reel link below to save it to your phone or computer as an MP4. You get a standard file that plays everywhere and, when Facebook has one, a sharper HD file, often 720p or 1080p. Nothing is added to the video, so there's no watermark. It's free, it runs in your browser, and there's no app to install, account to create or Facebook login.",
  shortName: "Facebook video downloader",
  appName: "Shopi Facebook Video Downloader",
  featureList: [
    "Download public Facebook videos and Reels as MP4, with sound",
    "HD file when Facebook has one, often 720p or 1080p",
    "Shows each file's quality, size and format before you download",
    "Works with links from the Facebook app, facebook.com, m.facebook.com and fb.watch",
    "No watermark added",
    "Works in iPhone, Android and computer browsers",
    "No app, sign-up, Facebook login or ads",
  ],
  howToName: "How to download a Facebook video or Reel",
  steps: [
    {
      title: "Copy the video's link",
      body: "In the Facebook app, tap Share on the video or Reel, then Copy link. On a computer, open the video and copy the address from your browser bar.",
    },
    {
      title: "Paste it and tap Get video",
      body: "Paste the link into the box above, or tap Paste. The video's cover, caption and page name appear, so you can check it's the right one.",
    },
    {
      title: "Tap Download video (MP4) or Download HD",
      body: "The file saves straight to your device. Download video (MP4) is the file that plays everywhere; Download HD is the sharper copy, when Facebook has one.",
    },
  ],
  sections: [
    {
      kind: "table",
      id: "mp4-or-hd",
      heading: "MP4 or HD: which should you download?",
      intro:
        "Facebook keeps most videos in a standard and an HD version, and the tool offers both when they exist. Each button shows the file's quality and size, and the HD one says when it isn't H.264.",
      head: ["", "Download video (MP4)", "Download HD"],
      rows: [
        ["Format", "H.264 MP4 with sound", "H.264, VP9 or AV1 MP4 with sound, depending on the video"],
        ["Picture", "Standard quality, often 360p", "Sharper, often 720p or 1080p"],
        [
          "Plays on",
          "Every phone, computer and app, including WhatsApp status",
          "H.264 plays everywhere. VP9 and AV1 play in Chrome, on Android and in VLC, but often not on an iPhone",
        ],
        ["Best for", "Reposting anywhere without surprises", "Keeping the best copy"],
      ],
      note: "Not sure? Take the MP4. If a video has no HD version, the tool shows only the MP4.",
    },
    {
      kind: "cards",
      id: "where-it-goes",
      heading: "Where your downloaded Facebook video goes",
      intro:
        "The file is named shopi-facebook- followed by the video's number, so it's easy to find. Very long videos (over 150 MB) download straight from Facebook and keep Facebook's own file name.",
      cards: [
        {
          title: "On iPhone or iPad",
          body: "Safari saves it to the Downloads folder in the Files app. Open Files, go to Downloads, tap the video, then tap Share and Save Video to add it to Photos.",
        },
        {
          title: "On Android",
          body: "Chrome saves it to your Downloads folder. Open your Files app, or look for the Downloads album in your gallery, and it's ready to post to WhatsApp status.",
        },
        {
          title: "On a computer",
          body: "It lands in your Downloads folder and plays in any video player. If an HD file won't open, play it in VLC or download the MP4 instead.",
        },
      ],
    },
    {
      kind: "list",
      id: "which-links",
      heading: "Which Facebook links work",
      intro: "Any link to a single public video works, however you copied it:",
      items: [
        "Reels: facebook.com/reel/… links, or the link you get from Share, then Copy link, on a Reel.",
        "Videos on a page or profile: facebook.com/{page}/videos/… links.",
        "Watch links: facebook.com/watch/?v=… and facebook.com/video.php?v=… links.",
        "Short links: fb.watch/… links, and facebook.com/share/… links copied in the Facebook app.",
        "Mobile links: m.facebook.com and web.facebook.com links work as well as www.facebook.com.",
      ],
      closing:
        "You can paste a whole message with the link in it. The tool finds the link and ignores the rest.",
    },
    {
      kind: "list",
      id: "seller-uses",
      heading: "What sellers use a saved Facebook video for",
      intro:
        "Most people who save Facebook videos are reposting their own: a product video from their page, or a Reel they made for their shop.",
      items: [
        "Post the video to WhatsApp status for the customers who already have your number",
        "Reuse the same clip on TikTok, Instagram Reels or YouTube Shorts",
        "Add it to a Shopi listing so buyers near you can message you about the item",
        "Keep a backup of your page's videos, in case you ever lose access to the account",
      ],
    },
    {
      kind: "list",
      id: "cant-download",
      heading: "What the Facebook downloader can't save",
      intro:
        "The tool only sees what anyone can see on Facebook without logging in, so these won't work:",
      items: [
        "Private videos, and videos shared only with friends.",
        "Most videos in groups, because Facebook asks for a login before it shows them.",
        "Stories. They're only shown to people who are logged in, and disappear after 24 hours.",
        "A live video while it's still live. Once the broadcast ends and is kept as a video, try its link.",
        "Videos sent in Messenger chats.",
        "Just the sound as an MP3. The tool saves the video as an MP4, with the sound included.",
      ],
    },
    {
      kind: "list",
      id: "not-downloading",
      heading: "Why won't a Facebook video download?",
      intro: "If a link won't work here, it's usually one of these:",
      items: [
        "The video isn't public. If you can't watch it on facebook.com without logging in, the tool can't fetch it either.",
        "It was deleted, or the page or profile that posted it is gone.",
        "The link isn't a video. Links to a profile, a page, a photo or a text post don't point at one video; open the video itself and copy its link.",
        "Facebook asked for a login. That sometimes happens for a few minutes even with public videos, so wait and try again.",
        "The HD file won't play. It's probably VP9 or AV1; download the MP4 instead, or play it in VLC.",
        "Your phone storage is full. Free some space, then tap the download button again.",
      ],
    },
    {
      kind: "list",
      id: "safe",
      heading: "Is it safe to use a Facebook video downloader?",
      intro:
        "The risk with most downloaders isn't the video, it's everything around it. This one is built to avoid that:",
      items: [
        "No app, APK or browser extension to install. Downloader apps from outside the Play Store or App Store, and extensions that ask to read every website, are common ways to get malware or lose an account.",
        "No sign-up, and no Facebook login. Never type your Facebook password into a downloader site.",
        "No pop-ups, redirects or ads. If a downloader opens new tabs or asks you to allow notifications, close it.",
        "Shopi doesn't keep a copy. The video goes from Facebook's servers to your device.",
      ],
    },
  ],
  faqHeading: "Facebook video downloader questions",
  faq: [
    {
      q: "Is this Facebook video downloader free?",
      a: "Yes. It's free, with no sign-up, no app to install and no ads. Shopi doesn't add a watermark or logo to the video either.",
    },
    {
      q: "How do I download a Facebook video without a watermark?",
      a: "Copy the video's link in Facebook (Share, then Copy link), paste it into the box on this page, tap Get video, then tap Download video (MP4). Facebook doesn't put a watermark on the file and Shopi doesn't add one, so the video saves clean. A logo the creator put into the video itself stays, because it's part of the picture.",
    },
    {
      q: "Can a video from Facebook be downloaded?",
      a: "Yes, if it's public, meaning anyone can watch it on facebook.com without logging in. Videos and Reels from pages and public profiles download here as MP4 files. Private, friends-only and most group videos can't be downloaded here.",
    },
    {
      q: "How do I download a Facebook video using its link?",
      a: "Copy the link (Share, then Copy link in the app, or the address bar on a computer), paste it into the box on this page and tap Get video. Links from the Facebook app, facebook.com, m.facebook.com and fb.watch all work.",
    },
    {
      q: "Can I download Facebook videos in HD?",
      a: "Yes, when Facebook has an HD version, which is often 720p or 1080p. Tap Download HD. Some HD files are VP9 or AV1 rather than H.264; the button says so, and if one won't play on your phone, download the MP4 instead.",
    },
    {
      q: "How do I download Facebook Reels?",
      a: "The same way as any video: on the Reel, tap Share, then Copy link, paste the link here and tap Get video. Reels save as MP4 files, in HD when Facebook has it.",
    },
    {
      q: "How do I save a Facebook video to my iPhone?",
      a: "Open this page in Safari, paste the link and tap Download video (MP4). The video saves to Downloads in the Files app; open it there and tap Share, then Save Video, to move it into Photos. If the HD file is VP9 or AV1, take the MP4, which plays on every iPhone.",
    },
    {
      q: "How do I save a Facebook video to my gallery on Android?",
      a: "Download it here in Chrome and it goes to your Downloads folder. Most Android phones show it in the gallery under Downloads, or you can find it in the Files app.",
    },
    {
      q: "How do I download Facebook videos on a PC or laptop?",
      a: "Open the video on facebook.com, copy the address from the browser bar, paste it into the box on this page and tap Download video (MP4) or Download HD. The file goes to your Downloads folder.",
    },
    {
      q: "Do I need an app or a Chrome extension to download Facebook videos?",
      a: "No. This page works in any browser on your phone or computer, so there's nothing to install. Downloader APKs from outside the Play Store, and browser extensions that ask to read every website you visit, can put your phone or your Facebook account at risk.",
    },
    {
      q: "Can I download a private Facebook video or a Story?",
      a: "No. The tool only works with public videos and Reels. Private and friends-only videos, most group videos and Stories need a Facebook login to watch, so they can't be fetched.",
    },
    {
      q: "Can you download a Facebook live video?",
      a: "Not while it's live. After the broadcast ends and the page keeps it as a video, copy its link and paste it here like any other video.",
    },
    {
      q: "Can I convert a Facebook video to MP3?",
      a: "Not with this tool. It saves Facebook videos as MP4 files, with the sound included.",
    },
    {
      q: "Do I need a Facebook account to download a video?",
      a: "No. You only need the link to a public video. You don't sign in to Facebook or to Shopi.",
    },
    {
      q: "Is it legal to download Facebook videos?",
      a: "Saving your own videos is fine. Downloading someone else's video and reposting it without their permission can infringe their copyright and goes against Facebook's terms, so only save videos you made or have permission to use.",
    },
    {
      q: "Does Shopi keep a copy of the videos I download?",
      a: "No. The file goes from Facebook's servers to your device, and Shopi doesn't store it.",
    },
  ],
  keywords: [
    "Facebook video downloader",
    "FB video downloader",
    "download Facebook video",
    "Facebook downloader without watermark",
    "download Facebook video without watermark",
    "Facebook video downloader HD",
    "Facebook Reels downloader",
    "download Facebook Reels",
    "save Facebook video",
    "download Facebook video using link",
    "save Facebook video to gallery",
    "download Facebook video on iPhone",
    "Facebook to MP4",
    "Facebook video downloader Kenya",
  ],
  ogAlt: "Facebook Video Downloader — save Facebook videos and Reels in HD, no watermark",
};

export const facebookToolPages: FacebookToolPageData[] = [VIDEO];

export function getFacebookToolPage(slug: FacebookToolSlug): FacebookToolPageData {
  return facebookToolPages.find((page) => page.slug === slug)!;
}
