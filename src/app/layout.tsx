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
  // Basic metadata
  title: {
    default: "lele's portfolio",
    template: "%s | lele's portfolio"
  },
  description: "product designer",
  keywords: ["lele zhang", "cherrilynn zhang", "cherrilynnz", "lele zhang berkeley", "lele zhang design"],
  authors: [{ name: "Lele Zhang" }],
  creator: "Lele Zhang",
  
  // Icons are handled automatically by Next.js file conventions:

  // Open Graph for social sharing (Facebook, iMessage, etc.)
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://lelezhang.design",
    siteName: "lele's portfolio",
    title: "lele's portfolio",
    description: "product designer",
    // OpenGraph image handled automatically by /app/opengraph-image.jpg
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    site: "@CherrilynnZ",
    creator: "@CherrilynnZ",
    title: "lele's portfolio", 
    description: "a little glimpse into my work and thoughts",
    // Twitter image handled automatically by /app/opengraph-image.jpg
  },
  
  // Additional metadata
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  
  // Mobile and app metadata
  other: {
    "apple-mobile-web-app-title": "lele's portfolio",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "format-detection": "telephone=no",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#FBFBFC",
    "theme-color": "#FBFBFC"
  }
};

export const viewport: Viewport = {
  themeColor: "#FBFBFC",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log("what r u doing here?? if ur just being nosy, here's a cookie 🍪\\nif something is broken, AAAAAA pls text me at 8582261998 i will fix");
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
