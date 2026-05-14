import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';

const CHAR_LIMITS: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  facebook: 63206,
  instagram: 2200,
};

const PLATFORM_GUIDELINES: Record<string, string> = {
  twitter: `Twitter/X post (max 280 characters).
- Be punchy, concise, and attention-grabbing
- Use 1-3 relevant hashtags (included in the character count)
- Emojis are encouraged but don't overdo it
- Ask a question or make a bold statement to drive engagement
- Keep it under 270 characters to leave room for edits`,

  linkedin: `LinkedIn post (max 3000 characters).
- Professional but conversational tone
- Start with a strong hook in the first 2 lines (this shows before "see more")
- Use line breaks for readability
- Include a clear call-to-action
- Use 3-5 relevant hashtags at the end
- Can include bullet points or numbered lists
- Aim for 800-1500 characters for optimal engagement`,

  facebook: `Facebook post (max 63,206 characters).
- Conversational and engaging tone
- Start with a hook that stops the scroll
- Use emojis strategically to break up text
- Ask questions to encourage comments
- Include a clear call-to-action
- Keep it 100-300 characters for best engagement, but can go longer for storytelling
- Use 1-3 hashtags at most`,

  instagram: `Instagram caption (max 2200 characters).
- Start with the most important content (first 125 chars show in feed)
- Storytelling approach works well
- Use line breaks and emojis for visual appeal
- Include a call-to-action (comment, save, share)
- Put 20-30 relevant hashtags at the very end, separated by dots/line breaks
- Aim for 500-1000 characters for the main caption before hashtags`,
};

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const body = await req.json();
  const { topic, platform, tone } = body;

  if (!topic || !platform) {
    return NextResponse.json({ error: 'topic and platform are required' }, { status: 400 });
  }

  const charLimit = CHAR_LIMITS[platform];
  if (!charLimit) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (!deepseekKey) {
    return NextResponse.json({ error: 'DEEPSEEK_API_KEY is not configured' }, { status: 500 });
  }

  const guidelines = PLATFORM_GUIDELINES[platform] ?? '';
  const toneInstruction = tone ? `Tone: ${tone}.` : 'Tone: professional yet approachable.';

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
            content: `You are a social media content specialist for Jetdale, an AI-powered project planning platform for startups. Jetdale helps founders plan before they build — turning ideas into structured project plans with AI.

Generate a single social media post following these platform-specific guidelines:

${guidelines}

CRITICAL RULES:
- The ENTIRE post (including hashtags, emojis, and all text) MUST be under ${charLimit} characters
- Return ONLY the post text — no explanations, no labels, no quotes around it
- Do not include "Caption:" or "Post:" or any prefix
- ${toneInstruction}
- Reference Jetdale naturally — don't be overly promotional
- Focus on providing value (tips, insights, questions) related to the topic`,
          },
          {
            role: 'user',
            content: `Write a ${platform} post about: ${topic}`,
          },
        ],
        temperature: 0.8,
        max_tokens: platform === 'twitter' ? 200 : 1500,
      }),
    });

    if (!aiRes.ok) {
      throw new Error(`DeepSeek API error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content ?? '';

    // Clean up any wrapping quotes the model might add
    content = content.trim();
    if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
      content = content.slice(1, -1);
    }

    // Enforce character limit — truncate at last word boundary if needed
    if (content.length > charLimit) {
      const truncated = content.slice(0, charLimit - 3);
      const lastSpace = truncated.lastIndexOf(' ');
      content = truncated.slice(0, lastSpace > 0 ? lastSpace : charLimit - 3) + '...';
    }

    return NextResponse.json({
      content,
      platform,
      char_count: content.length,
      char_limit: charLimit,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate post. Please try again.' },
      { status: 500 }
    );
  }
}
