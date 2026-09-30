import { notFound } from 'next/navigation';
import { sql } from '@/db';
import { ensureDatabase } from '@/db/setup';
import { ArrowRight, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

type SkillPageProps = { params: Promise<{ slug: string }> };

export default async function SkillArchive({ params }: SkillPageProps) {
  const { slug } = await params;
  await ensureDatabase();

  const skills = await sql`
    SELECT id, name, slug
    FROM skills
    WHERE slug = ${slug}
    LIMIT 1
  `;
  if (!skills.length) notFound();

  const skill: any = skills[0];
  const paths: any[] = await sql`
    SELECT c.id, c.name, c.slug, c.description
    FROM categories c
    JOIN skill_categories sc ON sc.category_id = c.id
    WHERE sc.skill_id = ${skill.id}
    ORDER BY c.name
  `;

  const pathData: any[] = [];
  for (const path of paths) {
    const articles = await sql`
      SELECT id, title, slug, excerpt AS description, views
      FROM blog_articles
      WHERE category_id = ${path.id} AND status = 'published'
      ORDER BY views DESC, updated_at DESC, id DESC
      LIMIT 2
    `;
    const externalLimit = articles.length >= 2 ? 1 : 3 - articles.length;
    const external = await sql`
      SELECT id, title, url, source, description
      FROM links
      WHERE category_id = ${path.id} AND is_active = TRUE
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
    pathData.push({ ...path, links: [...articleLinks, ...external] });
  }

  return (
    <main className="skill-archive">
      <header className="skill-archive-nav">
        <a className="simple-brand" href="/">doably</a>
        <a className="skill-back-link" href="/">← Search again</a>
      </header>

      <section className="skill-archive-hero">
        <div className="search-mark"><Sparkles size={17} /></div>
        <span className="skill-kicker">Skill archive</span>
        <h1>Ways to earn with {skill.name}</h1>
        <p>Explore practical paths, useful resources, and ideas connected to what you know.</p>
      </section>

      <section className="skill-path-grid">
        {pathData.map((path) => (
          <article className="skill-path-card" key={path.id}>
            <div className="result-pill">{path.name}</div>
            <p>{path.description}</p>
            <div className="skill-resource-list">
              {path.links.map((link: any) => (
                <a className="article-link" href={link.url} target="_blank" rel="noreferrer" key={link.id}>
                  <div>
                    <b>{link.title}</b>
                    {link.description && <span>{link.description}</span>}
                    <small>{link.source || 'External resource'}</small>
                  </div>
                  <ArrowRight size={16} />
                </a>
              ))}
            </div>
          </article>
        ))}
      </section>

      {!pathData.length && (
        <div className="skill-empty">
          <b>No earning paths have been added yet.</b>
          <span>Check back as Doably adds more resources for this skill.</span>
        </div>
      )}

      <footer className="simple-footer skill-archive-footer">
        <div><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/disclaimer">Disclaimer</a></div>
        <span>© 2026 Doably</span>
      </footer>
    </main>
  );
}
