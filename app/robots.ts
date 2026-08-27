import type { MetadataRoute } from "next";

const siteUrl = process.env.APP_URL ?? "https://portal.ecelliiitsurat.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/programs", "/udbhav", "/ssip", "/financial-literacy-workshop"],
        disallow: [
          "/dashboard",
          "/admin",
          "/api",
          "/teams",
          "/notifications",
          "/profile",
          "/applications",
          "/reviewer",
          "/signin",
        ],
      },
    ],
    sitemap: `${siteUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
