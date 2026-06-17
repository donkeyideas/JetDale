// ============================================================
// Jetdale — Root Layout (Next.js)
// Loads fonts, sets up global styles, SEO defaults.
// ============================================================

import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-8FLRB8EW05';
const GA_ENABLED = process.env.NODE_ENV === 'production';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://jetdale.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Jetdale — The AI Project Architect',
    template: '%s | Jetdale',
  },
  description: 'Plan before you build. Jetdale turns a one-sentence idea into a world-class build plan — vision, scope, roadmap, mockups, risks, and AI-ready prompts.',
  keywords: [
    'AI project planning', 'startup planning tool', 'build plan generator',
    'project architect', 'AI roadmap', 'scope document', 'project discovery',
    'SaaS planning', 'MVP planning', 'AI project management',
  ],
  authors: [{ name: 'Jetdale' }],
  creator: 'Jetdale',
  publisher: 'Jetdale',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'Jetdale',
    title: 'Jetdale — The AI Project Architect',
    description: 'Plan before you build. AI-powered project planning that generates real documents — vision, scope, roadmap, mockups, risks, and AI-ready prompts.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Jetdale — Plan before you build',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jetdale — The AI Project Architect',
    description: 'Plan before you build. AI-powered project planning that generates real documents.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Manrope:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
      {GA_ENABLED && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>
        </>
      )}
    </html>
  );
}
