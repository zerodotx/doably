import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';

type Check = { key:string; label:string; status:'pass'|'warn'|'fail'; detail:string };

const words=(s:string)=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const h2s=(s:string)=>String(s||'').split(/\r?\n/).filter(x=>/^##\s+/.test(x.trim())&&!/^###\s+/.test(x.trim())).length;
const h3s=(s:string)=>String(s||'').split(/\r?\n/).filter(x=>/^###\s+/.test(x.trim())).length;
const section=(s:string,name:string)=>String(s||'').split(/\r?\n/).some(x=>x.trim().toLowerCase()===('## '+name).toLowerCase());
const longParas=(s:string)=>String(s||'').split(/\n\s*\n/).filter(p=>p.trim()&&!/^#{1,3}\s|^[-*+]\s|^\d+[.)]\s|^>\s/.test(p.trim())&&words(p)>120).length;

export async function POST(request:NextRequest){
  if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized'},{status:401});
  const b=await request.json();
  const title=String(b.title||'').trim(),slug=String(b.slug||'').trim(),content=String(b.content||'').trim();
  const seoTitle=String(b.seoTitle||'').trim(),meta=String(b.metaDescription||'').trim();
  if(!title||!content) return NextResponse.json({error:'The article needs a title and content.'},{status:400});

  const h2=h2s(content),h3=h3s(content),long=longParas(content),wc=words(content);
  const hasFaq=section(content,'Frequently Asked Questions')||section(content,'FAQ');
  const hasFinal=section(content,'Final Thoughts');
  const links=(content.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g)||[]).length;
  const claim=/\b(guaranteed|guarantee|risk[- ]free|instant money|easy money)\b|earn\s+\$\d+/i.test(content);
  const earning=/earn|income|freelanc|client|sell|paid|money|revenue/i.test(title+' '+content);

  const checks:Check[]=[
    {key:'structure',label:'Structure',status:h2>=3&&hasFaq&&hasFinal?'pass':h2>=3?'warn':'fail',detail:h2>=3&&hasFaq&&hasFinal?'Clear H2 structure, FAQ and Final Thoughts detected.':`Found ${h2} main H2 sections; ${hasFaq?'FAQ is present':'add an FAQ section'} and ${hasFinal?'Final Thoughts is present':'add Final Thoughts'}.`},
    {key:'readability',label:'Readability',status:long===0&&wc>250?'pass':long<=2?'warn':'fail',detail:long===0?'Paragraphs are reasonably short.':`${long} paragraph${long===1?'':'s'} look unusually long; break them up for easier reading.`},
    {key:'accuracy',label:'Accuracy & claims',status:claim?'warn':'pass',detail:claim?'Potential guarantee or promotional income language detected. Review those claims before publishing.':'No obvious guarantee or aggressive income-promise wording detected; factual review is still recommended.'},
    {key:'earning',label:'Earning relevance',status:earning?'pass':'warn',detail:earning?'The article clearly connects to earning, work, clients, selling, or income.':'The article may need a clearer connection to earning with the skill.'},
    {key:'seo',label:'SEO basics',status:seoTitle&&meta&&slug?'pass':seoTitle||meta||slug?'warn':'fail',detail:seoTitle&&meta&&slug?'Slug, SEO title and meta description are present.':'Add a slug, SEO title and meta description before publishing.'},
    {key:'links',label:'Useful links',status:links>0?'pass':'warn',detail:links>0?`${links} Markdown resource link${links===1?'':'s'} detected.`:'No Markdown links detected. Add relevant internal or external resources where appropriate.'},
    {key:'monetization',label:'Monetization safety',status:claim?'warn':'pass',detail:claim?'Review promotional wording so monetization does not create misleading expectations.':'No obvious aggressive monetization language detected.'},
    {key:'subheadings',label:'Subheadings',status:h3>0?'pass':'warn',detail:h3>0?`${h3} H3 subheading${h3===1?'':'s'} detected.`:'No H3 subheadings detected. Add them where they help break down methods or steps.'}
  ];
  const failures=checks.filter(c=>c.status==='fail').length,warnings=checks.filter(c=>c.status==='warn').length;
  const ready=failures===0&&warnings===0;
  const summary=ready?'All automated checks passed. Give the article a final human review before publishing.':`${failures} blocking check${failures===1?'':'s'} and ${warnings} warning${warnings===1?'':'s'} found. Review the flagged items before publishing.`;
  return NextResponse.json({ready,summary,checks});
}
