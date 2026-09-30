'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, BookOpen, ChevronRight, Database, ExternalLink, FileText, FolderKanban,
  LayoutDashboard, Link2, LogOut, Megaphone, Plus, Search, Settings2, Sparkles,
  Trash2, Users, X
} from 'lucide-react';

type Skill={id:number;name:string;slug:string};
type Category={id:number;name:string;slug:string;description:string};
type LinkItem={id:number;category_id:number;category_name:string;title:string;url:string;source?:string|null;description?:string|null;priority?:number};
type Subscriber={id:number;email:string;created_at:string};
type SearchTerm={id:number;term:string;skill_id?:number|null;skill_name?:string|null};
type Setting={key:string;value:string};
type BlogArticle={id:number;title:string;slug:string;excerpt:string;content:string;seo_title:string;meta_description:string;category_id?:number|null;category_name?:string|null;status:string;created_at:string;updated_at:string};
type Data={skills:Skill[];categories:Category[];links:LinkItem[];subscribers:Subscriber[];searchTerms:SearchTerm[];settings:Setting[];blogArticles:BlogArticle[]};
type Tab='overview'|'skills'|'paths'|'articles'|'article-studio'|'subscribers'|'search'|'monetization'|'settings';

const empty:Data={skills:[],categories:[],links:[],subscribers:[],searchTerms:[],settings:[],blogArticles:[]};

export default function Admin(){
  const [ok,setOk]=useState(false),[pw,setPw]=useState(''),[data,setData]=useState<Data>(empty);
  const [tab,setTab]=useState<Tab>('overview'),[query,setQuery]=useState(''),[formOpen,setFormOpen]=useState(false);
  const [form,setForm]=useState<Record<string,string>>({}),[saving,setSaving]=useState(false),[loading,setLoading]=useState(true);

  async function load(){setLoading(true);const r=await fetch('/api/admin/data');if(r.ok){setData(await r.json());setOk(true)}else setOk(false);setLoading(false)}
  useEffect(()=>{load()},[]);
  async function login(e:React.FormEvent){e.preventDefault();setSaving(true);const r=await fetch('/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:pw})});setSaving(false);if(r.ok){setPw('');load()}else alert('Invalid password')}
  async function save(e:React.FormEvent){e.preventDefault();setSaving(true);const type=tab==='skills'?'skill':tab==='paths'?'category':tab==='articles'?'link':tab==='search'?'searchTerm':'setting';const r=await fetch('/api/admin/data',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type,...form})});setSaving(false);if(!r.ok){const b=await r.json().catch(()=>({}));alert(b.error||'Could not save.');return}setForm({});setFormOpen(false);await load()}
  async function del(type:string,id:number){if(!confirm('Delete this item? This cannot be undone.'))return;const r=await fetch('/api/admin/data',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({type,id})});if(!r.ok)alert('Could not delete this item.');else load()}
  async function logout(){await fetch('/api/admin/logout',{method:'POST'});location.reload()}
  function openForm(t:Tab){setTab(t);setForm({});setFormOpen(true)}
  const q=query.toLowerCase();
  const skills=useMemo(()=>data.skills.filter(x=>(x.name+' '+x.slug).toLowerCase().includes(q)),[data.skills,q]);
  const paths=useMemo(()=>data.categories.filter(x=>(x.name+' '+x.slug+' '+x.description).toLowerCase().includes(q)),[data.categories,q]);
  const articles=useMemo(()=>data.links.filter(x=>(x.title+' '+x.category_name+' '+(x.source||'')).toLowerCase().includes(q)),[data.links,q]);
  const subs=useMemo(()=>data.subscribers.filter(x=>x.email.toLowerCase().includes(q)),[data.subscribers,q]);
  const terms=useMemo(()=>data.searchTerms.filter(x=>(x.term+' '+(x.skill_name||'')).toLowerCase().includes(q)),[data.searchTerms,q]);
  const nav=[['overview','Overview',LayoutDashboard],['skills','Skills',Sparkles],['paths','Earning paths',FolderKanban],['articles','Resources',Link2],['article-studio','Article Studio',FileText],['subscribers','Subscribers',Users],['search','Search',Search],['monetization','Monetization',Megaphone],['settings','Settings',Settings2]] as const;
  if(!ok)return <main className="admin-app admin-login-page"><div className="admin-login-card"><div className="admin-brand">doably <Sparkles size={17}/></div><div className="admin-login-icon"><LayoutDashboard size={25}/></div><h1>Welcome back</h1><p>Manage Doably content, search, subscribers and site settings.</p><form onSubmit={login}><label>Admin password</label><div className="admin-input-wrap"><Settings2 size={17}/><input type="password" placeholder="Enter your password" value={pw} onChange={e=>setPw(e.target.value)} autoFocus/></div><button className="admin-primary" disabled={saving}>{saving?'Signing in…':'Sign in'} <ChevronRight size={17}/></button></form><a className="admin-back" href="/">← Back to Doably</a></div></main>;

  const title=tab==='overview'?'Dashboard':tab==='paths'?'Earning paths':tab.charAt(0).toUpperCase()+tab.slice(1);
  const counts={skills:data.skills.length,paths:data.categories.length,articles:data.links.length,'article-studio':data.blogArticles.length,subscribers:data.subscribers.length,search:data.searchTerms.length};

  return <main className="admin-app">
    <aside className="admin-sidebar">
      <a href="/" className="admin-logo">doably<span className="admin-logo-dot">.</span></a>
      <div className="admin-sidebar-label">Manage</div>
      <nav>{nav.map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>{setTab(id);setQuery('')}}><Icon size={17}/>{label}{id!=='overview'&&<span>{counts[id as keyof typeof counts]??''}</span>}</button>)}</nav>
      <div className="admin-sidebar-label admin-sidebar-bottom-label">Quick links</div>
      <nav className="admin-secondary-nav"><a href="/" target="_blank"><ExternalLink size={16}/>View website</a><a href="/blog" target="_blank"><BookOpen size={16}/>Open blog</a></nav>
      <button className="admin-logout" onClick={logout}><LogOut size={16}/>Log out</button>
    </aside>

    <section className="admin-main">
      <header className="admin-topbar"><div><div className="admin-breadcrumb">Doably / Admin</div><h1>{title}</h1></div><div className="admin-top-actions"><a href="/" target="_blank" className="admin-view-site">View site <ExternalLink size={14}/></a><button className="admin-avatar">A</button></div></header>

      {tab==='overview'&&<div className="admin-content">
        <div className="admin-welcome"><div><span className="admin-eyebrow">Control center</span><h2>Everything in one place.</h2><p>Manage what users discover, what appears in search, and the content that powers Doably.</p></div><Sparkles size={54}/></div>
        <div className="admin-stat-grid">
          {([['Skills',counts.skills,'skills',Sparkles],['Earning paths',counts.paths,'paths',FolderKanban],['Articles',counts.articles,'articles',FileText],['Subscribers',counts.subscribers,'subscribers',Users]] as const).map(([label,n,id,Icon])=><button className="admin-stat" key={id} onClick={()=>setTab(id)}><span className="admin-stat-icon green"><Icon size={19}/></span><span><small>{label}</small><strong>{n}</strong></span><ChevronRight size={17}/></button>)}
        </div>
        <div className="admin-grid-two">
          <section className="admin-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">Quick actions</span><h3>Add content</h3></div></div><div className="admin-action-list">
            <button onClick={()=>openForm('skills')}><span><Sparkles size={17}/></span><div><b>Add a skill</b><small>Create a searchable skill.</small></div><Plus size={17}/></button>
            <button onClick={()=>openForm('paths')}><span><FolderKanban size={17}/></span><div><b>Add an earning path</b><small>Connect it to a skill.</small></div><Plus size={17}/></button>
            <button onClick={()=>openForm('articles')}><span><FileText size={17}/></span><div><b>Add an article</b><small>Add a useful external resource.</small></div><Plus size={17}/></button>
            <button onClick={()=>openForm('search')}><span><Search size={17}/></span><div><b>Add a search term</b><small>Teach Doably another way to match a skill.</small></div><Plus size={17}/></button>
          </div></section>
          <section className="admin-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">System</span><h3>Content health</h3></div><BarChart3 size={18}/></div><div className="admin-health">
            <div><span>Skills</span><b>{counts.skills?'Ready':'Needs content'}</b></div><div><span>Earning paths</span><b>{counts.paths?'Ready':'Needs content'}</b></div><div><span>Articles</span><b>{counts.articles?'Ready':'Needs content'}</b></div><div><span>Search terms</span><b>{counts.search?'Ready':'Optional'}</b></div>
          </div></section>
        </div>
      </div>}

      {tab==='article-studio'?<div className="admin-content"><ArticleStudio data={data} load={load} del={del}/>:tab!=='overview'&&<div className="admin-content">
        {(tab==='monetization'||tab==='settings')?<SettingsPanel tab={tab} data={data} openForm={()=>openForm(tab)} load={load}/>:tab==='subscribers'?<ListPanel title="Subscribers" count={subs.length} query={query} setQuery={setQuery} placeholder="Search email…" rows={subs.map(x=><div className="admin-list-row" key={x.id}><span className="admin-row-icon green"><Users size={17}/></span><div><b>{x.email}</b><small>Subscribed {new Date(x.created_at).toLocaleDateString()}</small></div><button className="icon-danger" onClick={()=>del('subscriber',x.id)}><Trash2 size={16}/></button></div>)} />:
        tab==='search'?<ListPanel title="Search terms" count={terms.length} query={query} setQuery={setQuery} placeholder="Search terms…" add={()=>openForm('search')} rows={terms.map(x=><div className="admin-list-row" key={x.id}><span className="admin-row-icon purple"><Search size={17}/></span><div><b>{x.term}</b><small>{x.skill_name||'No skill linked'}</small></div><button className="icon-danger" onClick={()=>del('searchTerm',x.id)}><Trash2 size={16}/></button></div>)}/>:
        <ListPanel title={tab==='skills'?'Skills':tab==='paths'?'Earning paths':'Articles'} count={tab==='skills'?skills.length:tab==='paths'?paths.length:articles.length} query={query} setQuery={setQuery} placeholder={tab==='articles'?'Search articles…':'Search…'} add={()=>openForm(tab)} rows={tab==='skills'?skills.map(x=><div className="admin-list-row" key={x.id}><span className="admin-row-icon green"><Sparkles size={17}/></span><div><b>{x.name}</b><small>/{x.slug}</small></div><button className="icon-danger" onClick={()=>del('skill',x.id)}><Trash2 size={16}/></button></div>):tab==='paths'?paths.map(x=><div className="admin-list-row" key={x.id}><span className="admin-row-icon purple"><FolderKanban size={17}/></span><div><b>{x.name}</b><small>{x.description}</small></div><button className="icon-danger" onClick={()=>del('category',x.id)}><Trash2 size={16}/></button></div>):articles.map(x=><div className="admin-list-row" key={x.id}><span className="admin-row-icon orange"><FileText size={17}/></span><div className="admin-link-copy"><b>{x.title}</b><small>{x.description||'No description'} · {x.category_name}</small><small>{x.source||'External resource'}</small><a href={x.url} target="_blank" rel="noreferrer">{x.url}</a></div><button className="icon-danger" onClick={()=>del('link',x.id)}><Trash2 size={16}/></button></div>)}/>}
      </div>}
      <footer className="admin-footer"><span>Doably Admin</span><span>Content is stored in your database.</span></footer>
    </section>

    {formOpen&&<div className="admin-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setFormOpen(false)}}><section className="admin-modal"><div className="admin-modal-head"><div><span className="admin-eyebrow">New content</span><h2>Add {tab==='articles'?'article':tab==='paths'?'earning path':tab==='search'?'search term':'skill'}</h2></div><button onClick={()=>setFormOpen(false)}><X size={19}/></button></div>
      <form onSubmit={save} className="admin-modal-form">
        {tab==='skills'&&<><label>Name<input required placeholder="e.g. Drawing" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Slug<input required placeholder="e.g. drawing" value={form.slug||''} onChange={e=>setForm({...form,slug:e.target.value})}/></label></>}
        {tab==='paths'&&<><label>Name<input required placeholder="e.g. Illustration" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Slug<input required placeholder="e.g. illustration" value={form.slug||''} onChange={e=>setForm({...form,slug:e.target.value})}/></label><label>Description<textarea required value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Attach to skill<select required value={form.skillId||''} onChange={e=>setForm({...form,skillId:e.target.value})}><option value="">Choose a skill…</option>{data.skills.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></>}
        {(tab==='articles')&&<><label>Category<select required value={form.categoryId||''} onChange={e=>setForm({...form,categoryId:e.target.value})}><option value="">Choose an earning path…</option>{data.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Article title<input required value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Description<textarea required value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Article URL<input required type="url" value={form.url||''} onChange={e=>setForm({...form,url:e.target.value})}/></label><div className="admin-form-grid"><label>Source<input value={form.source||''} onChange={e=>setForm({...form,source:e.target.value})}/></label><label>Priority<input type="number" value={form.priority||'0'} onChange={e=>setForm({...form,priority:e.target.value})}/></label></div></>}
        {(tab==='settings'||tab==='monetization')&&<><label>Setting key<input required placeholder={tab==='monetization'?'smartlink_url':'site_title'} value={form.key||''} onChange={e=>setForm({...form,key:e.target.value})}/></label><label>Value<textarea required placeholder={tab==='monetization'?'Paste your SmartLink URL or setting value.':'Enter the setting value.'} value={form.value||''} onChange={e=>setForm({...form,value:e.target.value})}/></label></>}
        {tab==='search'&&<><label>Search term<input required placeholder="e.g. sketching" value={form.term||''} onChange={e=>setForm({...form,term:e.target.value})}/></label><label>Link to skill<select value={form.skillId||''} onChange={e=>setForm({...form,skillId:e.target.value})}><option value="">No specific skill</option>{data.skills.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></>}
        <div className="admin-modal-actions"><button type="button" className="admin-cancel" onClick={()=>setFormOpen(false)}>Cancel</button><button className="admin-primary" disabled={saving}>{saving?'Saving…':'Save'} <ChevronRight size={16}/></button></div>
      </form>
    </section></div>}
  </main>;
}

function ListPanel({title,count,query,setQuery,placeholder,add,rows}:{title:string;count:number;query:string;setQuery:(x:string)=>void;placeholder:string;add?:()=>void;rows:React.ReactNode[]}){
  return <section className="admin-panel admin-table-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">Content library</span><h3>{title}</h3></div><small>{count} items</small></div><div className="admin-list-toolbar admin-inner-toolbar"><div className="admin-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={placeholder}/>{query&&<button onClick={()=>setQuery('')}><X size={15}/></button>}</div>{add&&<button className="admin-primary compact" onClick={add}><Plus size={16}/> Add</button>}</div><div className="admin-list">{loadingPlaceholder(rows)}</div></section>;
}
function loadingPlaceholder(rows:React.ReactNode[]){return rows.length?rows:<div className="admin-empty"><Database size={22}/><b>No items found</b><span>Try another search or add something new.</span></div>}
function SettingsPanel({tab,data,openForm,load}:{tab:'monetization'|'settings';data:Data;openForm:()=>void;load:()=>Promise<void>}){
  const isMoney=tab==='monetization';
  const items=isMoney?data.settings.filter(x=>['smartlink_url','banner_enabled','smartlink_enabled'].includes(x.key)):data.settings.filter(x=>!['smartlink_url','banner_enabled','smartlink_enabled'].includes(x.key));
  return <section className="admin-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">{isMoney?'Revenue controls':'Site controls'}</span><h3>{isMoney?'Monetization':'Settings'}</h3></div><button className="admin-primary compact" onClick={openForm}><Plus size={16}/> Add setting</button></div><div className="admin-settings-list">{items.length?items.map(x=><div className="admin-setting-row" key={x.key}><div><b>{x.key}</b><small>{x.value||'Empty'}</small></div><button className="admin-setting-edit" onClick={()=>alert('Edit this setting by adding the same key again. The value will be updated.')}>Manage</button></div>):<div className="admin-empty"><Settings2 size={22}/><b>No settings yet</b><span>Add a setting to control this area.</span></div>}</div></section>;
}

function ArticleStudio({data,load,del}:{data:Data;load:()=>Promise<void>;del:(type:string,id:number)=>Promise<void>}){
  const blank={id:'',title:'',slug:'',excerpt:'',content:'',seoTitle:'',metaDescription:'',categoryId:'',status:'draft',topic:'',audience:'people looking for practical ways to earn',tone:'helpful, natural and practical',length:'1200 words'};
  const [form,setForm]=useState<Record<string,string>>(blank),[generating,setGenerating]=useState(false),[saving,setSaving]=useState(false),[editing,setEditing]=useState(false),[q,setQ]=useState('');
  const articles=data.blogArticles.filter(a=>(a.title+' '+a.category_name+' '+a.status).toLowerCase().includes(q.toLowerCase()));
  function edit(a:BlogArticle){setForm({...blank,id:String(a.id),title:a.title,slug:a.slug,excerpt:a.excerpt,content:a.content,seoTitle:a.seo_title,metaDescription:a.meta_description,categoryId:String(a.category_id||''),status:a.status,topic:a.title});setEditing(true);window.scrollTo({top:0,behavior:'smooth'})}
  function slugify(v:string){return v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  async function generate(e:React.FormEvent){e.preventDefault();setGenerating(true);const r=await fetch('/api/admin/article-generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({topic:form.topic,audience:form.audience,tone:form.tone,length:form.length})});const b=await r.json().catch(()=>({}));setGenerating(false);if(!r.ok){alert(b.error||'Generation failed.');return}setForm(f=>({...f,title:b.title||f.topic,slug:b.slug||slugify(b.title||f.topic),excerpt:b.excerpt||'',content:b.content||'',seoTitle:b.seoTitle||b.title||'',metaDescription:b.metaDescription||b.excerpt||''}));setEditing(true)}
  async function save(e:React.FormEvent){e.preventDefault();setSaving(true);const payload={type:editing&&form.id?'updateBlogArticle':'blogArticle',...form};const r=await fetch('/api/admin/data',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const b=await r.json().catch(()=>({}));setSaving(false);if(!r.ok){alert(b.error||'Could not save article.');return}setForm(blank);setEditing(false);await load()}
  return <div className="article-studio">
    <div className="studio-hero"><div><span className="admin-eyebrow">AI writing workspace</span><h2>Create articles without leaving Doably.</h2><p>Generate a first draft, edit it, optimize the SEO fields, then save it as a draft or publish it when ready.</p></div><Sparkles size={48}/></div>
    <div className="studio-grid">
      <section className="admin-panel studio-generator"><div className="admin-panel-head"><div><span className="admin-eyebrow">Generate</span><h3>Article brief</h3></div></div>
        <form onSubmit={generate} className="admin-modal-form studio-form">
          <label>Topic<input required value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})} placeholder="e.g. How to make money with drawing skills"/></label>
          <label>Audience<input value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})}/></label>
          <div className="admin-form-grid"><label>Tone<select value={form.tone} onChange={e=>setForm({...form,tone:e.target.value})}><option>helpful, natural and practical</option><option>friendly and conversational</option><option>professional and informative</option></select></label><label>Length<select value={form.length} onChange={e=>setForm({...form,length:e.target.value})}><option>800 words</option><option>1200 words</option><option>1800 words</option><option>2500 words</option></select></label></div>
          <button className="admin-primary" disabled={generating}>{generating?'Generating…':'Generate article'} <Sparkles size={16}/></button>
        </form>
      </section>
      <section className="admin-panel studio-editor"><div className="admin-panel-head"><div><span className="admin-eyebrow">{editing?'Edit draft':'Editor'}</span><h3>{form.title||'Your article will appear here'}</h3></div></div>
        <form onSubmit={save} className="admin-modal-form">
          <label>Title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value,slug:form.slug||slugify(e.target.value)})} placeholder="Article title"/></label>
          <label>Slug<input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} placeholder="article-slug"/></label>
          <label>Excerpt<textarea value={form.excerpt} onChange={e=>setForm({...form,excerpt:e.target.value})} placeholder="Short summary"/></label>
          <label>Article content<textarea className="article-content-editor" value={form.content} onChange={e=>setForm({...form,content:e.target.value})} placeholder="Write or generate your article in Markdown…"/></label>
          <label>Earning path<select value={form.categoryId} onChange={e=>setForm({...form,categoryId:e.target.value})}><option value="">No path</option>{data.categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <div className="admin-form-grid"><label>SEO title<input value={form.seoTitle} onChange={e=>setForm({...form,seoTitle:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="draft">Draft</option><option value="published">Published</option></select></label></div>
          <label>Meta description<textarea value={form.metaDescription} onChange={e=>setForm({...form,metaDescription:e.target.value})}/></label>
          <div className="admin-modal-actions"><button type="button" className="admin-cancel" onClick={()=>{setForm(blank);setEditing(false)}}>Clear</button><button className="admin-primary" disabled={saving}>{saving?'Saving…':editing?'Update article':'Save article'} <ChevronRight size={16}/></button></div>
        </form>
      </section>
    </div>
    <section className="admin-panel studio-library"><div className="admin-panel-head"><div><span className="admin-eyebrow">Your content</span><h3>Article library</h3></div><small>{articles.length} articles</small></div>
      <div className="admin-list-toolbar admin-inner-toolbar"><div className="admin-search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search your articles…"/></div></div>
      <div className="admin-list">{articles.length?articles.map(a=><div className="admin-list-row" key={a.id}><span className="admin-row-icon purple"><FileText size={17}/></span><div className="admin-link-copy"><b>{a.title}</b><small>{a.status} · {a.category_name||'No earning path'}</small><small>{a.excerpt||'No excerpt'}</small></div><button className="admin-setting-edit" onClick={()=>edit(a)}>Edit</button><button className="icon-danger" onClick={()=>del('blogArticle',a.id)}><Trash2 size={16}/></button></div>):<div className="admin-empty"><FileText size={22}/><b>No managed articles yet</b><span>Generate your first article above.</span></div>}</div>
    </section>
  </div>
}
