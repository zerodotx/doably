'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  Database,
  ExternalLink,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Link2,
  LogOut,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';

type Skill = { id: number; name: string; slug: string };
type Category = { id: number; name: string; slug: string; description: string };
type Link = { id: number; category_id: number; category_name: string; title: string; url: string; source?: string | null; priority?: number };

type Data = { skills: Skill[]; categories: Category[]; links: Link[] };
type Tab = 'overview' | 'skills' | 'categories' | 'links';

const emptyData: Data = { skills: [], categories: [], links: [] };

export default function Admin() {
  const [ok, setOk] = useState(false);
  const [pw, setPw] = useState('');
  const [data, setData] = useState<Data>(emptyData);
  const [tab, setTab] = useState<Tab>('overview');
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/admin/data');
    if (r.ok) {
      setData(await r.json());
      setOk(true);
    } else {
      setOk(false);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    setSaving(false);
    if (r.ok) {
      setPw('');
      load();
    } else {
      alert('Invalid password');
    }
  }

  function openForm(type: Exclude<Tab, 'overview'>) {
    setTab(type);
    setForm({});
    setFormOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const type = tab === 'skills' ? 'skill' : tab === 'categories' ? 'category' : 'link';
    const r = await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, ...form }),
    });
    setSaving(false);

    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      alert(body.error || 'Could not save this item.');
      return;
    }

    setForm({});
    setFormOpen(false);
    await load();
  }

  async function del(type: 'skill' | 'category' | 'link', id: number) {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    const r = await fetch('/api/admin/data', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, id }),
    });
    if (!r.ok) {
      alert('Could not delete this item.');
      return;
    }
    load();
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    location.reload();
  }

  const filteredSkills = useMemo(
    () => data.skills.filter((x) => (x.name + ' ' + x.slug).toLowerCase().includes(query.toLowerCase())),
    [data.skills, query]
  );

  const filteredCategories = useMemo(
    () => data.categories.filter((x) => (x.name + ' ' + x.slug + ' ' + x.description).toLowerCase().includes(query.toLowerCase())),
    [data.categories, query]
  );

  const filteredLinks = useMemo(
    () => data.links.filter((x) => (x.title + ' ' + x.category_name + ' ' + (x.source || '')).toLowerCase().includes(query.toLowerCase())),
    [data.links, query]
  );

  if (!ok) {
    return (
      <main className="admin-app admin-login-page">
        <div className="admin-login-card">
          <div className="admin-brand"><span>doably</span><Sparkles size={17} /></div>
          <div className="admin-login-icon"><LayoutDashboard size={25} /></div>
          <h1>Welcome back</h1>
          <p>Sign in to manage the content behind your Doably search experience.</p>
          <form onSubmit={login}>
            <label>Admin password</label>
            <div className="admin-input-wrap">
              <Settings2 size={17} />
              <input
                type="password"
                placeholder="Enter your password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoFocus
              />
            </div>
            <button className="admin-primary" disabled={saving}>
              {saving ? 'Signing in…' : 'Sign in'}
              <ChevronRight size={17} />
            </button>
          </form>
          <a className="admin-back" href="/">← Back to Doably</a>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-app">
      <aside className="admin-sidebar">
        <a href="/" className="admin-logo"><span>doably</span><span className="admin-logo-dot">.</span></a>
        <div className="admin-sidebar-label">Workspace</div>
        <nav>
          <button className={tab === 'overview' ? 'active' : ''} onClick={() => { setTab('overview'); setQuery(''); }}>
            <LayoutDashboard size={17} /> Overview
          </button>
          <button className={tab === 'skills' ? 'active' : ''} onClick={() => { setTab('skills'); setQuery(''); }}>
            <Sparkles size={17} /> Skills <span>{data.skills.length}</span>
          </button>
          <button className={tab === 'categories' ? 'active' : ''} onClick={() => { setTab('categories'); setQuery(''); }}>
            <FolderKanban size={17} /> Categories <span>{data.categories.length}</span>
          </button>
          <button className={tab === 'links' ? 'active' : ''} onClick={() => { setTab('links'); setQuery(''); }}>
            <Link2 size={17} /> Articles <span>{data.links.length}</span>
          </button>
        </nav>

        <div className="admin-sidebar-label admin-sidebar-bottom-label">Quick links</div>
        <nav className="admin-secondary-nav">
          <a href="/" target="_blank"><ExternalLink size={16} /> View website</a>
          <a href="/blog" target="_blank"><BookOpen size={16} /> Open blog</a>
        </nav>

        <button className="admin-logout" onClick={logout}><LogOut size={16} /> Log out</button>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <div className="admin-breadcrumb">Doably / Admin</div>
            <h1>{tab === 'overview' ? 'Dashboard' : tab === 'links' ? 'Articles' : tab.charAt(0).toUpperCase() + tab.slice(1)}</h1>
          </div>
          <div className="admin-top-actions">
            <a href="/" target="_blank" className="admin-view-site">View site <ExternalLink size={14} /></a>
            <button className="admin-avatar" title="Admin">A</button>
          </div>
        </header>

        {tab === 'overview' ? (
          <div className="admin-content">
            <div className="admin-welcome">
              <div>
                <span className="admin-eyebrow">Content workspace</span>
                <h2>Keep Doably useful.</h2>
                <p>Add skills, organize earning paths, and keep three helpful article links ready for each result.</p>
              </div>
              <Sparkles size={54} strokeWidth={1.4} />
            </div>

            <div className="admin-stat-grid">
              <button className="admin-stat" onClick={() => setTab('skills')}>
                <span className="admin-stat-icon green"><Sparkles size={19} /></span>
                <span><small>Total skills</small><strong>{data.skills.length}</strong></span>
                <ChevronRight size={17} />
              </button>
              <button className="admin-stat" onClick={() => setTab('categories')}>
                <span className="admin-stat-icon purple"><FolderKanban size={19} /></span>
                <span><small>Earning paths</small><strong>{data.categories.length}</strong></span>
                <ChevronRight size={17} />
              </button>
              <button className="admin-stat" onClick={() => setTab('links')}>
                <span className="admin-stat-icon orange"><Link2 size={19} /></span>
                <span><small>Article links</small><strong>{data.links.length}</strong></span>
                <ChevronRight size={17} />
              </button>
            </div>

            <div className="admin-grid-two">
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <div><span className="admin-eyebrow">Quick actions</span><h3>Manage content</h3></div>
                </div>
                <div className="admin-action-list">
                  <button onClick={() => openForm('skills')}><span><Sparkles size={17} /></span><div><b>Add a skill</b><small>Create a new searchable skill.</small></div><Plus size={17} /></button>
                  <button onClick={() => openForm('categories')}><span><FolderKanban size={17} /></span><div><b>Add an earning path</b><small>Connect a path to a skill.</small></div><Plus size={17} /></button>
                  <button onClick={() => openForm('links')}><span><Link2 size={17} /></span><div><b>Add an article</b><small>Add a useful external resource.</small></div><Plus size={17} /></button>
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-head">
                  <div><span className="admin-eyebrow">System</span><h3>Content health</h3></div>
                  <BarChart3 size={18} />
                </div>
                <div className="admin-health">
                  <div><span>Skills</span><b>{data.skills.length > 0 ? 'Ready' : 'Needs content'}</b></div>
                  <div><span>Earning paths</span><b>{data.categories.length > 0 ? 'Ready' : 'Needs content'}</b></div>
                  <div><span>Article links</span><b>{data.links.length > 0 ? 'Ready' : 'Needs content'}</b></div>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="admin-content">
            <div className="admin-list-toolbar">
              <div className="admin-search">
                <Search size={17} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === 'links' ? 'Search articles or categories…' : 'Search…'} />
                {query && <button onClick={() => setQuery('')}><X size={15} /></button>}
              </div>
              <button className="admin-primary compact" onClick={() => openForm(tab)}><Plus size={16} /> Add {tab === 'links' ? 'article' : tab === 'categories' ? 'path' : 'skill'}</button>
            </div>

            <section className="admin-panel admin-table-panel">
              <div className="admin-panel-head">
                <div><span className="admin-eyebrow">Content library</span><h3>{tab === 'links' ? 'Article links' : tab}</h3></div>
                <small>{tab === 'skills' ? filteredSkills.length : tab === 'categories' ? filteredCategories.length : filteredLinks.length} items</small>
              </div>

              {loading ? <div className="admin-empty">Loading content…</div> : (
                <div className="admin-list">
                  {tab === 'skills' && filteredSkills.map((x) => (
                    <div className="admin-list-row" key={x.id}>
                      <span className="admin-row-icon green"><Sparkles size={17} /></span>
                      <div><b>{x.name}</b><small>/{x.slug}</small></div>
                      <button className="icon-danger" onClick={() => del('skill', x.id)} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  ))}

                  {tab === 'categories' && filteredCategories.map((x) => (
                    <div className="admin-list-row" key={x.id}>
                      <span className="admin-row-icon purple"><FolderKanban size={17} /></span>
                      <div><b>{x.name}</b><small>{x.description}</small></div>
                      <button className="icon-danger" onClick={() => del('category', x.id)} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  ))}

                  {tab === 'links' && filteredLinks.map((x) => (
                    <div className="admin-list-row" key={x.id}>
                      <span className="admin-row-icon orange"><FileText size={17} /></span>
                      <div className="admin-link-copy"><b>{x.title}</b><small>{x.category_name} · {x.source || 'External resource'}</small><a href={x.url} target="_blank" rel="noreferrer">{x.url}</a></div>
                      <button className="icon-danger" onClick={() => del('link', x.id)} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  ))}

                  {((tab === 'skills' && filteredSkills.length === 0) || (tab === 'categories' && filteredCategories.length === 0) || (tab === 'links' && filteredLinks.length === 0)) && (
                    <div className="admin-empty"><Database size={22} /><b>No items found</b><span>Try another search or add something new.</span></div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        <footer className="admin-footer"><span>Doably Admin</span><span>Content is stored in your database.</span></footer>
      </section>

      {formOpen && (
        <div className="admin-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setFormOpen(false); }}>
          <section className="admin-modal">
            <div className="admin-modal-head">
              <div><span className="admin-eyebrow">New content</span><h2>Add {tab === 'links' ? 'article' : tab === 'categories' ? 'earning path' : 'skill'}</h2></div>
              <button onClick={() => setFormOpen(false)}><X size={19} /></button>
            </div>

            <form onSubmit={save} className="admin-modal-form">
              {tab === 'skills' && <>
                <label>Name<input required placeholder="e.g. Drawing" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                <label>Slug<input required placeholder="e.g. drawing" value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></label>
              </>}

              {tab === 'categories' && <>
                <label>Name<input required placeholder="e.g. Illustration" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                <label>Slug<input required placeholder="e.g. illustration" value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></label>
                <label>Description<textarea required placeholder="Short description shown in search results." value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
                <label>Attach to skill<select required value={form.skillId || ''} onChange={(e) => setForm({ ...form, skillId: e.target.value })}><option value="">Choose a skill…</option>{data.skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              </>}

              {tab === 'links' && <>
                <label>Category<select required value={form.categoryId || ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Choose an earning path…</option>{data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label>Article title<input required placeholder="e.g. How to sell your illustrations" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
                <label>Article URL<input required type="url" placeholder="https://example.com/article" value={form.url || ''} onChange={(e) => setForm({ ...form, url: e.target.value })} /></label>
                <div className="admin-form-grid"><label>Source<input placeholder="e.g. Forbes" value={form.source || ''} onChange={(e) => setForm({ ...form, source: e.target.value })} /></label><label>Priority<input type="number" placeholder="0" value={form.priority || '0'} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></label></div>
              </>}

              <div className="admin-modal-actions"><button type="button" className="admin-cancel" onClick={() => setFormOpen(false)}>Cancel</button><button className="admin-primary" disabled={saving}>{saving ? 'Saving…' : 'Save content'} <ChevronRight size={16} /></button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
