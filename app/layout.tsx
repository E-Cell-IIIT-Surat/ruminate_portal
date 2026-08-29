import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { Suspense } from "react";
import { NetworkStatus } from "@/components/network-status";
import { FeedbackWidget } from "@/components/feedback-widget";
import { InstallPrompt } from "@/components/install-prompt";
import { NavigationLoader } from "@/components/ruminate-loader";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500" , "700"],
  variable: "--font-heading",
});

const siteUrl = process.env.APP_URL ?? "https://portal.ecelliiitsurat.in";
const tagline =
  "Ruminate is the digital home for entrepreneurship at E-Cell IIIT Surat — where students discover opportunities, submit ideas, and keep moving with clarity.";

export const metadata: Metadata = {
  title: { default: "Ruminate — E-Cell IIIT Surat", template: "%s · Ruminate" },
  description: tagline,
  metadataBase: new URL(siteUrl),
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Ruminate — E-Cell IIIT Surat",
    description: tagline,
    url: siteUrl,
    siteName: "Ruminate",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Ruminate — E-Cell IIIT Surat" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ruminate — E-Cell IIIT Surat",
    description: tagline,
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#ff5f2e",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
   <html lang="en" className={spaceGrotesk.variable}>
      <body>
        {children}
        <Suspense fallback={null}>
          <NavigationLoader />
        </Suspense>
        <NetworkStatus />
        <FeedbackWidget />
        <InstallPrompt />
      </body>
    </html>
  );
}