import { sql } from './index';

export async function ensureDatabase(){
  await sql`CREATE TABLE IF NOT EXISTS skills(id SERIAL PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,created_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS categories(id SERIAL PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,description TEXT NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS skill_categories(id SERIAL PRIMARY KEY,skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,UNIQUE(skill_id,category_id))`;
  await sql`CREATE TABLE IF NOT EXISTS links(id SERIAL PRIMARY KEY,category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,title TEXT NOT NULL,url TEXT NOT NULL,source TEXT,description TEXT,priority INTEGER NOT NULL DEFAULT 0,is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`ALTER TABLE links ADD COLUMN IF NOT EXISTS description TEXT`;
  await sql`ALTER TABLE links ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'resource'`;
  const seedTyped:any={
    illustration:[
      ['Canva','https://www.canva.com/','Canva','tool','Create and present visual mockups and designs.'],
      ['Adobe Illustrator','https://www.adobe.com/products/illustrator.html','Adobe','tool','Create vector illustrations and graphics.'],
      ['Figma','https://www.figma.com/','Figma','tool','Create visual designs and presentations.'],
      ['Fiverr','https://www.fiverr.com/','Fiverr','earning_platform','Offer illustration and design services.'],
      ['Upwork','https://www.upwork.com/','Upwork','earning_platform','Find freelance illustration and design projects.'],
      ['Etsy','https://www.etsy.com/','Etsy','earning_platform','Sell digital art and printable products.']
    ],
    'graphic-design':[
      ['Canva','https://www.canva.com/','Canva','tool','Create graphics and social designs.'],
      ['Adobe Express','https://www.adobe.com/express/','Adobe','tool','Create quick visual content and designs.'],
      ['Figma','https://www.figma.com/','Figma','tool','Design interfaces and visual assets.'],
      ['Fiverr','https://www.fiverr.com/categories/graphics-design','Fiverr','earning_platform','Offer graphic design services.'],
      ['Upwork','https://www.upwork.com/freelance-jobs/graphic-design/','Upwork','earning_platform','Find graphic design projects.'],
      ['99designs','https://99designs.com/','99designs','earning_platform','Find design contests and client work.']
    ],
    freelancing:[
      ['Canva','https://www.canva.com/','Canva','tool','Create portfolio pieces and client-ready designs.'],
      ['Google Docs','https://docs.google.com/','Google','tool','Prepare and deliver client work.'],
      ['Notion','https://www.notion.so/','Notion','tool','Organize projects and client workflows.'],
      ['Fiverr','https://www.fiverr.com/','Fiverr','earning_platform','Offer freelance services.'],
      ['Upwork','https://www.upwork.com/','Upwork','earning_platform','Find freelance projects.'],
      ['Freelancer','https://www.freelancer.com/','Freelancer','earning_platform','Browse freelance jobs and projects.']
    ],
    'content-creation':[
      ['Canva','https://www.canva.com/','Canva','tool','Create thumbnails, posts, and visual content.'],
      ['CapCut','https://www.capcut.com/','CapCut','tool','Edit short-form video content.'],
      ['YouTube Studio','https://studio.youtube.com/','YouTube','tool','Manage and publish video content.'],
      ['YouTube','https://www.youtube.com/','YouTube','earning_platform','Publish content and build an audience.'],
      ['Fiverr','https://www.fiverr.com/','Fiverr','earning_platform','Offer content creation services.'],
      ['Upwork','https://www.upwork.com/','Upwork','earning_platform','Find content creation projects.']
    ],
    '3d-mockup':[
      ['Canva','https://www.canva.com/','Canva','tool','Create product and presentation mockups quickly.'],
      ['Placeit','https://placeit.net/','Placeit','tool','Create product, apparel, device, and branding mockups.'],
      ['Mockey','https://mockey.ai/','Mockey','tool','Create product and apparel mockups.'],
      ['Blender','https://www.blender.org/','Blender','tool','Create advanced custom 3D models and renders.'],
      ['Fiverr','https://www.fiverr.com/categories/graphics-design/3d-design','Fiverr','earning_platform','Offer custom 3D mockup and 3D design services.'],
      ['Upwork','https://www.upwork.com/freelance-jobs/3d-design/','Upwork','earning_platform','Find freelance 3D design and mockup projects.'],
      ['Etsy','https://www.etsy.com/','Etsy','earning_platform','Sell reusable digital mockup templates and packs.'],
      ['Gumroad','https://gumroad.com/','Gumroad','earning_platform','Sell digital mockup packs and templates.'],
      ['Creative Market','https://creativemarket.com/','Creative Market','earning_platform','Sell mockup templates and design assets.']
    ]
  };

  const typedCats=await sql`SELECT id,slug,name FROM categories`;
  for(const cat of typedCats){
    const slug=String(cat.slug||'').toLowerCase();
    let entries=seedTyped[slug]||[];
    if(!entries.length && /3d.*mockup|mockup.*3d/i.test(slug+' '+String(cat.name||''))) entries=seedTyped['3d-mockup'];
    for(const [title,url,source,linkType,description] of entries){
      await sql`INSERT INTO links(category_id,title,url,source,description,link_type)
        VALUES(${cat.id},${title},${url},${source},${description},${linkType})
        ON CONFLICT DO NOTHING`;
    }
  }
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
  await sql`CREATE TABLE IF NOT EXISTS admin_credentials(id INTEGER PRIMARY KEY DEFAULT 1,password_hash TEXT NOT NULL,updated_at TIMESTAMP NOT NULL DEFAULT NOW())`;
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