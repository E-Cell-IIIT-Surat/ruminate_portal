import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ruminate — E-Cell IIIT Surat",
    short_name: "Ruminate",
    description: "The digital home for entrepreneurship at E-Cell IIIT Surat.",
    id: "/",
    scope: "/",
    start_url: "/dashboard",
    display: "standalone",
    theme_color: "#ff5f2e",
    background_color: "#0c0a09",
    icons: [
      { src: "/icons/192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
