import { sql } from './index';

export async function ensureDatabase(){
  await sql`CREATE TABLE IF NOT EXISTS skills(id SERIAL PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,created_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS categories(id SERIAL PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,description TEXT NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS skill_categories(id SERIAL PRIMARY KEY,skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,UNIQUE(skill_id,category_id))`;
  await sql`CREATE TABLE IF NOT EXISTS links(id SERIAL PRIMARY KEY,category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,title TEXT NOT NULL,url TEXT NOT NULL,source TEXT,description TEXT,priority INTEGER NOT NULL DEFAULT 0,is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`ALTER TABLE links ADD COLUMN IF NOT EXISTS description TEXT`;
  await sql`ALTER TABLE skills ADD COLUMN IF NOT EXISTS search_keyword TEXT`;
  await sql`ALTER TABLE skills ADD COLUMN IF NOT EXISTS device_needed TEXT`;
  await sql`ALTER TABLE skills ADD COLUMN IF NOT EXISTS gig_title TEXT`;
  await sql`ALTER TABLE skills ADD COLUMN IF NOT EXISTS earning_range TEXT`;
  await sql`CREATE TABLE IF NOT EXISTS subscribers(id SERIAL PRIMARY KEY,email TEXT NOT NULL UNIQUE,created_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS search_terms(id SERIAL PRIMARY KEY,term TEXT NOT NULL UNIQUE,skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,created_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS skill_aliases(id SERIAL PRIMARY KEY,skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,alias TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'alias',created_at TIMESTAMP NOT NULL DEFAULT NOW(),UNIQUE(skill_id,alias))`;
  await sql`CREATE INDEX IF NOT EXISTS skill_aliases_alias_idx ON skill_aliases(alias)`;
  await sql`INSERT INTO skill_aliases(skill_id,alias,kind)
    SELECT id, lower(name), 'primary' FROM skills
    ON CONFLICT(skill_id,alias) DO NOTHING`;
  await sql`INSERT INTO skill_aliases(skill_id,alias,kind)
    SELECT id, lower(replace(slug,'-',' ')), 'generated' FROM skills
    ON CONFLICT(skill_id,alias) DO NOTHING`;
  await sql`CREATE TABLE IF NOT EXISTS site_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL DEFAULT '')`;
  await sql`CREATE TABLE IF NOT EXISTS blog_articles(id SERIAL PRIMARY KEY,title TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,excerpt TEXT NOT NULL DEFAULT '',content TEXT NOT NULL DEFAULT '',seo_title TEXT NOT NULL DEFAULT '',meta_description TEXT NOT NULL DEFAULT '',category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,status TEXT NOT NULL DEFAULT 'draft',views INTEGER NOT NULL DEFAULT 0,created_at TIMESTAMP NOT NULL DEFAULT NOW(),updated_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0`;


  const existing=await sql`SELECT id FROM skills LIMIT 1`; if(existing.length)return;
  const s=await sql`INSERT INTO skills(name,slug) VALUES('Drawing','drawing') RETURNING id`; const skillId=s[0].id;
  const seed=[['Illustration','illustration','Turn your drawing skills into visual artwork and creative work.'],['Graphic Design','graphic-design','Use drawing skills to create useful visual designs.'],['Freelancing','freelancing','Explore ways to offer your creative skills online.'],['Content Creation','content-creation','Turn your drawing into content people can discover.']];
  for(const [name,slug,description] of seed){const c=await sql`INSERT INTO categories(name,slug,description) VALUES(${name},${slug},${description}) RETURNING id`;await sql`INSERT INTO skill_categories(skill_id,category_id) VALUES(${skillId},${c[0].id})`;}
  const cats=await sql`SELECT id,slug FROM categories`;
  const urls:any={illustration:[['Illustration resources from Adobe','https://www.adobe.com/creativecloud/illustration/discover.html','Adobe'],['Illustration courses','https://www.domestika.org/en/courses/search/illustration','Domestika'],['Illustration inspiration','https://www.wacom.com/en-us/discover/draw','Wacom']], 'graphic-design':[['Graphic design resources','https://www.adobe.com/creativecloud/graphic-design.html','Adobe'],['Graphic design courses','https://www.domestika.org/en/courses/search/graphic-design','Domestika'],['Graphic design freelance jobs','https://www.upwork.com/freelance-jobs/graphic-design/','Upwork']], freelancing:[['Freelance creative jobs','https://www.upwork.com/freelance-jobs/graphic-design/','Upwork'],['Freelance jobs','https://www.fiverr.com/categories/graphics-design','Fiverr'],['Creative freelance guide','https://www.shopify.com/blog/freelance-business','Shopify']], 'content-creation':[['Creator resources','https://www.shopify.com/blog/content-creator','Shopify'],['YouTube creator resources','https://www.youtube.com/creators/','YouTube'],['Content creation guide','https://www.adobe.com/creativecloud/video/discover/content-creation.html','Adobe']]};
  for(const c of cats)for(const [title,url,source] of(urls[c.slug]||[]))await sql`INSERT INTO links(category_id,title,url,source) VALUES(${c.id},${title},${url},${source})`;
}