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
        OR EXISTS (
          SELECT 1 FROM search_terms st
          WHERE LOWER(st.term) LIKE ${x}
            AND (st.skill_id IS NULL OR st.skill_id = s.id)
        )
      )`;
    });

    const whereSql = conditions.slice(1).reduce(
      (acc, condition) => sql`(${acc} OR ${condition})`,
      conditions[0]
    );

    const rows = await sql`
      SELECT DISTINCT s.name AS skill_name, s.slug AS skill_slug, s.search_keyword, s.device_needed, s.gig_title, s.earning_range, c.id AS category_id, c.name AS category_name, c.description
      FROM skills s
      JOIN skill_categories sc ON sc.skill_id = s.id
      JOIN categories c ON c.id = sc.category_id
      WHERE ${whereSql}
      ORDER BY c.name
      LIMIT 12
    `;

    const results = [];
    for (const row of rows) {
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
