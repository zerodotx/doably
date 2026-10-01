import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/db';
import { ensureDatabase } from '@/db/setup';

const stopWords = new Set([
  'i', 'can', 'do', 'know', 'want', 'like', 'to', 'my', 'what', 'with',
  'and', 'the', 'a', 'an', 'for', 'of', 'in', 'on', 'how', 'is', 'am',
  'me', 'you', 'make', 'making', 'have', 'has', 'get', 'give'
]);

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function words(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 2 && !stopWords.has(word));
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];

    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }

    previous = current;
  }

  return previous[b.length];
}

function similarity(a: string, b: string) {
  if (!a || !b) return 0;
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function scoreField(queryToken: string, field: string) {
  const fieldText = field.toLowerCase();
  const fieldNormalized = normalize(field);
  const queryNormalized = normalize(queryToken);

  if (!queryNormalized || !fieldNormalized) return 0;
  if (fieldNormalized === queryNormalized) return 120;
  if (fieldNormalized.includes(queryNormalized)) return 90;

  const fieldWords = words(field);
  let best = 0;

  for (const fieldWord of fieldWords) {
    const fieldWordNormalized = normalize(fieldWord);
    if (fieldWordNormalized === queryNormalized) {
      best = Math.max(best, 120);
      continue;
    }
    if (fieldWordNormalized.includes(queryNormalized) || queryNormalized.includes(fieldWordNormalized)) {
      best = Math.max(best, 75);
      continue;
    }

    const sim = similarity(queryNormalized, fieldWordNormalized);
    const maxDistance = queryNormalized.length <= 4 ? 1 : queryNormalized.length <= 7 ? 2 : 3;

    if (levenshtein(queryNormalized, fieldWordNormalized) <= maxDistance && sim >= 0.65) {
      best = Math.max(best, Math.round(sim * 70));
    }
  }

  return best;
}

function scoreSkill(query: string, row: any) {
  const queryTokens = words(query);
  const combinedQuery = normalize(query);
  const fields = [
    { value: row.skill_name, weight: 1.3 },
    { value: row.skill_slug, weight: 1.25 },
    { value: row.search_keyword, weight: 1.2 },
    { value: row.category_name, weight: 1.15 },
    { value: row.category_slug, weight: 1.1 },
    { value: row.gig_title, weight: 0.9 },
    { value: row.description, weight: 0.75 }
  ];

  let score = 0;

  if (combinedQuery.length >= 3) {
    for (const field of fields) {
      const fieldNormalized = normalize(String(field.value || ''));
      if (!fieldNormalized) continue;

      if (fieldNormalized === combinedQuery) {
        score = Math.max(score, 150 * field.weight);
      } else if (fieldNormalized.includes(combinedQuery)) {
        score = Math.max(score, 105 * field.weight);
      } else {
        const sim = similarity(combinedQuery, fieldNormalized);
        if (sim >= 0.72) {
          score = Math.max(score, sim * 80 * field.weight);
        }
      }
    }
  }

  for (const token of queryTokens) {
    let bestTokenScore = 0;
    for (const field of fields) {
      bestTokenScore = Math.max(bestTokenScore, scoreField(token, String(field.value || '')) * field.weight);
    }
    score += bestTokenScore;
  }

  return score;
}

export async function GET(r: NextRequest) {
  try {
    await ensureDatabase();
    const raw = r.nextUrl.searchParams.get('q')?.trim() || '';
    if (!raw) return NextResponse.json({ results: [] });

    // Fetch the skill index and rank it in the application layer. This lets us
    // handle punctuation changes, joined words, small typos, and natural-language
    // queries without requiring users to know the exact database wording.
    const rows = await sql`
      SELECT DISTINCT
        s.name AS skill_name,
        s.slug AS skill_slug,
        s.search_keyword,
        s.device_needed,
        s.gig_title,
        s.earning_range,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        c.description
      FROM skills s
      JOIN skill_categories sc ON sc.skill_id = s.id
      JOIN categories c ON c.id = sc.category_id
    `;

    const ranked = rows
      .map((row: any) => ({ row, score: scoreSkill(raw, row) }))
      .filter((item: any) => item.score >= 20)
      .sort((a: any, b: any) => b.score - a.score || a.row.category_name.localeCompare(b.row.category_name))
      .slice(0, 12);

    const results = [];

    for (const { row } of ranked) {
      const articles = await sql`
        SELECT id, title, slug, excerpt AS description, views
        FROM blog_articles
        WHERE category_id = ${row.category_id} AND status = 'published'
        ORDER BY views DESC, updated_at DESC, id DESC
        LIMIT 2
      `;

      const externalLimit = articles.length >= 2 ? 1 : 3 - articles.length;
      const external = await sql`
        SELECT id, title, url, source, description
        FROM links
        WHERE category_id = ${row.category_id} AND is_active = TRUE
        ORDER BY priority DESC, id ASC
        LIMIT ${externalLimit}
      `;

      const articleLinks = articles.map((article: any) => ({
        id: `article-${article.id}`,
        title: article.title,
        url: `/blog/${article.slug}`,
        source: 'Doably',
        description: article.description || null,
        internal: true
      }));

      results.push({ ...row, links: [...articleLinks, ...external] });
    }

    return NextResponse.json({ results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Search is temporarily unavailable.' }, { status: 500 });
  }
}
