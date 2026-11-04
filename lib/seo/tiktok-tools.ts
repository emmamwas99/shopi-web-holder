/**
 * The TikTok tool pages: one saver, three jobs, three search intents.
 *
 * Google autocomplete for Kenya (gl=ke, 4 Nov 2026, 27 seeds expanded a–z,
 * ~6,200 suggestions; see docs/seo-audit/keyword-map.md) splits TikTok
 * downloading into three clusters that each deserve their own answer:
 * - video without watermark / HD / MP4 (the head term),
 * - MP3, audio and sound ("tiktok to mp3", "how do i download a tiktok
 *   sound", "tiktok audio download for ringtone") — the largest by breadth,
 * - photo posts and slideshows ("tiktok slideshow downloads", "download
 *   tiktok photos", "tiktok photo download without watermark").
 * Each page runs the same tool in a different mode (TiktokSaverTool `mode`),
 * so every page does exactly what its title says.
 *
 * Rules for the copy:
 * - Every capability claimed is something /api/tiktok-save does today:
 *   public posts only; H.264 MP4, plus HEVC "HD" when TikTok has it; the
 *   sound as MP3 at the quality TikTok serves (no "320kbps" claims); photo
 *   posts as JPGs, singly or as a ZIP; nothing stored.
 * - Questions are phrased the way people type them, because an FAQ answer
 *   is only quoted when it restates the question.
 * - Bump LAST_UPDATED when copy or behaviour changes; it feeds dateModified
 *   and the visible "Updated" line.
 */

export const TIKTOK_TOOLS_UPDATED = "2026-11-04";

export type TiktokToolSlug =
  | "tiktok-downloader"
  | "tiktok-mp3-downloader"
  | "tiktok-photo-downloader";

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

export type TiktokToolPageData = {
  slug: TiktokToolSlug;
  mode: "video" | "audio" | "photo";
  /** <title>; the layout appends " | Shopi". */
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  /** Answer-first: the one paragraph an answer engine can quote whole. */
  intro: string;
  /** Short name for links between the tools and breadcrumbs. */
  shortName: string;
  /** Name of the WebApplication in structured data. */
  appName: string;
  featureList: string[];
  howToName: string;
  steps: { title: string; body: string }[];
  sections: ToolSection[];
  faqHeading: string;
  faq: { q: string; a: string }[];
  keywords: string[];
  /** og:image alt; the card itself is drawn by opengraph-image.tsx. */
  ogAlt: string;
};

export const tiktokToolPath = (slug: TiktokToolSlug) => `/${slug}` as const;

// ── Shared blocks ────────────────────────────────────────────────────────────

const DEVICES_VIDEO: ToolSection = {
  kind: "cards",
  id: "where-it-goes",
  heading: "Where your downloaded TikTok video goes",
  intro:
    "The file is named shopi-tiktok- followed by the post's number, so it's easy to find.",
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
      body: "It lands in your Downloads folder. The MP4 plays in any video player; if the HD file won't open on Windows, play it in VLC or download the MP4 instead.",
    },
  ],
};

const SAFETY_ITEMS = [
  "No app or APK to install. Downloader apps from outside the Play Store or App Store are a common way to get malware onto a phone.",
  "No sign-up, and no TikTok login. Never type your TikTok password into a downloader site.",
  "No pop-ups, redirects or ads. If a downloader opens new tabs or asks you to allow notifications, close it.",
  "Nothing is stored. The file goes from TikTok's servers to your device.",
];

// ── Video ────────────────────────────────────────────────────────────────────

const VIDEO: TiktokToolPageData = {
  slug: "tiktok-downloader",
  mode: "video",
  title: "TikTok Downloader — Save HD Videos Without Watermark",
  description:
    "Free TikTok downloader: paste a link to save a public TikTok as an MP4 without the watermark, in HD when available. Save the sound as MP3 too. No app.",
  eyebrow: "Free TikTok downloader",
  h1: "Download TikTok videos in HD, without the watermark",
  intro:
    "Paste a TikTok link below to save the video to your phone or computer without the TikTok watermark. You get an MP4 that plays everywhere, plus the sharper HD file when TikTok has one, and you can save the sound as an MP3 too. It's free, it runs in your browser, and there is no app to install or account to create.",
  shortName: "TikTok video downloader",
  appName: "Shopi TikTok Video Downloader",
  featureList: [
    "Download public TikTok videos as MP4 without the watermark",
    "HD (HEVC) file when TikTok has one",
    "Save the video's sound as MP3",
    "Save photo posts and slideshows as JPGs",
    "Works in iPhone, Android and computer browsers",
    "No app, sign-up or ads",
  ],
  howToName: "How to download a TikTok video without the watermark",
  steps: [
    {
      title: "Copy the TikTok link",
      body: "In the TikTok app, open the video, tap Share, then Copy link. On a computer, copy the address from your browser bar.",
    },
    {
      title: "Paste it and tap Get video",
      body: "Paste the link into the box above, or tap Paste. The video's cover, caption and creator appear, so you can check it's the right one.",
    },
    {
      title: "Tap Download video (MP4) or Download HD",
      body: "The file saves straight to your device with no TikTok watermark. Download MP3 saves just the sound.",
    },
  ],
  sections: [
    {
      kind: "table",
      id: "mp4-or-hd",
      heading: "MP4 or HD: which should you download?",
      intro:
        "TikTok keeps most videos in two versions, and the tool gives you both when they exist.",
      head: ["", "Download video (MP4)", "Download HD"],
      rows: [
        ["Format", "H.264 MP4", "HEVC (H.265) MP4"],
        ["Picture", "Standard quality", "Sharper, usually a smaller file"],
        [
          "Plays on",
          "Every phone, computer and app, including WhatsApp status",
          "Recent iPhones, most Android phones and Macs; Windows may need VLC",
        ],
        ["Best for", "Reposting anywhere without surprises", "Keeping the best copy"],
      ],
      note: "Not sure? Take the MP4. If a video has no HD version, the tool shows only the MP4.",
    },
    DEVICES_VIDEO,
    {
      kind: "list",
      id: "seller-uses",
      heading: "What sellers use a clean copy for",
      intro:
        "Most people who use this tool are reposting their own content. A video without another app's logo on it looks at home wherever you share it.",
      items: [
        "Post your product video to WhatsApp status for the customers who already have your number",
        "Reuse the same clip on Instagram Reels, Facebook or YouTube Shorts",
        "Add it to a Shopi listing so buyers near you can message you about the item",
        "Keep a backup of the videos you've made, in case you ever lose access to your account",
      ],
    },
    {
      kind: "list",
      id: "not-downloading",
      heading: "Why won't a TikTok video download?",
      intro:
        "If TikTok's own Save video button is missing, or a link won't work here, it's usually one of these:",
      items: [
        "The creator turned off downloads. TikTok then hides its Save video button. Respect that: ask the creator before you reuse their video.",
        "The post is private, deleted, or restricted by age or region. Only public posts can be fetched.",
        "The link isn't a post. Profile, sound and live links don't point at one video; open the video itself and copy its link.",
        "It's a photo post. Slideshows have no video file; use the TikTok photo downloader to save the photos.",
        "Your phone storage is full. Free some space, then tap the download button again.",
      ],
    },
    {
      kind: "list",
      id: "safe",
      heading: "Is it safe to use a TikTok downloader?",
      intro:
        "The risk with most downloaders isn't the video, it's everything around it. This one is built to avoid that:",
      items: SAFETY_ITEMS,
    },
  ],
  faqHeading: "TikTok downloader questions",
  faq: [
    {
      q: "Is this TikTok downloader free?",
      a: "Yes. It's free, with no sign-up, no app to install and no ads. Shopi doesn't add a watermark or logo to the video either.",
    },
    {
      q: "How do I download a TikTok video without the watermark?",
      a: "Copy the video's link in TikTok (Share, then Copy link), paste it into the box on this page, tap Get video, then tap Download video (MP4). The file saves to your device without the TikTok watermark.",
    },
    {
      q: "Can I download TikTok videos in HD?",
      a: "Yes, when TikTok has an HD version. Tap Download HD to get it. HD files use the HEVC (H.265) format, which plays on recent phones; if one won't play on your computer, use VLC or download the MP4 instead.",
    },
    {
      q: "How do I download TikTok videos on iPhone?",
      a: "Open this page in Safari, paste the link and tap Download video (MP4). The video saves to Downloads in the Files app; open it there and tap Share, then Save Video, to move it into Photos.",
    },
    {
      q: "How do I save a TikTok video to my gallery on Android?",
      a: "Download it here in Chrome and it goes to your Downloads folder. Most Android phones show it in the gallery under Downloads, or you can find it in the Files app.",
    },
    {
      q: "How do I download TikTok videos on a PC or laptop?",
      a: "Open the video on tiktok.com, copy the address from the browser bar, paste it into the box on this page and tap Download video (MP4). The file goes to your Downloads folder.",
    },
    {
      q: "Do I need a TikTok downloader app or APK?",
      a: "No. This tool runs in your phone's browser, so there's nothing to install. Downloader APKs from outside the Play Store are a common source of malware, so it's safer to avoid them.",
    },
    {
      q: "Can I download the sound or a slideshow instead?",
      a: "Yes. Every result has a Download MP3 button for the sound, and photo posts show their photos to save. The TikTok to MP3 and TikTok photo downloader pages open the tool with those first.",
    },
    {
      q: "Do I need a TikTok account to download a video?",
      a: "No. You only need the link to a public TikTok video. You don't sign in to TikTok or to Shopi.",
    },
    {
      q: "Can I download private TikTok videos?",
      a: "No. The tool only works with public posts. Private videos, and videos that have been deleted, can't be fetched.",
    },
    {
      q: "Is it legal to download TikTok videos?",
      a: "Saving your own videos is fine. Downloading someone else's video and reposting it without their permission can infringe their copyright and goes against TikTok's terms, so only save videos you made or have permission to use.",
    },
    {
      q: "Does Shopi keep a copy of the videos I download?",
      a: "No. The file goes from TikTok's servers straight to your device and isn't stored by Shopi.",
    },
  ],
  keywords: [
    "TikTok downloader",
    "TikTok video downloader",
    "download TikTok video",
    "TikTok downloader without watermark",
    "download TikTok video without watermark HD",
    "TikTok downloader HD",
    "TikTok MP4 download",
    "save TikTok video",
    "download TikTok video on iPhone",
    "download TikTok videos on PC",
    "save TikTok video to gallery",
    "TikTok downloader Kenya",
  ],
  ogAlt: "TikTok Downloader — save TikTok videos in HD without the watermark",
};

// ── MP3 ──────────────────────────────────────────────────────────────────────

const AUDIO: TiktokToolPageData = {
  slug: "tiktok-mp3-downloader",
  mode: "audio",
  title: "TikTok to MP3 — Download TikTok Sounds and Audio Free",
  description:
    "Free TikTok to MP3: paste a TikTok link to download its sound, song or voiceover as an MP3. Works on iPhone, Android and PC, with no app or sign-up.",
  eyebrow: "TikTok to MP3",
  h1: "Download the sound from any TikTok as an MP3",
  intro:
    "Paste a TikTok link below and tap Get MP3 to save the post's sound, whether it's a song, a voiceover or original audio, as an MP3 file. It works for videos and photo slideshows, runs in your browser, and is free with no app or account.",
  shortName: "TikTok to MP3",
  appName: "Shopi TikTok to MP3",
  featureList: [
    "Download the sound of a public TikTok as MP3",
    "Works for videos and photo slideshows",
    "Shows the sound's name and creator",
    "Works in iPhone, Android and computer browsers",
    "No app, sign-up or ads",
  ],
  howToName: "How to download a TikTok sound as an MP3",
  steps: [
    {
      title: "Copy the TikTok link",
      body: "Open the video or slideshow that uses the sound, tap Share, then Copy link.",
    },
    {
      title: "Paste it and tap Get MP3",
      body: "Paste the link into the box above, or tap Paste. You'll see the post and the name of its sound.",
    },
    {
      title: "Tap Download MP3",
      body: "The MP3 saves to your device, named after the post so you can find it again.",
    },
  ],
  sections: [
    {
      kind: "cards",
      id: "what-you-get",
      heading: "What the MP3 contains",
      cards: [
        {
          title: "The sound as TikTok has it",
          body: "You get the audio attached to the post, at the quality TikTok serves it. Most TikTok sounds are a clip of a song, so the MP3 is the length of that clip, not the full track.",
        },
        {
          title: "Its name and creator",
          body: "The tool shows the sound's title and creator, such as \"original sound\" or the song and artist. Use them to find the full song on a music app.",
        },
        {
          title: "From videos and slideshows",
          body: "Photo slideshows have a sound too. Paste a slideshow link and the MP3 is the music that plays over the photos.",
        },
      ],
    },
    {
      kind: "cards",
      id: "where-it-goes",
      heading: "Where your MP3 goes",
      cards: [
        {
          title: "On iPhone",
          body: "Safari saves it to Downloads in the Files app, where it plays straight away. To use it in another app, open it in Files and tap Share.",
        },
        {
          title: "On Android",
          body: "Chrome saves it to Downloads. Your music player or Files app will find it there.",
        },
        {
          title: "On a computer",
          body: "It lands in your Downloads folder and plays in any media player.",
        },
      ],
    },
    {
      kind: "list",
      id: "ringtone",
      heading: "Using a TikTok sound as a ringtone",
      items: [
        "On Android, open Settings, then Sound (or Sounds and vibration), then Ringtone, and pick the MP3 from your files. The menu names vary between phone makers.",
        "On iPhone, Settings can't use an MP3 directly. Import it into GarageBand and share it from there as a ringtone, or add it with a computer.",
      ],
    },
    {
      kind: "list",
      id: "music-rights",
      heading: "Music belongs to the people who made it",
      items: [
        "Saving a sound to listen to or to make your own video at home is one thing. Using a song in an ad or a product video without a licence can break copyright.",
        "Business accounts on TikTok can choose music from TikTok's Commercial Music Library, which is cleared for promotional use.",
        "Only download original sounds and voiceovers you made, or have the creator's permission to use.",
      ],
    },
  ],
  faqHeading: "TikTok to MP3 questions",
  faq: [
    {
      q: "How do I convert a TikTok to MP3?",
      a: "Copy the TikTok link (Share, then Copy link), paste it into the box on this page, tap Get MP3, then tap Download MP3. The sound saves to your device as an MP3 file.",
    },
    {
      q: "Can you download TikTok audio?",
      a: "Yes. Any public TikTok video or slideshow has a sound you can save here as an MP3, without an app or an account.",
    },
    {
      q: "How do I download a TikTok sound?",
      a: "Open a video that uses the sound, copy its link, and paste it here. Tap Get MP3, then Download MP3. The tool also shows the sound's name, so you can check it's the right one.",
    },
    {
      q: "Is this TikTok to MP3 converter free?",
      a: "Yes. It's free, with no sign-up, no app and no ads.",
    },
    {
      q: "What quality is the MP3?",
      a: "It's the audio exactly as TikTok serves it for that post. The tool doesn't re-encode or upscale it, so it can't be better than the original sound.",
    },
    {
      q: "Why is the MP3 shorter than the song?",
      a: "Most TikTok sounds are a clip of a song chosen for the video, so the MP3 is the length of that clip. For the full song, use the sound's name shown in the tool to find it on a music app.",
    },
    {
      q: "Can I download the music from a TikTok slideshow?",
      a: "Yes. Paste the slideshow's link and tap Download MP3 to save the music that plays over the photos.",
    },
    {
      q: "How do I download a TikTok sound on iPhone?",
      a: "Open this page in Safari, paste the link and tap Download MP3. The file goes to Downloads in the Files app.",
    },
    {
      q: "Can I download a TikTok sound on PC?",
      a: "Yes. Copy the video's address from tiktok.com in your browser, paste it here and tap Download MP3. It saves to your Downloads folder.",
    },
    {
      q: "Can I use a TikTok sound as a ringtone?",
      a: "On Android, yes: pick the MP3 under Settings, Sound, Ringtone. On iPhone, an MP3 has to go through GarageBand or a computer to become a ringtone.",
    },
    {
      q: "Is it legal to download TikTok sounds?",
      a: "Original sounds belong to their creators, and songs to their artists and labels. Saving one for personal listening is common, but using it in ads or reposting it as your own can infringe copyright.",
    },
  ],
  keywords: [
    "TikTok to MP3",
    "TikTok MP3 downloader",
    "TikTok audio download",
    "download TikTok sound",
    "TikTok to MP3 converter",
    "how to download a TikTok sound",
    "convert TikTok to MP3",
    "TikTok song download MP3",
    "TikTok audio download for ringtone",
    "TikTok sound download iPhone",
  ],
  ogAlt: "TikTok to MP3 — download the sound from any TikTok as an MP3",
};

// ── Photos and slideshows ────────────────────────────────────────────────────

const PHOTO: TiktokToolPageData = {
  slug: "tiktok-photo-downloader",
  mode: "photo",
  title: "TikTok Photo & Slideshow Downloader — Save Photos in HD",
  description:
    "Download TikTok slideshows and photo posts: save each photo as a full-size JPG, or all at once in a ZIP, plus the sound as MP3. Free, no app, no sign-up.",
  eyebrow: "TikTok slideshow downloader",
  h1: "Download TikTok photos and slideshows",
  intro:
    "Paste the link to a TikTok photo post or slideshow to save every photo as a full-size JPG, one at a time or all together in a ZIP file, and the slideshow's sound as an MP3. The photos come without a TikTok watermark. It's free, it runs in your browser, and there's no app or sign-up.",
  shortName: "TikTok photo & slideshow downloader",
  appName: "Shopi TikTok Photo and Slideshow Downloader",
  featureList: [
    "Save every photo in a TikTok photo post as a full-size JPG",
    "Download all photos at once as a ZIP",
    "Save the slideshow's sound as MP3",
    "No TikTok watermark on the photos",
    "No app, sign-up or ads",
  ],
  howToName: "How to download a TikTok slideshow",
  steps: [
    {
      title: "Copy the slideshow's link",
      body: "Open the photo post in TikTok, tap Share, then Copy link.",
    },
    {
      title: "Paste it and tap Get photos",
      body: "Paste the link above, or tap Paste. Every photo in the post appears in order.",
    },
    {
      title: "Save one photo, or all of them",
      body: "Tap the download button on a photo to save it, or Download all photos (ZIP) to get the whole set in one file. Download MP3 saves the music.",
    },
  ],
  sections: [
    {
      kind: "cards",
      id: "what-you-get",
      heading: "What you get from a TikTok slideshow",
      cards: [
        {
          title: "The original photos",
          body: "Each photo saves as a JPG at the size TikTok stores it, which is sharper than a screenshot or a screen recording and has no TikTok watermark.",
        },
        {
          title: "All of them in one go",
          body: "Download all photos (ZIP) puts the whole post in one file, numbered in the order they appear on TikTok.",
        },
        {
          title: "The music, separately",
          body: "The slideshow's sound saves as its own MP3. The tool doesn't stitch photos and music into a video; any video editor, including TikTok's own, can do that.",
        },
      ],
    },
    {
      kind: "cards",
      id: "where-it-goes",
      heading: "Where your TikTok photos go",
      cards: [
        {
          title: "On iPhone",
          body: "Single photos and the ZIP save to Downloads in the Files app. Tap the ZIP to unzip it there. To put a photo in your Photos app, tap and hold it in the tool, then tap Save to Photos.",
        },
        {
          title: "On Android",
          body: "Photos go to Downloads and appear in your gallery. To open the ZIP, tap it in your Files app and choose Extract.",
        },
        {
          title: "On a computer",
          body: "Everything lands in your Downloads folder. Double-click the ZIP to unzip it.",
        },
      ],
    },
    {
      kind: "list",
      id: "not-working",
      heading: "If a slideshow won't load",
      items: [
        "Check the post is public. Private and deleted posts can't be fetched.",
        "Copy the link of the post itself, not the creator's profile or the sound.",
        "If the link turns out to be a video, the tool offers the video and its sound instead.",
      ],
    },
    {
      kind: "list",
      id: "safe",
      heading: "Saving photos safely",
      items: SAFETY_ITEMS,
    },
  ],
  faqHeading: "TikTok photo and slideshow questions",
  faq: [
    {
      q: "How do I download a TikTok slideshow?",
      a: "Copy the slideshow's link in TikTok (Share, then Copy link), paste it into the box on this page and tap Get photos. Then tap Download all photos (ZIP), or the download button on each photo.",
    },
    {
      q: "Can I download TikTok photos without the watermark?",
      a: "Yes. The tool saves the original photos from the post as JPGs, with no TikTok watermark added.",
    },
    {
      q: "How do I save all the photos from a TikTok slideshow at once?",
      a: "Tap Download all photos (ZIP). Every photo in the post goes into one ZIP file, numbered in order. Unzip it in the Files app on your phone, or by double-clicking on a computer.",
    },
    {
      q: "Can I download a TikTok slideshow as a video?",
      a: "Not as one file. A TikTok slideshow is a set of photos with a sound, so the tool saves the photos as JPGs and the sound as an MP3. Any video editor can put them back together.",
    },
    {
      q: "Can I download the music from a TikTok slideshow?",
      a: "Yes. Tap Download MP3 to save the slideshow's sound.",
    },
    {
      q: "How do I save a TikTok photo to my iPhone's Photos app?",
      a: "After tapping Get photos, tap and hold the photo in the tool and choose Save to Photos. Downloads made with the download buttons go to the Files app instead.",
    },
    {
      q: "Is the TikTok photo downloader free?",
      a: "Yes. It's free, with no sign-up, no app and no ads.",
    },
    {
      q: "Can I download photos from a private TikTok account?",
      a: "No. Only public posts can be fetched.",
    },
    {
      q: "Can I repost photos I download from TikTok?",
      a: "Only your own, or with the creator's permission. Photos belong to the people who took them, and reposting someone else's work as your own can infringe their copyright.",
    },
  ],
  keywords: [
    "TikTok slideshow downloader",
    "TikTok photo downloader",
    "download TikTok slideshow",
    "download TikTok photos",
    "TikTok photo download without watermark",
    "save TikTok slideshow photos",
    "TikTok picture download",
    "TikTok slideshow download HD",
  ],
  ogAlt: "TikTok photo and slideshow downloader — save every photo as a JPG",
};

export const tiktokToolPages: TiktokToolPageData[] = [VIDEO, AUDIO, PHOTO];

export function getTiktokToolPage(slug: TiktokToolSlug): TiktokToolPageData {
  return tiktokToolPages.find((page) => page.slug === slug)!;
}
