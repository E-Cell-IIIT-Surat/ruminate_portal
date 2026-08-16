import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Ruminate Portal", template: "%s · Ruminate Portal" },
  description:
    "The operations platform for programs, applications, reviews, and outcomes at Ruminate — E-Cell IIIT Surat.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: { title: "Ruminate Portal", description: "Build. Apply. Review. Move ideas forward.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
