import { sql } from './index';

export async function ensureDatabase(){
  await sql`CREATE TABLE IF NOT EXISTS skills(id SERIAL PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,search_keyword TEXT,device_needed TEXT,gig_title TEXT,earning_range TEXT,created_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS categories(id SERIAL PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,description TEXT NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS skill_categories(id SERIAL PRIMARY KEY,skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,UNIQUE(skill_id,category_id))`;
  await sql`CREATE TABLE IF NOT EXISTS skill_aliases(id SERIAL PRIMARY KEY,skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,alias TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'alias',created_at TIMESTAMP NOT NULL DEFAULT NOW(),UNIQUE(skill_id,alias))`;
  await sql`CREATE TABLE IF NOT EXISTS tools(id SERIAL PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,url TEXT NOT NULL,source TEXT,description TEXT,is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS skill_tools(id SERIAL PRIMARY KEY,skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,tool_id INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,UNIQUE(skill_id,tool_id))`;
  await sql`CREATE TABLE IF NOT EXISTS earning_platforms(id SERIAL PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,url TEXT NOT NULL,source TEXT,description TEXT,is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS skill_earning_platforms(id SERIAL PRIMARY KEY,skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,platform_id INTEGER NOT NULL REFERENCES earning_platforms(id) ON DELETE CASCADE,UNIQUE(skill_id,platform_id))`;
  await sql`CREATE TABLE IF NOT EXISTS links(id SERIAL PRIMARY KEY,category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,title TEXT NOT NULL,url TEXT NOT NULL,source TEXT,description TEXT,priority INTEGER NOT NULL DEFAULT 0,is_active BOOLEAN NOT NULL DEFAULT TRUE,link_type TEXT NOT NULL DEFAULT 'resource',created_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS subscribers(id SERIAL PRIMARY KEY,email TEXT NOT NULL UNIQUE,created_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS search_terms(id SERIAL PRIMARY KEY,term TEXT NOT NULL UNIQUE,skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,created_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS admin_credentials(id INTEGER PRIMARY KEY DEFAULT 1,password_hash TEXT NOT NULL,updated_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS site_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL DEFAULT '')`;
  await sql`CREATE TABLE IF NOT EXISTS blog_articles(id SERIAL PRIMARY KEY,title TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,excerpt TEXT NOT NULL DEFAULT '',content TEXT NOT NULL DEFAULT '',seo_title TEXT NOT NULL DEFAULT '',meta_description TEXT NOT NULL DEFAULT '',category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,status TEXT NOT NULL DEFAULT 'draft',views INTEGER NOT NULL DEFAULT 0,created_at TIMESTAMP NOT NULL DEFAULT NOW(),updated_at TIMESTAMP NOT NULL DEFAULT NOW())`;
  await sql`CREATE INDEX IF NOT EXISTS skill_aliases_alias_idx ON skill_aliases(alias)`;

  // One-time content reset for the new normalized data model.
  // Admin credentials are intentionally preserved so the owner is not locked out.
  const reset=await sql`SELECT value FROM site_settings WHERE key='normalized_data_model_v1_reset'`;
  if(!reset.length){
    await sql`TRUNCATE TABLE blog_articles, links, search_terms, skill_aliases, skill_tools, skill_earning_platforms, subscribers, skill_categories, tools, earning_platforms, categories, skills, site_settings RESTART IDENTITY CASCADE`;
    await sql`INSERT INTO site_settings(key,value) VALUES('normalized_data_model_v1_reset','done')`;
  }

  const existing=await sql`SELECT id FROM skills LIMIT 1`;
  if(existing.length) return;

  const drawing=await sql`INSERT INTO skills(name,slug,search_keyword,gig_title,earning_range) VALUES('Drawing','drawing','draw,sketch,illustration,art','I will create custom drawings and illustrations','Depends on service and client') RETURNING id`;
  const mockup=await sql`INSERT INTO skills(name,slug,search_keyword,gig_title,earning_range) VALUES('3D Mockup','3d-mockup','3d mockup,product mockup,3d design,mockup','I will create a realistic 3D mockup for your product','Depends on service and client') RETURNING id`;

  const pathSeeds=[
    [drawing[0].id,'Illustration','illustration','Turn drawing skills into visual artwork and illustration services.'],
    [drawing[0].id,'Graphic Design','graphic-design','Use drawing and design skills to create useful visual content.'],
    [drawing[0].id,'Freelancing','freelancing','Offer creative services directly to clients online.'],
    [drawing[0].id,'Content Creation','content-creation','Turn creative skills into content people can discover.'],
    [mockup[0].id,'3D Mockups','3d-mockups','Create realistic product, packaging, apparel, and device mockups.'],
    [mockup[0].id,'3D Design','3d-design','Create custom 3D models, scenes, and product visuals.'],
    [mockup[0].id,'Freelancing','mockup-freelancing','Offer mockup and 3D design services to clients.']
  ];
  for(const [skillId,name,slug,description] of pathSeeds){
    const c=await sql`INSERT INTO categories(name,slug,description) VALUES(${name},${slug},${description}) RETURNING id`;
    await sql`INSERT INTO skill_categories(skill_id,category_id) VALUES(${skillId},${c[0].id}) ON CONFLICT DO NOTHING`;
  }

  const aliases:any=[
    [drawing[0].id,'drawing','primary'],[drawing[0].id,'draw','alias'],[drawing[0].id,'sketching','alias'],[drawing[0].id,'sketch','alias'],[drawing[0].id,'illustration','alias'],
    [mockup[0].id,'3d mockup','primary'],[mockup[0].id,'3d','alias'],[mockup[0].id,'3d product mockup','alias'],[mockup[0].id,'product mockup','alias'],[mockup[0].id,'mockup','alias']
  ];
  for(const [skillId,alias,kind] of aliases) await sql`INSERT INTO skill_aliases(skill_id,alias,kind) VALUES(${skillId},${alias},${kind}) ON CONFLICT DO NOTHING`;

  const toolSeeds=[
    ['Canva','canva','https://www.canva.com/','Canva','Create graphics, presentations, and simple product mockups.'],
    ['Placeit','placeit','https://placeit.net/','Placeit','Create product, apparel, device, and branding mockups.'],
    ['Mockey','mockey','https://mockey.ai/','Mockey','Create product and apparel mockups.'],
    ['Blender','blender','https://www.blender.org/','Blender','Create advanced 3D models, scenes, and renders.'],
    ['Figma','figma','https://www.figma.com/','Figma','Design interfaces, graphics, and visual presentations.'],
    ['Adobe Illustrator','adobe-illustrator','https://www.adobe.com/products/illustrator.html','Adobe','Create vector illustrations and graphics.'],
    ['CapCut','capcut','https://www.capcut.com/','CapCut','Edit short-form video and social content.'],
    ['Photopea','photopea','https://www.photopea.com/','Photopea','Edit images and layered design files in the browser.']
  ];
  const toolIds:any={};
  for(const [name,slug,url,source,description] of toolSeeds){
    const x=await sql`INSERT INTO tools(name,slug,url,source,description) VALUES(${name},${slug},${url},${source},${description}) RETURNING id`;
    toolIds[slug]=x[0].id;
  }
  const toolLinks:any=[
    [drawing[0].id,['canva','figma','adobe-illustrator','photopea']],
    [mockup[0].id,['canva','placeit','mockey','blender','figma','photopea']]
  ];
  for(const [skillId,slugs] of toolLinks) for(const slug of slugs) await sql`INSERT INTO skill_tools(skill_id,tool_id) VALUES(${skillId},${toolIds[slug]}) ON CONFLICT DO NOTHING`;

  const platformSeeds=[
    ['Fiverr','fiverr','https://www.fiverr.com/','Fiverr','Offer freelance services to clients.'],
    ['Upwork','upwork','https://www.upwork.com/','Upwork','Find freelance projects and clients.'],
    ['Etsy','etsy','https://www.etsy.com/','Etsy','Sell digital products and templates.'],
    ['Gumroad','gumroad','https://gumroad.com/','Gumroad','Sell digital products directly to customers.'],
    ['Creative Market','creative-market','https://creativemarket.com/','Creative Market','Sell design assets and templates.'],
    ['Freelancer','freelancer','https://www.freelancer.com/','Freelancer','Browse freelance projects and services.']
  ];
  const platformIds:any={};
  for(const [name,slug,url,source,description] of platformSeeds){
    const x=await sql`INSERT INTO earning_platforms(name,slug,url,source,description) VALUES(${name},${slug},${url},${source},${description}) RETURNING id`;
    platformIds[slug]=x[0].id;
  }
  const platformLinks:any=[
    [drawing[0].id,['fiverr','upwork','etsy','creative-market']],
    [mockup[0].id,['fiverr','upwork','etsy','gumroad','creative-market','freelancer']]
  ];
  for(const [skillId,slugs] of platformLinks) for(const slug of slugs) await sql`INSERT INTO skill_earning_platforms(skill_id,platform_id) VALUES(${skillId},${platformIds[slug]}) ON CONFLICT DO NOTHING`;

  const cats=await sql`SELECT id,slug FROM categories`;
  const resources:any={
    illustration:[['Illustration resources','https://www.adobe.com/creativecloud/illustration/discover.html','Adobe']],
    'graphic-design':[['Graphic design resources','https://www.adobe.com/creativecloud/graphic-design.html','Adobe']],
    freelancing:[['Freelance creative jobs','https://www.upwork.com/freelance-jobs/graphic-design/','Upwork']],
    'content-creation':[['Creator resources','https://www.youtube.com/creators/','YouTube']],
    '3d-mockups':[['3D mockup inspiration','https://www.blender.org/get-involved/','Blender']],
    '3d-design':[['Blender resources','https://www.blender.org/support/','Blender']],
    'mockup-freelancing':[['3D design freelance jobs','https://www.upwork.com/freelance-jobs/3d-design/','Upwork']]
  };
  for(const c of cats) for(const [title,url,source] of(resources[c.slug]||[])) await sql`INSERT INTO links(category_id,title,url,source) VALUES(${c.id},${title},${url},${source})`;

  await sql`INSERT INTO search_terms(term,skill_id) VALUES('cupcut',${drawing[0].id}) ON CONFLICT DO NOTHING`;
}
