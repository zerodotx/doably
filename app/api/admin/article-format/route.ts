import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in Vercel.' }, { status: 503 });

  const body = await request.json();
  const title = String(body.title || '').trim();
  const excerpt = String(body.excerpt || '').trim();
  const content = String(body.content || '').trim();
  if (!title || !content) return NextResponse.json({ error: 'The article needs a title and content.' }, { status: 400 });

  const prompt = `Reformat and improve this existing Doably article into a standard editorial blog article.

Title: ${title}
Excerpt: ${excerpt}

Existing article:
---
${content}
---

Return ONLY valid JSON with exactly these keys:
excerpt, content

Rules for content:
- Preserve the original topic, useful information, links, and factual meaning whenever possible.
- Do not invent statistics, earnings guarantees, testimonials, sources, or facts.
- Do not promise income.
- Turn the article into a well-structured, readable article rather than one giant paragraph.
- Use Markdown.
- Do NOT put the article title as an H1.
- Start with an ## Introduction section.
- Use 3-6 clear ## H2 sections.
- Use ### H3 subheadings where they make sense for individual methods, steps, examples, or explanations.
- Break long paragraphs into short 2-4 sentence paragraphs.
- Use bullet or numbered lists when useful.
- End with ## Frequently Asked Questions containing 3-5 ### questions and concise answers.
- End with ## Final Thoughts containing a practical summary.
- Do not manually create a Table of Contents; Doably creates it automatically.
- Keep useful details from the original instead of replacing the article with generic filler.
- Return no Markdown code fence.`;

  const model = process.env.GEMINI_ARTICLE_MODEL || 'gemini-3.1-flash-lite';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 }
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: `Gemini formatting failed: ${detail.slice(0, 300)}` }, { status: 502 });
  }
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('') || '';
  try { return NextResponse.json(JSON.parse(text)); }
  catch { return NextResponse.json({ error: 'The AI returned an unexpected format. Please try again.' }, { status: 502 }); }
}
