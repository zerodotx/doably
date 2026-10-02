import {NextRequest,NextResponse} from 'next/server';
import {sql} from '@/db';
import {ensureDatabase} from '@/db/setup';
import {isAdmin} from '@/lib/admin';

export async function GET(){
  if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized'},{status:401});
  await ensureDatabase();
  const [skills,categories,links,subscribers,searchTerms,settings,blogArticles]=await Promise.all([
    sql`SELECT * FROM skills ORDER BY name`,
    sql`SELECT * FROM categories ORDER BY name`,
    sql`SELECT l.*,c.name AS category_name FROM links l JOIN categories c ON c.id=l.category_id ORDER BY c.name,l.priority DESC,l.id`,
    sql`SELECT * FROM subscribers ORDER BY created_at DESC`,
    sql`SELECT st.*,s.name AS skill_name FROM search_terms st LEFT JOIN skills s ON s.id=st.skill_id ORDER BY st.term`,
    sql`SELECT * FROM site_settings ORDER BY key`,
    sql`SELECT b.*,c.name AS category_name FROM blog_articles b LEFT JOIN categories c ON c.id=b.category_id ORDER BY b.updated_at DESC`
  ]);
  return NextResponse.json({skills,categories,links,subscribers,searchTerms,settings,blogArticles});
}

export async function POST(r:NextRequest){
  if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized'},{status:401});
  await ensureDatabase();
  const b=await r.json();
  try{
    if(b.type==='skill'){const x=await sql`INSERT INTO skills(name,slug) VALUES(${b.name},${b.slug}) RETURNING *`;return NextResponse.json(x[0]);}
    if(b.type==='category'){const x=await sql`INSERT INTO categories(name,slug,description) VALUES(${b.name},${b.slug},${b.description}) RETURNING *`;if(b.skillId)await sql`INSERT INTO skill_categories(skill_id,category_id) VALUES(${Number(b.skillId)},${x[0].id}) ON CONFLICT DO NOTHING`;return NextResponse.json(x[0]);}
    if(b.type==='link'){const x=await sql`INSERT INTO links(category_id,title,url,source,description,priority,is_active,link_type) VALUES(${Number(b.categoryId)},${b.title},${b.url},${b.source||null},${b.description||null},${Number(b.priority||0)},TRUE,${b.linkType||'resource'}) RETURNING *`;return NextResponse.json(x[0]);}
    if(b.type==='searchTerm'){const x=await sql`INSERT INTO search_terms(term,skill_id) VALUES(${b.term.toLowerCase().trim()},${b.skillId?Number(b.skillId):null}) RETURNING *`;return NextResponse.json(x[0]);}
    if(b.type==='blogArticle'){const x=await sql`INSERT INTO blog_articles(title,slug,excerpt,content,seo_title,meta_description,category_id,status) VALUES(${b.title},${b.slug},${b.excerpt||''},${b.content||''},${b.seoTitle||''},${b.metaDescription||''},${b.categoryId?Number(b.categoryId):null},${b.status||'draft'}) RETURNING *`;return NextResponse.json(x[0]);}
    if(b.type==='updateBlogArticle'){const x=await sql`UPDATE blog_articles SET title=${b.title},slug=${b.slug},excerpt=${b.excerpt||''},content=${b.content||''},seo_title=${b.seoTitle||''},meta_description=${b.metaDescription||''},category_id=${b.categoryId?Number(b.categoryId):null},status=${b.status||'draft'},updated_at=NOW() WHERE id=${Number(b.id)} RETURNING *`;return NextResponse.json(x[0]);}
    if(b.type==='setting'){await sql`INSERT INTO site_settings(key,value) VALUES(${b.key},${b.value||''}) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`;return NextResponse.json({ok:true});}
    return NextResponse.json({error:'Unknown type'},{status:400});
  }catch{return NextResponse.json({error:'Could not save. Check the fields and duplicate values.'},{status:400});}
}

export async function DELETE(r:NextRequest){
  if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized'},{status:401});
  await ensureDatabase();
  const {type,id}=await r.json();
  const table=type==='skill'?'skills':type==='category'?'categories':type==='link'?'links':type==='searchTerm'?'search_terms':type==='subscriber'?'subscribers':type==='blogArticle'?'blog_articles':null;
  if(!table)return NextResponse.json({error:'Invalid type'},{status:400});
  await sql.query('DELETE FROM '+table+' WHERE id = $1',[Number(id)]);
  return NextResponse.json({ok:true});
}
