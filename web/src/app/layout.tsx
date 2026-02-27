import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = "https://zuzu.codes";
const siteName = "zuzu.codes";
const siteDescription = "AI-native upskilling for the modern professional. Learn to identify, design, and manage automated processes with MBA-level rigor.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "zuzu.codes - AI-Native Upskilling",
    template: "%s | zuzu.codes",
  },
  description: siteDescription,
  keywords: [
    "AI automation",
    "workflow automation",
    "n8n courses",
    "AI upskilling",
    "automation training",
    "AI-native",
    "professional development",
    "process automation",
    "business automation",
  ],
  authors: [{ name: "Kuma Learn" }],
  creator: "Kuma Learn",
  publisher: "Kuma Learn",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: siteName,
    title: "zuzu.codes - AI-Native Upskilling",
    description: siteDescription,
    images: [{ url: "/og-image.png", width: 1080, height: 1080, alt: "zuzu.codes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "zuzu.codes - AI-Native Upskilling",
    description: siteDescription,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "Education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} ${playfair.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
