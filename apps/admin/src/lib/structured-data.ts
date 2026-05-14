// ============================================================
// Jetdale — Structured Data (JSON-LD) helpers
// For SEO, AEO (Answer Engine Optimization), and GEO.
// ============================================================

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://jetdale.com';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Jetdale',
    url: SITE_URL,
    logo: `${SITE_URL}/og-image.png`,
    description: 'AI-powered project planning platform that turns ideas into world-class build plans.',
    sameAs: [],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Jetdale',
    url: SITE_URL,
    description: 'Plan before you build. AI-powered project planning.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/blog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function softwareAppJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Jetdale',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    description: 'AI-powered project planning tool that generates vision documents, scope documents, roadmaps, wireframes, risk registers, and build-ready prompts.',
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        name: 'Free',
        description: 'Try Jetdale with 1 project per month',
      },
      {
        '@type': 'Offer',
        price: '49',
        priceCurrency: 'USD',
        name: 'Pro',
        description: 'Unlimited projects, all export formats, advanced AI',
      },
    ],
  };
}

export function blogPostJsonLd(post: {
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  created_at: string;
  tags?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? `Read ${post.title} on the Jetdale blog.`,
    url: `${SITE_URL}/blog/${post.slug}`,
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.published_at ?? post.created_at,
    author: {
      '@type': 'Organization',
      name: 'Jetdale',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Jetdale',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/og-image.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${post.slug}`,
    },
    keywords: post.tags?.join(', ') ?? '',
  };
}

export function blogListJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Jetdale Blog',
    url: `${SITE_URL}/blog`,
    description: 'Insights, guides, and strategies for AI-powered project planning, startup validation, and building with confidence.',
  };
}

export function faqJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function pricingJsonLd(plans: Array<{ name: string; price: string; description: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Jetdale',
    description: 'AI-powered project planning platform',
    url: `${SITE_URL}/pricing`,
    offers: plans.map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      price: plan.price,
      priceCurrency: 'USD',
      description: plan.description,
      availability: 'https://schema.org/InStock',
    })),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}
