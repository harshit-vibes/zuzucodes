import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "next-themes";
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
const siteDescription = "Structured Python learning for students and early-career learners. Build real skills. Build real things.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "zuzu.codes — Learn Python for the AI Era",
    template: "%s | zuzu.codes",
  },
  description: siteDescription,
  keywords: [
    "learn Python",
    "Python for beginners",
    "Python course",
    "coding for students",
    "learn to code",
    "programming fundamentals",
    "AI era coding",
    "hands-on Python",
    "Python learning track",
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
    title: "zuzu.codes — Learn Python for the AI Era",
    description: siteDescription,
    images: [{ url: "/og-image.png", width: 1080, height: 1080, alt: "zuzu.codes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "zuzu.codes — Learn Python for the AI Era",
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} ${playfair.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
