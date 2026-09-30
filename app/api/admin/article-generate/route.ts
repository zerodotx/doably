import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: 'OPENAI_API_KEY is not configured in Vercel.' }, { status: 503 });
  const body = await request.json();
  const topic = String(body.topic || '').trim();
  const audience = String(body.audience || 'people looking for practical ways to earn').trim();
  const tone = String(body.tone || 'helpful, natural and practical').trim();
  const length = String(body.length || '1200 words').trim();
  if (!topic) return NextResponse.json({ error: 'Enter an article topic.' }, { status: 400 });

  const prompt = `Create a useful, original blog article for Doably.
Topic: ${topic}
Audience: ${audience}
Tone: ${tone}
Target length: ${length}

Return ONLY valid JSON with these exact keys:
title, slug, excerpt, seoTitle, metaDescription, content

Rules:
- content must be clean Markdown suitable for a blog CMS.
- Use helpful H2/H3 headings, short paragraphs and bullet lists where useful.
- Do not invent statistics, earnings guarantees, testimonials, or fake sources.
- Avoid promising income.
- Make the article genuinely useful and actionable.
- Do not include a JSON code fence.`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.OPENAI_ARTICLE_MODEL || 'gpt-5.6-luna', input: prompt })
  });
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: `AI generation failed: ${detail.slice(0, 300)}` }, { status: 502 });
  }
  const result = await response.json();
  const text = result.output_text || result.output?.flatMap((item:any)=>item.content||[]).map((x:any)=>x.text||'').join('') || '';
  try { return NextResponse.json(JSON.parse(text)); }
  catch { return NextResponse.json({ error: 'The AI returned an unexpected format. Please generate again.' }, { status: 502 }); }
}