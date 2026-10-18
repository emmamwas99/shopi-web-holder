import { Bricolage_Grotesque, JetBrains_Mono, Manrope } from "next/font/google";

/**
 * What every full HTML document Shopi renders needs: the fonts and the theme
 * script. Shared by AppDocument (the app's root layout) and
 * app/global-not-found.tsx, which bypasses that layout and has to build its
 * own <html>, so the 404 page looks like the rest of the site.
 */

const manrope = Manrope({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const bricolage = Bricolage_Grotesque({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  // This face is used for small supporting details, never the initial hero or
  // feed content. Keep it out of the critical mobile preload set.
  preload: false,
  variable: "--font-mono",
});

/** The CSS variables the theme maps font-sans/-display/-mono to. */
export const fontVariables = `${manrope.variable} ${bricolage.variable} ${jetbrainsMono.variable}`;

/** Applies the saved theme before first paint, so dark mode never flashes. */
export const themeScript = `
(function(){
  try {
    var s = JSON.parse(localStorage.getItem('shopi-theme') || '{}');
    var t = s.state?.theme || 'light';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch(e){}
})();
`;
