// ============================================================
// Jetdale — Privacy Policy
// ============================================================

const sections = [
  {
    title: '1. Information We Collect',
    content: `When you use Jetdale, we collect information you provide directly to us, including:

- Account information (name, email address, password)
- Project data (descriptions, requirements, and generated artifacts)
- Payment information (processed securely via Stripe; we do not store card numbers)
- Usage data (features used, session duration, interactions)
- Device information (browser type, operating system, device identifiers)
- Voice input data (processed in real-time; audio is not stored after transcription)`,
  },
  {
    title: '2. How We Use Your Information',
    content: `We use the information we collect to:

- Provide, maintain, and improve Jetdale's services
- Generate project plans, documents, and artifacts based on your input
- Process payments and manage your subscription
- Send you technical notices, updates, and support messages
- Monitor and analyze trends, usage, and activities
- Detect, investigate, and prevent fraud and other illegal activities
- Personalize and improve your experience`,
  },
  {
    title: '3. AI Processing & Data Handling',
    content: `Jetdale uses AI models to generate project documentation. Here is how we handle your data in this context:

- Your project descriptions are sent to AI providers (e.g., Google Gemini) for processing
- We do not use your project data to train AI models
- Generated artifacts are stored in your account and can be deleted at any time
- We retain project data for the duration of your account plus 30 days after deletion
- Anonymized, aggregated usage patterns may be used to improve our archetype system`,
  },
  {
    title: '4. Information Sharing',
    content: `We do not sell your personal information. We may share information with:

- Service providers who assist in operating our platform (hosting, payment processing, analytics)
- Law enforcement when required by law or to protect our rights
- Other parties in connection with a merger, acquisition, or sale of assets

All third-party service providers are contractually obligated to protect your information.`,
  },
  {
    title: '5. Data Security',
    content: `We implement appropriate technical and organizational measures to protect your data, including:

- Encryption in transit (TLS 1.3) and at rest (AES-256)
- Regular security audits and penetration testing
- Access controls and authentication requirements for our team
- Secure infrastructure hosted on reputable cloud providers

No method of transmission or storage is 100% secure. We cannot guarantee absolute security.`,
  },
  {
    title: '6. Your Rights',
    content: `You have the right to:

- Access the personal information we hold about you
- Correct inaccurate or incomplete information
- Delete your account and associated data
- Export your project data in standard formats
- Opt out of marketing communications
- Lodge a complaint with a supervisory authority

To exercise any of these rights, contact us at info@donkeyideas.com.`,
  },
  {
    title: '7. Cookies & Tracking',
    content: `We use essential cookies to maintain your session and preferences. We use analytics cookies (which you can opt out of) to understand how Jetdale is used. We do not use third-party advertising cookies.`,
  },
  {
    title: "8. Children's Privacy",
    content: `Jetdale is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we learn we have collected such information, we will delete it promptly.`,
  },
  {
    title: '9. Changes to This Policy',
    content: `We may update this privacy policy from time to time. We will notify you of material changes by posting the updated policy on our website and, where appropriate, by email. Your continued use of Jetdale after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '10. Contact',
    content: `If you have questions about this privacy policy or our data practices, contact us at:

Jetdale
Email: info@donkeyideas.com`,
  },
];

export default function PrivacyPage() {
  return (
    <article
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '80px 32px 100px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 32,
        }}
      >
        <span style={{ width: 32, height: 1, background: 'var(--accent)', display: 'inline-block' }} />
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.15em',
            color: 'var(--accent)',
          }}
        >
          Legal
        </span>
      </div>

      <h1
        style={{
          fontFamily: "'Bricolage Grotesque', -apple-system, sans-serif",
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 600,
          letterSpacing: '-0.035em',
          lineHeight: 1.05,
          marginBottom: 16,
        }}
      >
        Privacy Policy
      </h1>

      <p
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.15em',
          color: 'var(--muted)',
          marginBottom: 64,
        }}
      >
        Last updated: May 12, 2026
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
        {sections.map((section) => (
          <div key={section.title}>
            <h2
              style={{
                fontFamily: "'Bricolage Grotesque', -apple-system, sans-serif",
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                marginBottom: 16,
              }}
            >
              {section.title}
            </h2>
            <div
              style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: 'var(--muted)',
                whiteSpace: 'pre-line',
              }}
            >
              {section.content}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
