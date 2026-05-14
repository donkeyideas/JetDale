import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';

/**
 * POST /api/admin/blog/generate
 * AI-powered blog content generation using DeepSeek.
 * Generates clean HTML content with excerpt and tags.
 */

function cleanMarkdownArtifacts(html: string): string {
  let cleaned = html;

  // Remove markdown code fences
  cleaned = cleaned.replace(/```html?\s*/gi, '').replace(/```\s*/g, '');

  // Convert any remaining markdown headings to HTML
  cleaned = cleaned.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  cleaned = cleaned.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  cleaned = cleaned.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  cleaned = cleaned.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Convert markdown bold to <strong>
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Convert markdown italic to <em>
  cleaned = cleaned.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Convert markdown horizontal rules to <hr>
  cleaned = cleaned.replace(/^---+$/gm, '<hr>');
  cleaned = cleaned.replace(/^___+$/gm, '<hr>');

  // Convert markdown links to HTML links
  cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Convert markdown unordered lists
  cleaned = cleaned.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');

  return cleaned.trim();
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const body = await req.json();
  const { topic, type } = body;

  if (!topic) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  }

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (!deepseekKey) {
    return NextResponse.json(
      { error: 'DEEPSEEK_API_KEY is not configured' },
      { status: 500 }
    );
  }

  const contentType = type === 'guide' ? 'comprehensive how-to guide' : 'blog post';

  try {
    const aiRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content: `You are a professional content writer for Jetdale, an AI-powered project planning platform for startups.

Write content as clean HTML only. Do NOT use any markdown syntax (no **, ##, --, \`\`\`, etc).

Use these HTML tags:
- <h2> for section headings
- <h3> for sub-headings
- <p> for paragraphs
- <strong> for bold text
- <em> for italic text
- <ul><li> for unordered lists
- <ol><li> for ordered lists
- <blockquote> for quotes
- <a href=""> for links

After the HTML content, add a separator line:
---METADATA---
EXCERPT: (a 1-2 sentence summary)
TAGS: (comma-separated relevant tags)

The content should be engaging, well-structured, and around 800-1200 words.`,
          },
          {
            role: 'user',
            content: `Write a ${contentType} about: ${topic}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!aiRes.ok) {
      throw new Error(`DeepSeek API error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content ?? '';

    // Parse metadata separator
    let content = raw;
    let excerpt = '';
    let tags: string[] = [];

    const metaSplit = raw.split('---METADATA---');
    if (metaSplit.length > 1) {
      content = metaSplit[0].trim();
      const metaBlock = metaSplit[1];

      const excerptMatch = metaBlock.match(/EXCERPT:\s*(.+?)(?:\n|$)/);
      if (excerptMatch) excerpt = excerptMatch[1].trim();

      const tagsMatch = metaBlock.match(/TAGS:\s*(.+?)(?:\n|$)/);
      if (tagsMatch) {
        tags = tagsMatch[1].split(',').map((t: string) => t.trim()).filter(Boolean);
      }
    }

    // Clean any markdown artifacts that leaked through
    content = cleanMarkdownArtifacts(content);

    return NextResponse.json({
      content,
      excerpt,
      tags,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate content. Please try again.' },
      { status: 500 }
    );
  }
}
