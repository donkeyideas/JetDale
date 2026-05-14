import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — Insights & Guides',
  description: 'Learn how to plan, validate, and launch your next project with confidence. Tips on AI-powered project planning, startup validation, and building with purpose.',
  keywords: ['startup planning blog', 'AI project planning tips', 'build plan guide', 'MVP planning', 'project discovery guide', 'startup validation'],
  openGraph: {
    title: 'Blog — Jetdale',
    description: 'Insights, guides, and strategies for AI-powered project planning.',
    url: '/blog',
  },
  alternates: { canonical: '/blog' },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
