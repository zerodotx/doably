import { notFound } from 'next/navigation';
import { sql } from '@/db';
import { ensureDatabase } from '@/db/setup';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

function cleanInline(text: string) {
  return text
    .replace(/\\*\\*(.*?)\\*\\*/g, '$1')
    .replace(/\\*(.*?)\\*/g, '$1')
    .replace(/^#{1,6}\\s+/gm, '')
    .replace(/^[-*+]\\s+/gm, '• ')
    .replace(/\\[(.*?)\\]\\((.*?)\\)/g, '$1');
}

function renderArticle(markdown: string) {
  const source = cleanInline(markdown);
  return source.split(/\\n\\s*\\n/).map((block, index) => {
    const text = block.trim();
    if (!text) return null;
    if (/^#{3}\\s+/.test(text)) return <h3 key={index}>{text.replace(/^#{3}\\s+/, '')}</h3>;
    if (/^#{2}\\s+/.test(text)) return <h2 key={index}>{text.replace(/^#{2}\\s+/, '')}</h2>;
    if (/^#{1}\\s+/.test(text)) return <h2 key={index}>{text.replace(/^#{1}\\s+/, '')}</h2>;
    if (text.split('\\n').every((line) => /^• /.test(line))) {
      return <ul key={index}>{text.split('\\n').map((line, i) => <li key={i}>{line.slice(2)}</li>)}</ul>;
    }
    return <p key={index}>{text.split('\\n').map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}</p>;
  });
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
          <div className="blog-content">{renderArticle(article.content)}</div>
        </article>

        <aside className="blog-sidebar">
          <div className="blog-widget blog-ad-widget">Advertisement</div>
          <div className="blog-widget">
            <h3>Popular on Doably</h3>
            {related.map((item: any) => (
              <a href={`/blog/${item.slug}`} key={item.id}>
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
