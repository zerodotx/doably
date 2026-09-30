import {NextRequest,NextResponse} from 'next/server';
import {sql} from '@/db';
import {ensureDatabase} from '@/db/setup';
import {isAdmin} from '@/lib/admin';

export async function GET(){
  if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized'},{status:401});
  await ensureDatabase();
  const [skills,categories,links,subscribers,searchTerms,settings]=await Promise.all([
    sql`SELECT * FROM skills ORDER BY name`,
    sql`SELECT * FROM categories ORDER BY name`,
    sql`SELECT l.*,c.name AS category_name FROM links l JOIN categories c ON c.id=l.category_id ORDER BY c.name,l.priority DESC,l.id`,
    sql`SELECT * FROM subscribers ORDER BY created_at DESC`,
    sql`SELECT st.*,s.name AS skill_name FROM search_terms st LEFT JOIN skills s ON s.id=st.skill_id ORDER BY st.term`,
    sql`SELECT key,value FROM site_settings ORDER BY key`
  ]);
  return NextResponse.json({skills,categories,links,subscribers,searchTerms,settings});
}

export async function POST(r:NextRequest){
  if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized'},{status:401});
  await ensureDatabase();
  const b=await r.json();
  try{
    if(b.type==='skill'){const x=await sql`INSERT INTO skills(name,slug) VALUES(${b.name},${b.slug}) RETURNING *`;return NextResponse.json(x[0]);}
    if(b.type==='category'){const x=await sql`INSERT INTO categories(name,slug,description) VALUES(${b.name},${b.slug},${b.description}) RETURNING *`;if(b.skillId)await sql`INSERT INTO skill_categories(skill_id,category_id) VALUES(${Number(b.skillId)},${x[0].id}) ON CONFLICT DO NOTHING`;return NextResponse.json(x[0]);}
    if(b.type==='link'){const x=await sql`INSERT INTO links(category_id,title,url,source,description,priority,is_active) VALUES(${Number(b.categoryId)},${b.title},${b.url},${b.source||null},${b.description||null},${Number(b.priority||0)},TRUE) RETURNING *`;return NextResponse.json(x[0]);}
    if(b.type==='searchTerm'){const x=await sql`INSERT INTO search_terms(term,skill_id) VALUES(${b.term.toLowerCase().trim()},${b.skillId?Number(b.skillId):null}) RETURNING *`;return NextResponse.json(x[0]);}
    if(b.type==='setting'){await sql`INSERT INTO site_settings(key,value) VALUES(${b.key},${b.value||''}) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`;return NextResponse.json({ok:true});}
    return NextResponse.json({error:'Unknown type'},{status:400});
  }catch{return NextResponse.json({error:'Could not save. Check the fields and duplicate values.'},{status:400});}
}

export async function DELETE(r:NextRequest){
  if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized'},{status:401});
  await ensureDatabase();
  const {type,id}=await r.json();
  const table=type==='skill'?'skills':type==='category'?'categories':type==='link'?'links':type==='searchTerm'?'search_terms':type==='subscriber'?'subscribers':null;
  if(!table)return NextResponse.json({error:'Invalid type'},{status:400});
  await sql.query('DELETE FROM '+table+' WHERE id = $1',[Number(id)]);
  return NextResponse.json({ok:true});
}
