import { notFound } from 'next/navigation';
import { sql } from '@/db';
import { ensureDatabase } from '@/db/setup';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

function renderMarkdown(markdown: string) {
  return markdown.split(/\n\s*\n/).map((block, index) => {
    const text = block.trim();
    if (!text) return null;
    if (text.startsWith('### ')) return <h3 key={index}>{text.slice(4)}</h3>;
    if (text.startsWith('## ')) return <h2 key={index}>{text.slice(3)}</h2>;
    if (text.startsWith('# ')) return <h1 key={index}>{text.slice(2)}</h1>;
    if (text.split('\n').every((line) => /^[-*] /.test(line))) {
      return (
        <ul key={index}>
          {text.split('\n').map((line, i) => <li key={i}>{line.replace(/^[-*] /, '')}</li>)}
        </ul>
      );
    }
    return <p key={index}>{text.split('\n').map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}</p>;
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

  return (
    <main className="blog-article-page">
      <header className="simple-nav">
        <a className="simple-brand" href="/">doably</a>
        <a className="skill-back-link" href="/"><span>←</span> Search</a>
      </header>

      <article className="blog-article">
        {article.category_name && <div className="result-pill">{article.category_name}</div>}
        <h1>{article.title}</h1>
        {article.excerpt && <p className="blog-excerpt">{article.excerpt}</p>}
        <div className="blog-content">{renderMarkdown(article.content)}</div>
      </article>

      <footer className="simple-footer">
        <div><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/disclaimer">Disclaimer</a></div>
        <span>© 2026 Doably</span>
      </footer>
    </main>
  );
}
