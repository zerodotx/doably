import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/db';
import { ensureDatabase } from '@/db/setup';

export async function GET(r: NextRequest) {
  try {
    await ensureDatabase();
    const raw = r.nextUrl.searchParams.get('q')?.trim() || '';
    if (!raw) return NextResponse.json({ results: [] });

    const stopWords = ['i', 'can', 'do', 'know', 'want', 'like', 'to', 'my', 'what', 'with', 'and', 'the'];
    const words = raw.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 2 && !stopWords.includes(word));

    const terms = words.length ? words : [raw.toLowerCase()];
    const conditions = terms.map((term) => {
      const x = '%' + term + '%';
      return sql`(
        LOWER(s.name) LIKE ${x}
        OR LOWER(s.slug) LIKE ${x}
        OR LOWER(c.name) LIKE ${x}
        OR LOWER(c.slug) LIKE ${x}
        OR LOWER(c.description) LIKE ${x}
        OR EXISTS (
          SELECT 1 FROM links l
          WHERE l.category_id = c.id
            AND l.is_active = TRUE
            AND (LOWER(l.title) LIKE ${x} OR LOWER(COALESCE(l.description, '')) LIKE ${x})
        )
      )`;
    });

    const rows = await sql`
      SELECT DISTINCT s.name AS skill_name, c.id AS category_id, c.name AS category_name, c.description
      FROM skills s
      JOIN skill_categories sc ON sc.skill_id = s.id
      JOIN categories c ON c.id = sc.category_id
      WHERE ${sql.join(conditions, sql` OR `)}
      ORDER BY c.name
      LIMIT 12
    `;

    const results = [];
    for (const row of rows) {
      const links = await sql`
        SELECT id, title, url, source, description
        FROM links
        WHERE category_id = ${row.category_id} AND is_active = TRUE
        ORDER BY priority DESC, id ASC
        LIMIT 3
      `;
      results.push({ ...row, links });
    }

    return NextResponse.json({ results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Search is temporarily unavailable.' }, { status: 500 });
  }
}
