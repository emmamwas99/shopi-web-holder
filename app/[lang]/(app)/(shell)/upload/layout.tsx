import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Upload flow — full viewport, BottomNav hidden (see BottomNav.tsx).
 * Keep this a plain pass-through so the vaul Drawer portal renders freely into body.
 */
export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
