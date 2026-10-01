import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in Vercel.' }, { status: 503 });
  const body = await request.json();
  const topic = String(body.topic || '').trim();
  const audience = String(body.audience || 'people looking for practical ways to earn').trim();
  const tone = String(body.tone || 'helpful, natural and practical').trim();
  const length = String(body.length || '1200 words').trim();
  if (!topic) return NextResponse.json({ error: 'Enter an article topic.' }, { status: 400 });

  const prompt = `Create a useful, original, editorial-style blog article for Doably.
Topic: ${topic}
Audience: ${audience}
Tone: ${tone}
Target length: ${length}

Return ONLY valid JSON with these exact keys:
title, slug, excerpt, seoTitle, metaDescription, content

The content field MUST be Markdown and MUST follow this structure:
## Introduction
Write 2-4 short paragraphs introducing the topic and setting realistic expectations.

## [Main section]
Use 3-6 useful H2 sections that answer the reader's questions or explain practical options.
Under relevant H2 sections, use H3 subheadings for specific methods, examples, tools, or steps.

## Frequently Asked Questions
Include 3-5 useful FAQ questions as H3 headings, with concise answers under each.

## Final Thoughts
End with a practical summary and sensible next step. Do not promise income.

Formatting rules:
- Use H2 headings (##) for major sections and H3 headings (###) for subtopics.
- Keep paragraphs short: usually 2-4 sentences.
- Use bullet or numbered lists when they improve readability.
- Do not manually add a Table of Contents; Doably creates it automatically.
- Do not put the article title as an H1 inside content because the site displays the title separately.
- Do not return one giant paragraph.
- Do not invent statistics, earnings guarantees, testimonials, fake sources, or unsupported claims.
- Avoid promising income.
- Make the article genuinely useful, specific and actionable.
- Do not include a JSON code fence.`;

  const model = process.env.GEMINI_ARTICLE_MODEL || 'gemini-3.1-flash-lite';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7
      }
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: `Gemini generation failed: ${detail.slice(0, 300)}` }, { status: 502 });
  }
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.map((part:any) => part.text || '').join('') || '';
  try { return NextResponse.json(JSON.parse(text)); }
  catch { return NextResponse.json({ error: 'The AI returned an unexpected format. Please generate again.' }, { status: 502 }); }
}
