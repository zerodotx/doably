async function ensureSearchResourcesV2(){
  const marker=await sql`SELECT value FROM site_settings WHERE key='search_resources_v2_seed'`;
  if(marker.length) return;

  const resources:any={
    illustration:[
      ['How to find inspiration for your graphics','https://www.canva.com/learn/feeding-creativity-find-inspiration-graphics/','Canva'],
      ['Design elements and principles','https://www.canva.com/learn/design-elements-and-principles/','Canva'],
      ['Graphic design tips for beginners','https://www.canva.com/learn/graphic-design-tips-non-designers/','Canva']
    ],
    'graphic-design':[
      ['Graphic design tips for beginners','https://www.canva.com/learn/graphic-design-tips-non-designers/','Canva'],
      ['Design elements and principles','https://www.canva.com/learn/design-elements-and-principles/','Canva'],
      ['A comprehensive guide to design principles','https://www.canva.com/learn/guide-to-understanding-design-principles/','Canva']
    ],
    freelancing:[
      ['How to get clients as a freelancer','https://www.upwork.com/resources/how-to-get-clients-as-a-freelancer','Upwork'],
      ['How to get graphic design clients','https://www.upwork.com/resources/get-graphic-design-clients','Upwork'],
      ['How to build a freelance portfolio','https://www.upwork.com/resources/how-to-create-portfolio','Upwork']
    ],
    'content-creation':[
      ['What is a content creator and how to become one','https://www.adobe.com/express/learn/blog/content-creator','Adobe Express'],
      ['How to speed up content creation','https://www.adobe.com/express/learn/blog/content-creation','Adobe Express'],
      ['How to speed up your team’s content creation process','https://www.canva.com/learn/content-creation/','Canva']
    ],
    '3d-mockups':[
      ['3D Ecommerce: What It Is and How to Use It','https://www.shopify.com/blog/3d-ecommerce','Shopify'],
      ['How to generate professional mockups with Adobe Express','https://www.adobe.com/uk/express/learn/blog/generate-professional-mockups','Adobe Express'],
      ['Create Realistic 3D Mock-ups with Adobe Stock and Dimension','https://blog.adobe.com/en/publish/2020/02/05/create-realistic-3d-mock-ups-with-adobe-stock-and-dimension','Adobe']
    ],
    '3d-design':[
      ['Start 3D: An introduction to key 3D concepts','https://blog.adobe.com/en/publish/2020/11/09/start-3d-an-introduction-to-key-3d-concepts','Adobe'],
      ['3D Design Tutorial: Rich Package Designs and Product Mock-Ups','https://blog.adobe.com/en/publish/2019/10/24/3d-design-tutorial-package-design-product-mockups','Adobe'],
      ['Visualize your Product in a Realistic Environment','https://blog.adobe.com/en/publish/2019/10/31/visualize-your-product-in-a-realistic-environment','Adobe']
    ],
    'mockup-freelancing':[
      ['How to get clients as a freelancer','https://www.upwork.com/resources/how-to-get-clients-as-a-freelancer','Upwork'],
      ['Designer Profile Tips and Examples','https://www.upwork.com/resources/designer-profile-tips','Upwork'],
      ['Upwork Portfolio Guide','https://www.upwork.com/resources/portfolio-guide','Upwork']
    ]
  };

  const cats=await sql`SELECT id,slug FROM categories`;
  for(const c of cats){
    for(const [title,url,source] of(resources[c.slug]||[])){
      await sql`INSERT INTO links(category_id,title,url,source,description,priority,link_type)
        SELECT ${c.id},${title},${url},${source},'Helpful reading related to this earning path.',${100},'resource'
        WHERE NOT EXISTS (SELECT 1 FROM links WHERE category_id=${c.id} AND url=${url})`;
    }
  }
  await sql`INSERT INTO site_settings(key,value) VALUES('search_resources_v2_seed','done') ON CONFLICT(key) DO NOTHING`;
}

async function ensureNormalizedResourcesV2(){
  const marker=await sql`SELECT value FROM site_settings WHERE key='normalized_resources_v2_backfill'`;
  if(marker.length) return;

  const toolSeeds:any=[
    ['Canva','canva','https://www.canva.com/','Canva','Create graphics, presentations, and simple product mockups.'],
    ['Placeit','placeit','https://placeit.net/','Placeit','Create product, apparel, device, and branding mockups.'],
    ['Mockey','mockey','https://mockey.ai/','Mockey','Create product and apparel mockups.'],
    ['Blender','blender','https://www.blender.org/','Blender','Create advanced 3D models, scenes, and renders.'],
    ['Figma','figma','https://www.figma.com/','Figma','Design interfaces, graphics, and visual presentations.'],
    ['Adobe Illustrator','adobe-illustrator','https://www.adobe.com/products/illustrator.html','Adobe','Create vector illustrations and graphics.'],
    ['CapCut','capcut','https://www.capcut.com/','CapCut','Edit short-form video and social content.'],
    ['Photopea','photopea','https://www.photopea.com/','Photopea','Edit images and layered design files in the browser.']
  ];
  for(const [name,slug,url,source,description] of toolSeeds){
    await sql`INSERT INTO tools(name,slug,url,source,description)
      VALUES(${name},${slug},${url},${source},${description})
      ON CONFLICT(slug) DO NOTHING`;
  }

  const platformSeeds:any=[
    ['Fiverr','fiverr','https://www.fiverr.com/','Fiverr','Offer freelance services to clients.'],
    ['Upwork','upwork','https://www.upwork.com/','Upwork','Find freelance projects and clients.'],
    ['Etsy','etsy','https://www.etsy.com/','Etsy','Sell digital products and templates.'],
    ['Gumroad','gumroad','https://gumroad.com/','Gumroad','Sell digital products directly to customers.'],
    ['Creative Market','creative-market','https://creativemarket.com/','Creative Market','Sell design assets and templates.'],
    ['Freelancer','freelancer','https://www.freelancer.com/','Freelancer','Browse freelance projects and services.']
  ];
  for(const [name,slug,url,source,description] of platformSeeds){
    await sql`INSERT INTO earning_platforms(name,slug,url,source,description)
      VALUES(${name},${slug},${url},${source},${description})
      ON CONFLICT(slug) DO NOTHING`;
  }

  const skillRows=await sql`SELECT id,slug FROM skills WHERE slug IN ('drawing','3d-mockup')`;
  const toolMap:any={};
  const platformMap:any={};
  for(const x of await sql`SELECT id,slug FROM tools`) toolMap[x.slug]=x.id;
  for(const x of await sql`SELECT id,slug FROM earning_platforms`) platformMap[x.slug]=x.id;

  for(const skill of skillRows){
    const toolSlugs=skill.slug==='3d-mockup'
      ? ['canva','placeit','mockey','blender','figma','photopea']
      : ['canva','figma','adobe-illustrator','photopea'];
    const platformSlugs=skill.slug==='3d-mockup'
      ? ['fiverr','upwork','etsy','gumroad','creative-market','freelancer']
      : ['fiverr','upwork','etsy','creative-market'];

    for(const slug of toolSlugs){
      if(toolMap[slug]) await sql`INSERT INTO skill_tools(skill_id,tool_id) VALUES(${skill.id},${toolMap[slug]}) ON CONFLICT DO NOTHING`;
    }
    for(const slug of platformSlugs){
      if(platformMap[slug]) await sql`INSERT INTO skill_earning_platforms(skill_id,platform_id) VALUES(${skill.id},${platformMap[slug]}) ON CONFLICT DO NOTHING`;
    }
  }

  await sql`INSERT INTO site_settings(key,value) VALUES('normalized_resources_v2_backfill','done') ON CONFLICT(key) DO NOTHING`;
}

async function ensureSkillKeywordsV1(){
  const marker=await sql`SELECT value FROM site_settings WHERE key='skill_keywords_v1'`;
  if(marker.length) return;

  const keywordSeeds:any={
    '3d-mockup':'3d mockup,3d mockups,mockup,mockups,product mockup,product mockups,3d product,product visualization',
    'drawing':'draw,drawing,sketch,sketching,illustration,illustrations',
    '3d-design':'3d,3d design,3d modeling,3d modelling,modeling,modelling,3d models,3d rendering,rendering'
  };

  for(const [slug,keywords] of Object.entries(keywordSeeds)){
    await sql`UPDATE skills SET search_keyword=${keywords} WHERE slug=${slug}`;
  }

  await sql`INSERT INTO site_settings(key,value) VALUES('skill_keywords_v1','done') ON CONFLICT(key) DO NOTHING`;
}

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
  if(existing.length){
    await ensureSkillKeywordsV1();
    await ensureNormalizedResourcesV2();
    await ensureSearchResourcesV2();
    return;
  }

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

  await ensureSkillKeywordsV1();
  await ensureNormalizedResourcesV2();
  await ensureSearchResourcesV2();

}
