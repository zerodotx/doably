import { notFound } from 'next/navigation';
import { sql } from '@/db';
import { ensureDatabase } from '@/db/setup';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

type Heading = { level: 2 | 3; text: string; id: string };

function cleanInline(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\`(.*?)\`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(text: string) {
  return cleanInline(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
}

function getHeadings(markdown: string): Heading[] {
  const used = new Map<string, number>();
  const headings: Heading[] = [];

  for (const line of String(markdown || '').split('\n')) {
    const match = line.match(/^#{1,3}\s+(.+?)\s*$/);
    if (!match) continue;

    const rawLevel = line.match(/^(#{1,3})/)?.[1].length || 2;
    const level: 2 | 3 = rawLevel === 3 ? 3 : 2;
    const text = cleanInline(match[1]);
    if (!text || /^table of contents$/i.test(text)) continue;

    const base = slugify(text);
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    headings.push({ level, text, id: count ? base + '-' + (count + 1) : base });
  }

  return headings;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\`.*?\`|\[.*?\]\(.*?\))/g);
  return parts.map((part, index) => {
    if (/^\*\*.*\*\*$/.test(part)) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (/^\*.*\*$/.test(part)) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (/^\`.*\`$/.test(part)) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    const link = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (link) {
      return <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    }
    return <span key={index}>{part}</span>;
  });
}

function renderArticle(markdown: string) {
  const headings = getHeadings(markdown);
  let headingIndex = 0;
  const blocks = String(markdown || '').trim().split(/\n\s*\n/);

  return {
    headings,
    nodes: blocks.map((block, index) => {
      const text = block.trim();
      if (!text) return null;

      const heading = text.match(/^#{1,3}\s+(.+)$/);
      if (heading) {
        const level = text.match(/^(#{1,3})/)?.[1].length || 2;
        const item = headings[headingIndex++];
        const id = item?.id || slugify(heading[1]);
        const title = cleanInline(heading[1]);
        if (level === 3) return <h3 id={id} key={index}>{renderInline(title)}</h3>;
        return <h2 id={id} key={index}>{renderInline(title)}</h2>;
      }

      const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
      const unordered = lines.length > 0 && lines.every((line) => /^[-*+]\s+/.test(line));
      if (unordered) {
        return (
          <ul key={index}>
            {lines.map((line, i) => <li key={i}>{renderInline(line.replace(/^[-*+]\s+/, ''))}</li>)}
          </ul>
        );
      }

      const ordered = lines.length > 0 && lines.every((line) => /^\d+[.)]\s+/.test(line));
      if (ordered) {
        return (
          <ol key={index}>
            {lines.map((line, i) => <li key={i}>{renderInline(line.replace(/^\d+[.)]\s+/, ''))}</li>)}
          </ol>
        );
      }

      if (lines.every((line) => /^>\s?/.test(line))) {
        return <blockquote key={index}>{lines.map((line, i) => <span key={i}>{i > 0 && <br />}{renderInline(line.replace(/^>\s?/, ''))}</span>)}</blockquote>;
      }

      return (
        <p key={index}>
          {lines.map((line, i) => <span key={i}>{i > 0 && <br />}{renderInline(line)}</span>)}
        </p>
      );
    })
  };
}

export default async function BlogArticle({ params }: Props) {
  const { slug } = await params;
  await ensureDatabase();

  const rows = await sql`
    SELECT b.*, c.name AS category_name
    FROM blog_articles b
    LEFT JOIN categories c ON c.id = b.category_id
    WHERE b.slug = ${slug} AND b.status = 'published'
    LIMIT 1
  `;

  if (!rows.length) notFound();
  const article: any = rows[0];
  await sql`UPDATE blog_articles SET views = views + 1 WHERE id = ${article.id}`;

  const related = await sql`
    SELECT id, title, slug, excerpt
    FROM blog_articles
    WHERE category_id = ${article.category_id} AND status = 'published' AND id <> ${article.id}
    ORDER BY views DESC, updated_at DESC
    LIMIT 5
  `;

  const rendered = renderArticle(article.content || '');

  return (
    <main className="blog-site">
      <header className="blog-header">
        <a className="simple-brand" href="/">doably</a>
        <nav><a href="/">Search</a><a href="/about">About</a><a href="/contact">Contact</a></nav>
      </header>

      <div className="blog-ad-slot blog-ad-top">Advertisement</div>

      <div className="blog-layout">
        <article className="blog-article">
          {article.category_name && <div className="blog-category">{article.category_name}</div>}
          <h1>{cleanInline(article.title)}</h1>
          {article.excerpt && <p className="blog-excerpt">{cleanInline(article.excerpt)}</p>}
          <div className="blog-meta">Doably · Updated {new Date(article.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>

          {rendered.headings.length >= 2 && (
            <nav className="blog-toc" aria-label="Table of contents">
              <div className="blog-toc-title">Table of Contents</div>
              <ol>
                {rendered.headings.map((heading) => (
                  <li className={heading.level === 3 ? 'blog-toc-sub' : ''} key={heading.id}>
                    <a href={'#' + heading.id}>{heading.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="blog-content">
            {rendered.nodes}
          </div>
        </article>

        <aside className="blog-sidebar">
          <div className="blog-widget blog-ad-widget">Advertisement</div>
          {rendered.headings.length >= 2 && (
            <div className="blog-widget blog-sidebar-toc">
              <h3>In this article</h3>
              {rendered.headings.slice(0, 8).map((heading) => (
                <a className={heading.level === 3 ? 'sub' : ''} href={'#' + heading.id} key={heading.id}>{heading.text}</a>
              ))}
            </div>
          )}
          <div className="blog-widget">
            <h3>Popular on Doably</h3>
            {related.map((item: any) => (
              <a href={'/blog/' + item.slug} key={item.id}>
                <b>{cleanInline(item.title)}</b>
                {item.excerpt && <small>{cleanInline(item.excerpt)}</small>}
              </a>
            ))}
          </div>
          <div className="blog-widget">
            <h3>Explore</h3>
            <a href="/">Find ways to earn</a>
            <a href="/about">About Doably</a>
            <a href="/contact">Contact</a>
          </div>
        </aside>
      </div>

      <div className="blog-ad-slot blog-ad-bottom">Advertisement</div>

      <footer className="blog-footer simple-footer">
        <div><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/disclaimer">Disclaimer</a></div>
        <span>© 2026 Doably</span>
      </footer>
    </main>
  );
}
