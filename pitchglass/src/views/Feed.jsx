import { useState } from 'react';
import { SourceChip, Fit } from './Card.jsx';
import { SOURCES, STEP_KINDS } from '../data.js';
import { detectSource, hostOf } from '../lib.js';

export default function Feed({ opps, onAdd, onDraft, onSkip, onRun }) {
  const [url, setUrl] = useState('');
  const [filter, setFilter] = useState('all');
  const found = opps
    .filter((o) => o.status === 'found')
    .filter((o) => filter === 'all' || o.source === filter)
    .sort((a, b) => (b.fit ?? 0) - (a.fit ?? 0));
  const sources = [...new Set(opps.filter((o) => o.status === 'found').map((o) => o.source))];

  const paste = (e) => {
    e.preventDefault();
    const u = url.trim();
    if (!/^https?:\/\//.test(u)) return;
    const source = detectSource(u);
    onAdd({
      source,
      brand: hostOf(u),
      title: 'Pasted brief — details are read on the next agent run',
      link: u,
      channel: source === 'instagram' || source === 'x' || source === 'reddit' ? 'dm' : 'form',
      deliverables: [],
      tags: [],
    });
    setUrl('');
  };

  return (
    <section className="stack">
      <form className="glass paste" onSubmit={paste}>
        <label htmlFor="paste" className="sr">Paste a link</label>
        <input
          id="paste"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste any casting call, Google Form, reel or post link…"
          inputMode="url"
        />
        <button className="btn">Add</button>
      </form>

      {sources.length > 1 && (
        <div className="filters">
          {['all', ...sources].map((s) => (
            <button key={s} className={`pill ${filter === s ? 'on' : ''}`} onClick={() => setFilter(s)}>
              {s === 'all' ? 'All' : SOURCES[s]?.label || s}
            </button>
          ))}
        </div>
      )}

      {found.length === 0 ? (
        <div className="glass empty">
          <h2>Nothing in the queue</h2>
          <p className="muted">Run the agent to pull matching projects, or paste a link above.</p>
          <button className="btn primary" onClick={onRun}>▶ Run agent</button>
        </div>
      ) : (
        <div className="grid">
          {found.map((o) => (
            <article key={o.id} className="glass card">
              <div className="row between">
                <SourceChip source={o.source} />
                <Fit value={o.fit} />
              </div>
              <h3>{o.title}</h3>
              <p className="brandline">{o.brand}</p>
              <dl className="meta">
                {o.location && (<><dt>Where</dt><dd>{o.location}</dd></>)}
                {o.dates && (<><dt>When</dt><dd>{o.dates}</dd></>)}
                {o.comp && (<><dt>Comp</dt><dd>{o.comp}</dd></>)}
              </dl>
              {o.deliverables?.length > 0 && (
                <ul className="tags">
                  {o.deliverables.map((d) => <li key={d}>{d}</li>)}
                </ul>
              )}
              {o.requirements && <p className="req muted">{o.requirements}</p>}
              {o.steps?.length > 0 && (
                <p className="stepicons" title={o.steps.map((s) => STEP_KINDS[s]?.label).join(' → ')}>
                  {o.steps.map((s, i) => <span key={s + i}>{STEP_KINDS[s]?.icon}</span>)}
                </p>
              )}
              {o.link && <a className="link" href={o.link} target="_blank" rel="noreferrer">Open source ↗</a>}
              <div className="row gap end">
                <button className="btn ghost" onClick={() => onSkip(o)}>Skip</button>
                <button className="btn primary" onClick={() => onDraft(o)}>Draft pitch</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
