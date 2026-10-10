"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackHomepageButtonClick } from "@/lib/analytics";

export function TrackedHomepageLink({
  href,
  buttonId,
  placement,
  className,
  children,
}: {
  href: string;
  buttonId: string;
  placement: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackHomepageButtonClick(buttonId, placement, href)}
    >
      {children}
    </Link>
  );
}
