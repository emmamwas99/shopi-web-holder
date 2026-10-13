import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/notifications",
        "/upload",
        "/api/",
        "/*/notifications",
        "/*/upload",
        "/*/auth/",
        "/*/profile/edit",
        "/*/profile/followers",
        "/*/profile/visitors",
        "/*/profile/posts",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
