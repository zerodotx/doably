'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Compass, Lightbulb, Menu, Search, Sparkles, X } from 'lucide-react';

const ideas = [
  { icon:'✍️', title:'Writing', text:'Turn your writing ability into useful freelance work.', tags:['Content writing','Copywriting','Editing'] },
  { icon:'🎨', title:'Design', text:'Use your eye for visuals to create things people pay for.', tags:['Social posts','Logos','Thumbnails'] },
  { icon:'🎬', title:'Video editing', text:'Help creators and businesses turn raw clips into finished videos.', tags:['Shorts','Reels','YouTube'] },
  { icon:'🍳', title:'Cooking', text:'Your cooking skills can become services, products, or content.', tags:['Home orders','Recipes','Content'] },
  { icon:'🗣️', title:'English', text:'Use your communication skills to help people learn or work.', tags:['Tutoring','Conversation','Translation'] },
  { icon:'📱', title:'Social media', text:'Help small businesses show up consistently online.', tags:['Posts','Pages','Content plans'] },
];

export default function Home() {
  const [input, setInput] = useState('');
  const [showIdeas, setShowIdeas] = useState(false);
  const [menu, setMenu] = useState(false);
  const [mode, setMode] = useState<'skill'|'help'>('skill');
  const filtered = useMemo(() => {
    const q = input.toLowerCase().trim();
    if (!q) return ideas;
    return ideas.filter(i => `${i.title} ${i.text} ${i.tags.join(' ')}`.toLowerCase().includes(q));
  }, [input]);

  return (
    <main>
      <header className="nav">
        <a className="brand" href="#top"><span className="brand-dot">D</span>doably</a>
        <nav className={menu ? 'nav-links open' : 'nav-links'}>
          <a href="#tool" onClick={()=>setMenu(false)}>Find your thing</a>
          <a href="#ideas" onClick={()=>setMenu(false)}>Ideas</a>
          <a href="#how" onClick={()=>setMenu(false)}>How it works</a>
        </nav>
        <button className="menu-btn" aria-label="Menu" onClick={()=>setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15}/> Find your thing</div>
          <h1>You can do more<br/><span>than you think.</span></h1>
          <p>Tell Doably what you can do — or what you like — and discover practical ways you could turn it into income.</p>
          <div className="hero-actions">
            <a className="primary" href="#tool">Start exploring <ArrowRight size={18}/></a>
            <a className="secondary" href="#ideas">Browse ideas</a>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orb orb-a"/><div className="orb orb-b"/>
          <div className="float-card card-one"><span>🎨</span><div><b>Design</b><small>Logo & social work</small></div></div>
          <div className="float-card card-two"><span>🎥</span><div><b>Video</b><small>Editing & short-form</small></div></div>
          <div className="center-note"><Lightbulb size={26}/><b>There’s probably<br/>something in there.</b></div>
        </div>
      </section>

      <section className="tool-section" id="tool">
        <div className="section-kicker">01 / Start here</div>
        <h2>What can you do?</h2>
        <p className="section-lead">No perfect answer needed. Just tell us what comes to mind.</p>
        <div className="tool-card">
          <div className="mode-tabs">
            <button className={mode==='skill'?'active':''} onClick={()=>setMode('skill')}><Compass size={17}/> I know what I can do</button>
            <button className={mode==='help'?'active':''} onClick={()=>setMode('help')}><Sparkles size={17}/> Help me find my thing</button>
          </div>
          {mode === 'skill' ? <>
            <label htmlFor="skill">I can…</label>
            <div className="search-box"><Search size={20}/><input id="skill" value={input} onChange={e=>{setInput(e.target.value);setShowIdeas(true)}} onFocus={()=>setShowIdeas(true)} placeholder="e.g. I can draw, cook, edit videos…"/><button onClick={()=>setShowIdeas(true)}>Find ideas <ArrowRight size={17}/></button></div>
            <div className="chips"><span>Try:</span>{['draw','cook','write','teach','edit videos'].map(x=><button key={x} onClick={()=>{setInput(`I can ${x}`);setShowIdeas(true)}}>{x}</button>)}</div>
            {showIdeas && <div className="results"><div className="results-head"><b>{input ? `Ideas related to “${input}”` : 'Popular starting points'}</b><button onClick={()=>setShowIdeas(false)}>Close</button></div>{filtered.slice(0,3).map(i=><div className="mini-result" key={i.title}><span>{i.icon}</span><div><b>{i.title}</b><small>{i.text}</small></div><ArrowRight size={17}/></div>)}{filtered.length===0 && <div className="empty">We don't have a match yet — try describing what you enjoy doing.</div>}</div>}
          </> : <div className="help-box"><div className="help-icon"><Sparkles/></div><div><h3>Let’s figure it out together.</h3><p>A few simple questions about what you enjoy, what you're comfortable with, and what you'd like to learn.</p><button className="primary" onClick={()=>alert('Question flow coming next.')}>Let’s start <ArrowRight size={17}/></button></div></div>}
        </div>
      </section>

      <section className="ideas-section" id="ideas">
        <div className="section-kicker">02 / Get inspired</div>
        <div className="heading-row"><div><h2>Not sure yet?</h2><p className="section-lead">Here are a few things people can turn into something useful.</p></div><a className="text-link" href="#tool">Find mine <ArrowRight size={16}/></a></div>
        <div className="idea-grid">{ideas.map(i=><article className="idea-card" key={i.title}><div className="idea-icon">{i.icon}</div><h3>{i.title}</h3><p>{i.text}</p><div className="tags">{i.tags.map(t=><span key={t}>{t}</span>)}</div><a href="#tool">See ways to start <ArrowRight size={15}/></a></article>)}</div>
      </section>

      <section className="how" id="how"><div className="section-kicker">03 / Simple by design</div><h2>From “I can…” to “I could do that.”</h2><div className="steps"><div><b>01</b><h3>Tell us what you can do</h3><p>Use your own words. No CV or fancy labels needed.</p></div><div><b>02</b><h3>Explore your options</h3><p>See practical ways your skills and interests can be useful.</p></div><div><b>03</b><h3>Choose a place to start</h3><p>Get a simple next step, useful resources, and guides.</p></div></div></section>

      <section className="ad-slot"><span>ADVERTISEMENT</span></section>
      <footer><div className="brand"><span className="brand-dot">D</span>doably</div><p>Find what you can do. Find a way to earn from it.</p><span>© 2026 Doably</span></footer>
    </main>
  );
}
