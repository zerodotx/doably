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
  const headingIds = new Map<string, string>();
  headings.forEach((heading) => headingIds.set(heading.text, heading.id));
  let headingIndex = 0;

  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const nodes: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let quote: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    nodes.push(
      <p key={nodes.length}>
        {paragraph.map((line, i) => <span key={i}>{i > 0 && <br />}{renderInline(line)}</span>)}
      </p>
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const Tag = list.type;
    nodes.push(
      <Tag key={nodes.length}>
        {list.items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
      </Tag>
    );
    list = null;
  };

  const flushQuote = () => {
    if (!quote.length) return;
    nodes.push(
      <blockquote key={nodes.length}>
        {quote.map((line, i) => <span key={i}>{i > 0 && <br />}{renderInline(line)}</span>)}
      </blockquote>
    );
    quote = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushAll();
      continue;
    }

    // Handle Markdown headings even when the heading is directly followed
    // by another line without a blank line.
    const heading = line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (heading) {
      flushAll();
      const level = heading[1].length === 3 ? 3 : 2;
      const title = cleanInline(heading[2]);
      if (/^table of contents$/i.test(title)) continue;

      const item = headings[headingIndex++];
      const id = item?.id || headingIds.get(title) || slugify(title);
      nodes.push(level === 3
        ? <h3 id={id} key={nodes.length}>{renderInline(title)}</h3>
        : <h2 id={id} key={nodes.length}>{renderInline(title)}</h2>
      );
      continue;
    }

    const unordered = line.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      flushQuote();
      if (!list || list.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      list.items.push(unordered[1]);
      continue;
    }

    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      flushQuote();
      if (!list || list.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }

    const quoteLine = line.match(/^>\s?(.*)$/);
    if (quoteLine) {
      flushParagraph();
      flushList();
      quote.push(quoteLine[1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line);
  }

  flushAll();

  return { headings, nodes };
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
