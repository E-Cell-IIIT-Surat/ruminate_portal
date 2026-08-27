import type { MetadataRoute } from "next";
import { publicPrograms } from "@/lib/data/public";

const siteUrl = (process.env.APP_URL ?? "https://portal.ecelliiitsurat.in").replace(/\/$/, "");

// Program slugs are read at request time. Avoid querying PostgreSQL during the
// Vercel build, where the build container may not have network access.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = ["/", "/programs", "/udbhav", "/ssip", "/financial-literacy-workshop", "/privacy", "/terms"].map(
    (path) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: path === "/" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "/" ? 1 : 0.7,
    }),
  );
  try {
    const programs = await publicPrograms({});
    return [
      ...staticPages,
      ...programs.map((program) => ({
        url: `${siteUrl}/programs/${program.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch (error) {
    console.error("[sitemap] public program lookup failed", error);
    return staticPages;
  }
}
