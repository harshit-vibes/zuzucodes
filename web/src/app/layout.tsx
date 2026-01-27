import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZuzuCodes - AI Automation Course",
  description: "Learn to build AI-powered automation agents using workflow tools. From basics to production-ready systems.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
