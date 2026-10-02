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
    SELECT id, name, slug, search_keyword, device_needed, gig_title, earning_range
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
    const external = await sql`
      SELECT id, title, url, source, description, link_type
      FROM links
      WHERE category_id = ${path.id} AND is_active = TRUE
      ORDER BY priority DESC, id ASC
      LIMIT 10
    `;
    const tools = await sql`
      SELECT t.id, t.name AS title, t.url, t.source, t.description
      FROM tools t
      JOIN skill_tools st ON st.tool_id = t.id
      WHERE st.skill_id = ${skill.id} AND t.is_active = TRUE
      ORDER BY t.name
    `;
    const earningPlatforms = await sql`
      SELECT ep.id, ep.name AS title, ep.url, ep.source, ep.description
      FROM earning_platforms ep
      JOIN skill_earning_platforms sep ON sep.platform_id = ep.id
      WHERE sep.skill_id = ${skill.id} AND ep.is_active = TRUE
      ORDER BY ep.name
    `;
    const articleLinks = articles.map((article: any) => ({
      id: `article-${article.id}`,
      title: article.title,
      url: `/blog/${article.slug}`,
      source: 'Doably',
      description: article.description || null,
      internal: true
    }));
    const allLinks = [...articleLinks, ...external];
    pathData.push({ ...path, links: allLinks, tools, earningPlatforms });
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
        <div className="skill-meta-grid">
          {skill.earning_range && <div><span>Potential range</span><b>{skill.earning_range}</b></div>}
          {skill.device_needed && <div><span>Setup</span><b>{skill.device_needed}</b></div>}
        </div>
        {skill.gig_title && <div className="skill-service"><span>Example service</span><b>{skill.gig_title}</b></div>}
      </section>

      <section className="skill-path-grid">
        {pathData.map((path) => (
          <article className="skill-path-card" key={path.id}>
            <div className="result-pill">{path.name}</div>
            <p>{path.description}</p>
            {path.tools?.length > 0 && <>
              <h3 className="resource-heading">🛠 Tools you can use</h3>
              <div className="skill-resource-list">{path.tools.map((link: any) => (
                <a className="article-link" href={link.url} target="_blank" rel="noreferrer" key={link.id}>
                  <div><b>{link.title}</b>{link.description && <span>{link.description}</span>}<small>{link.source || 'Tool'}</small></div>
                  <ArrowRight size={16} />
                </a>
              ))}</div>
            </>}
            {path.earningPlatforms?.length > 0 && <>
              <h3 className="resource-heading">💰 Places to earn</h3>
              <div className="skill-resource-list">{path.earningPlatforms.map((link: any) => (
                <a className="article-link" href={link.url} target="_blank" rel="noreferrer" key={link.id}>
                  <div><b>{link.title}</b>{link.description && <span>{link.description}</span>}<small>{link.source || 'Earning platform'}</small></div>
                  <ArrowRight size={16} />
                </a>
              ))}</div>
            </>}
            <div className="skill-resource-list">
              {path.links.filter((link: any) => !link.link_type || link.link_type === 'resource').map((link: any) => (
                <a className="article-link" href={link.url} target={link.internal ? undefined : "_blank"} rel={link.internal ? undefined : "noreferrer"} key={link.id}>
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
