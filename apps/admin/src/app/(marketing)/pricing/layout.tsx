import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for Jetdale. Start free, upgrade when you need unlimited projects, all export formats, and advanced AI.',
  keywords: ['Jetdale pricing', 'AI planning tool pricing', 'project planning cost', 'startup planning free', 'SaaS project management pricing'],
  openGraph: {
    title: 'Pricing — Jetdale',
    description: 'Start free. Upgrade when you need unlimited projects, all export formats, and advanced AI.',
    url: '/pricing',
  },
  alternates: { canonical: '/pricing' },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
