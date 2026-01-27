import type { Metadata } from "next";
import "./globals.css";

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

  // Favicon and icons
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: siteName,
    title: "zuzu.codes - AI-Native Upskilling",
    description: siteDescription,
    images: [
      {
        url: "/og-image.png",
        width: 1080,
        height: 1080,
        alt: "zuzu.codes - AI-Native Upskilling",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "zuzu.codes - AI-Native Upskilling",
    description: siteDescription,
    images: ["/og-image.png"],
  },

  // Robots
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

  // Verification (add your IDs when available)
  // verification: {
  //   google: "your-google-verification-code",
  // },

  // Other
  category: "Education",
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: siteName,
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  description: siteDescription,
  founder: {
    "@type": "Organization",
    name: "Kuma Learn",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    url: "https://wa.me/918011858376?text=enquiry%20for%20zuzu.codes",
  },
  sameAs: [],
  offers: {
    "@type": "Offer",
    category: "AI Automation Courses",
    description: "Cohort-based AI automation upskilling courses",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
