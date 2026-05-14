import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://jetdale.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/admin/', '/dashboard/', '/workspace/', '/generate/', '/new/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
