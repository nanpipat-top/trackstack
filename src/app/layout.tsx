import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#9333EA",
};

export const metadata: Metadata = {
  title: "Trackstack",
  description: "Stack your tracks, craft your perfect playlist. Seamlessly create and sync playlists across YouTube Music and Spotify.",
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      }
    ],
    shortcut: ["/favicon.svg"],
    apple: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      }
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Trackstack",
    description: "Stack your tracks, craft your perfect playlist",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Trackstack",
    description: "Stack your tracks, craft your perfect playlist",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
