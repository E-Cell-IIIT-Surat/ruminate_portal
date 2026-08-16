import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Ruminate Portal", template: "%s · Ruminate Portal" },
  description:
    "The operations platform for programs, applications, reviews, and outcomes at Ruminate — E-Cell IIIT Surat.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Ruminate Operations Platform",
    description: "Ideas move forward when the process does.",
    type: "website",
    images: [{ url: "/ruminate-social-card.png", width: 1738, height: 909, alt: "Ruminate Operations Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ruminate Operations Platform",
    description: "Ideas move forward when the process does.",
    images: ["/ruminate-social-card.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
