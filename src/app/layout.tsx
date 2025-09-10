import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Miss_Fajardose } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// Optimized local fonts with Next.js
const untitledSans = localFont({
  src: [
    {
      path: '../../public/fonts/Untitled Sans/TestUntitledSans-Light.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Untitled Sans/TestUntitledSans-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Untitled Sans/TestUntitledSans-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Untitled Sans/TestUntitledSans-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-untitled-sans',
  display: 'swap',
  preload: true,
});

const compagnon = localFont({
  src: [
    {
      path: '../../public/fonts/Compagnon/Compagnon-Roman.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Compagnon/Compagnon-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Compagnon/Compagnon-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-compagnon',
  display: 'swap',
  preload: false, // Only preload if used above the fold
});

const missFajardose = Miss_Fajardose({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-miss-fajardose",
  preload: false, // Only used in footer
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: "lele's website",
  description: "product designer",
  keywords: ["product designer", "portfolio", "design", "startups", "san francisco"],
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: "lele's portfolio",
    description: "a little glimpse into my work and thoughts",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/preview.webp",
        width: 1200,
        height: 630,
        alt: "lele's portfolio preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "lele's portfolio",
    description: "a little glimpse into my work and thoughts",
    creator: "@CherrilynnZ",
    images: ["/preview.webp"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#FBFBFC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${untitledSans.variable} ${compagnon.variable} ${missFajardose.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
