import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/db';
import { ensureDatabase } from '@/db/setup';

const stopWords = new Set([
  'i', 'can', 'do', 'know', 'want', 'like', 'to', 'my', 'what', 'with',
  'and', 'the', 'a', 'an', 'for', 'of', 'in', 'on', 'how', 'is', 'am',
  'me', 'you', 'make', 'making', 'have', 'has', 'get', 'give', 'please'
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

function fuzzyTokenScore(queryToken: string, field: string) {
  const query = normalize(queryToken);
  if (!query) return 0;

  let best = 0;
  for (const fieldWord of words(field)) {
    const candidate = normalize(fieldWord);
    if (!candidate) continue;

    if (candidate === query) {
      best = Math.max(best, 100);
      continue;
    }

    if (query.length >= 4 && (candidate.includes(query) || query.includes(candidate))) {
      const lengthGap = Math.abs(candidate.length - query.length);
      if (lengthGap <= Math.max(2, Math.floor(query.length * 0.5))) {
        best = Math.max(best, 78);
        continue;
      }
    }

    const distance = levenshtein(query, candidate);
    const maxDistance = query.length <= 5 ? 1 : query.length <= 8 ? 2 : 3;
    const similarity = 1 - distance / Math.max(query.length, candidate.length);

    if (distance <= maxDistance && similarity >= 0.75) {
      best = Math.max(best, Math.round(similarity * 72));
    }
  }

  return best;
}

function scoreSkill(query: string, row: any) {
  const queryTokens = words(query);
  if (!queryTokens.length) return 0;

  const primaryFields = [
    { value: row.skill_name, weight: 1.55 },
    { value: row.skill_slug, weight: 1.35 },
    { value: row.search_keyword, weight: 1.2 },
    { value: row.category_name, weight: 1.15 },
    { value: row.category_slug, weight: 1.05 },
    { value: (row.aliases || []).join(' | '), weight: 1.65 }
  ];

  const normalizedQuery = normalize(query);
  let score = 0;
  let matchedTokens = 0;

  if (normalizedQuery.length >= 2) {
    for (const field of primaryFields) {
      const fieldNormalized = normalize(String(field.value || ''));
      if (!fieldNormalized) continue;

      if (fieldNormalized === normalizedQuery) {
        score = Math.max(score, 220 * field.weight);
      } else if (fieldNormalized.includes(normalizedQuery)) {
        score = Math.max(score, 155 * field.weight);
      }
    }
  }

  for (const token of queryTokens) {
    let best = 0;
    for (const field of primaryFields) {
      best = Math.max(best, fuzzyTokenScore(token, String(field.value || '')) * field.weight);
    }

    if (best > 0) {
      matchedTokens++;
      score += best;
    }
  }

  if (!matchedTokens) return 0;

  if (queryTokens.length > 1 && matchedTokens < queryTokens.length) {
    score *= matchedTokens / queryTokens.length;
  }

  return score;
}

function prefixMatch(query: string, row: any) {
  const q = normalize(query);
  if (!q) return false;
  const fields = [row.skill_name, row.skill_slug, row.search_keyword, row.category_name, ...(row.aliases || [])];
  return fields.some((field: string) => {
    const text = normalize(String(field || ''));
    return text.startsWith(q) || text.split(/[^a-z0-9]+/).some((part) => part.startsWith(q));
  });
}

export async function GET(r: NextRequest) {
  try {
    await ensureDatabase();
    const raw = r.nextUrl.searchParams.get('q')?.trim() || '';
    if (!raw) return NextResponse.json({ results: [] });

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
        c.description,
        COALESCE(
          ARRAY(
            SELECT sa.alias
            FROM skill_aliases sa
            WHERE sa.skill_id = s.id
            ORDER BY sa.id
          ),
          ARRAY[]::text[]
        ) AS aliases
      FROM skills s
      JOIN skill_categories sc ON sc.skill_id = s.id
      JOIN categories c ON c.id = sc.category_id
    `;

    const normalizedRaw = normalize(raw);

    // Very short queries are ambiguous. Use deterministic prefix matching
    // instead of pretending a one-letter query has a precise intent.
    const ranked = normalizedRaw.length <= 2
      ? rows
          .filter((row: any) => prefixMatch(raw, row))
          .sort((a: any, b: any) =>
            normalize(a.skill_name).localeCompare(normalize(b.skill_name))
          )
          .slice(0, 8)
          .map((row: any) => ({ row, score: 100 }))
      : rows
          .map((row: any) => ({ row, score: scoreSkill(raw, row) }))
          .filter((item: any) => item.score >= 55)
          .sort((a: any, b: any) =>
            b.score - a.score ||
            a.row.category_name.localeCompare(b.row.category_name)
          )
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
    return NextResponse.json(
      { error: 'Search is temporarily unavailable.' },
      { status: 500 }
    );
  }
}
