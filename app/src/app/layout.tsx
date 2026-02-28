import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Playfair_Display } from "next/font/google";
import { NeonAuthUIProvider } from '@neondatabase/auth/react/ui';
import { authClient } from '@/lib/auth/client';
import { ThemeProvider } from "@/components/shared/theme-provider";
import { PostHogProvider } from '@/components/shared/posthog-provider';
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

export const metadata: Metadata = {
  title: {
    default: "zuzu.codes",
    template: "%s | zuzu.codes",
  },
  description:
    "AI-native upskilling for modern professionals. Learn to build AI automation workflows, master productivity tools, and develop operations instincts.",
  keywords: [
    "AI automation",
    "upskilling",
    "professional development",
    "AI tools",
    "productivity",
    "AI courses",
    "learn AI",
  ],
  authors: [{ name: "zuzu.codes" }],
  creator: "zuzu.codes",
  publisher: "zuzu.codes",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://app.zuzu.codes"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "zuzu.codes",
    title: "zuzu.codes - AI-Native Upskilling Platform",
    description:
      "AI-native upskilling for modern professionals. Learn to build AI automation workflows, master productivity tools, and develop operations instincts.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "zuzu.codes - AI-Native Upskilling Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "zuzu.codes - AI-Native Upskilling Platform",
    description:
      "AI-native upskilling for modern professionals. Learn to build AI automation workflows and develop operations instincts.",
    images: ["/og-image.png"],
    creator: "@laborai",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
  },
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
        <PostHogProvider>
          <NeonAuthUIProvider authClient={authClient} redirectTo="/dashboard" emailOTP social={{ providers: ['google'] }}>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </NeonAuthUIProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
