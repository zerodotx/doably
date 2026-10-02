'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, CheckCircle2, Search, Sparkles, X } from 'lucide-react';

type LinkResult = {
  id: number;
  title: string;
  url: string;
  source?: string | null;
  description?: string | null;
  internal?: boolean;
  link_type?: string;
};

type SearchResult = {
  skill_name: string;
  skill_slug?: string;
  category_id: number;
  category_name: string;
  description: string;
  search_keyword?: string | null;
  device_needed?: string | null;
  gig_title?: string | null;
  earning_range?: string | null;
  links: LinkResult[];
  tools: LinkResult[];
  earningPlatforms: LinkResult[];
};

const suggestions = ['I can draw', 'I can cook', 'I can write', 'I can teach', 'I can edit videos'];

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpStep, setHelpStep] = useState(0);
  const [helpAnswers, setHelpAnswers] = useState<string[]>([]);
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  async function search(value = query) {
    const q = value.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const response = await fetch('/api/search?q=' + encodeURIComponent(q));
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Search is temporarily unavailable.');
      setResults(body.results || []);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : 'Search is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    search();
  }

  function chooseSuggestion(value: string) {
    setQuery(value);
    search(value);
  }

  function startHelp() {
    setHelpOpen(true);
    setHelpStep(0);
    setHelpAnswers([]);
    setSearched(false);
    setResults([]);
  }

  const questions = [
    'What do you enjoy doing most?',
    'What are you already comfortable with?',
    'What would you like to try earning from?'
  ];

  function answerHelp(answer: string) {
    const next = [...helpAnswers, answer];
    setHelpAnswers(next);
    if (helpStep < questions.length - 1) {
      setHelpStep(helpStep + 1);
    } else {
      const combined = next.join(', ');
      setQuery(combined);
      setHelpOpen(false);
      search(combined);
    }
  }

  return (
    <main>
      <header className="simple-nav">
        <a className="simple-brand" href="/">doably</a>
        <button className="subscribe-btn" onClick={() => setSubscribeOpen(true)}>Subscribe</button>
      </header>

      <section className="search-hero">
        <div className="search-hero-inner">
          <div className="search-mark"><Sparkles size={17} /></div>
          <h1>What can you do?</h1>
          <p>Discover what you can do with what you know.</p>

          <form className="google-search" onSubmit={submitSearch}>
            <Search size={20} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search what you can do..." aria-label="Search what you can do" />
            {query && <button type="button" className="clear-search" onClick={() => { setQuery(''); setResults([]); setSearched(false); }} aria-label="Clear search"><X size={17} /></button>}
          </form>

          <div className="search-actions">
            <button className="search-action primary-search" onClick={() => search()} disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
            <button className="search-action" onClick={startHelp}>I don&apos;t know my skill</button>
          </div>

          {!searched && (
            <div className="search-suggestions">
              <span>Try</span>
              {suggestions.map((item) => <button key={item} onClick={() => chooseSuggestion(item)}>{item}</button>)}
            </div>
          )}

          {searched && (
            <section className="search-results" aria-live="polite">
              {loading && <div className="search-state">Finding useful paths…</div>}
              {!loading && error && <div className="search-state error-state">{error}</div>}
              {!loading && !error && results.length === 0 && (
                <div className="search-state"><b>No matches yet.</b><span>Try describing what you can do in a few words, like “I can draw” or “I know Excel”.</span></div>
              )}
              {!loading && !error && results.map((result) => (
                <article className="result-card" key={`${result.skill_slug || result.skill_name}-${result.category_id}`}>
                  <a className="result-pill result-skill-link" href={`/skills/${result.skill_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}>{result.category_name}</a>
                  <p className="result-description">{result.description}</p>
                  {result.earning_range && <div className="result-meta">
                    <span><b>{result.earning_range}</b><small>earning possibilities</small></span>
                  </div>}
                  {result.tools?.length > 0 && <div className="result-resource-group">
                    <h3>🛠 Tools you can use</h3>
                    <div className="article-list">
                      {result.tools.slice(0, 6).map((link) => (
                        <a className="article-link" href={link.url} target="_blank" rel="noreferrer" key={link.id}>
                          <div><b>{link.title}</b>{link.description && <span>{link.description}</span>}<small>{link.source || 'Tool'}</small></div>
                          <ArrowRight size={16} />
                        </a>
                      ))}
                    </div>
                  </div>}
                  {result.earningPlatforms?.length > 0 && <div className="result-resource-group">
                    <h3>💰 Places to earn</h3>
                    <div className="article-list">
                      {result.earningPlatforms.slice(0, 6).map((link) => (
                        <a className="article-link" href={link.url} target="_blank" rel="noreferrer" key={link.id}>
                          <div><b>{link.title}</b>{link.description && <span>{link.description}</span>}<small>{link.source || 'Earning platform'}</small></div>
                          <ArrowRight size={16} />
                        </a>
                      ))}
                    </div>
                  </div>}
                  <div className="result-resource-group">
                    <h3>📚 Learn from real articles</h3>
                    <div className="article-list">
                    {result.links.filter((link) => !link.link_type || link.link_type === 'resource').slice(0, 3).map((link) => (
                      <a className="article-link" href={link.url} target={link.internal ? undefined : "_blank"} rel={link.internal ? undefined : "noreferrer"} key={link.id}>
                        <div><b>{link.title}</b>{link.description && <span>{link.description}</span>}<small>{link.source || 'Resource'}</small></div>
                        <ArrowRight size={16} />
                      </a>
                    ))}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </section>

      {helpOpen && (
        <div className="help-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setHelpOpen(false); }}>
          <section className="help-modal" role="dialog" aria-modal="true">
            <button className="help-close" onClick={() => setHelpOpen(false)} aria-label="Close"><X size={18} /></button>
            <span className="help-step">Question {helpStep + 1} of {questions.length}</span>
            <h2>{questions[helpStep]}</h2>
            <p>There&apos;s no wrong answer. Pick what feels closest.</p>
            <div className="help-options">
              {(helpStep === 0
                ? ['Creating things', 'Helping people', 'Working with computers', 'Teaching or explaining']
                : helpStep === 1
                  ? ['I already have a useful skill', 'I learn quickly', 'I like trying new things', 'I am not sure yet']
                  : ['Freelance work', 'A small side income', 'Online work', 'I just want ideas']
              ).map((option) => <button key={option} onClick={() => answerHelp(option)}>{option}<ArrowRight size={16} /></button>)}
            </div>
          </section>
        </div>
      )}

      {subscribeOpen && (
        <div className="help-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSubscribeOpen(false); }}>
          <section className="subscribe-modal" role="dialog" aria-modal="true">
            <button className="help-close" onClick={() => setSubscribeOpen(false)} aria-label="Close"><X size={18} /></button>
            <CheckCircle2 size={25} />
            <h2>Stay in the loop</h2>
            <p>Get useful new earning ideas when Doably adds them.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const email = new FormData(form).get('email');
              const response = await fetch('/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
              if (!response.ok) { const body = await response.json().catch(() => ({})); alert(body.error || 'Could not subscribe.'); return; }
              form.reset();
              setSubscribeOpen(false);
            }}>
              <input name="email" type="email" required placeholder="Your email address" aria-label="Email address" />
              <button className="search-action primary-search">Subscribe</button>
            </form>
            <small>You can unsubscribe anytime.</small>
          </section>
        </div>
      )}

      <footer className="simple-footer">
        <div><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/disclaimer">Disclaimer</a></div>
        <span>© 2026 Doably</span>
      </footer>
    </main>
  );
}
