import { useState } from 'react';
import { SourceChip, Fit } from './Card.jsx';
import { SOURCES, STEP_KINDS } from '../data.js';
import Icon from './Icon.jsx';
import { detectSource, hostOf } from '../lib.js';

export default function Feed({ opps, mission, setMission, onAdd, onDraft, onSkip, onRun }) {
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
      <div className="glass mission">
        <label htmlFor="mission">What are you pitching for?</label>
        <textarea
          id="mission"
          rows={2}
          value={mission || ''}
          onChange={(e) => setMission(e.target.value)}
          placeholder="e.g. Paid UGC for skincare and travel brands, $150+ per video, US or remote, no gifted-only deals"
        />
        <p className="muted small">Every run searches for this and ranks results by it.</p>
      </div>
      <form className="glass paste" onSubmit={paste}>
        <label htmlFor="paste" className="sr">Paste a link</label>
        <input
          id="paste"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste any Instagram, Threads, X or Reddit post, or a form link…"
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
          <button className="btn primary" onClick={onRun}><Icon name="play" size={14} /> Run agent</button>
        </div>
      ) : (
        <div className="grid">
          {found.map((o) => (
            <article key={o.id} className="glass card">
              <div className="row between">
                <SourceChip source={o.source} />
                <Fit value={o.fit} why={o.fitWhy} />
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
                <p className="stepicons">
                  {o.steps.map((s, i) => (
                    <span key={s + i} title={STEP_KINDS[s]?.label}>
                      <Icon name={STEP_KINDS[s]?.icon} size={14} label={STEP_KINDS[s]?.label} />
                    </span>
                  ))}
                </p>
              )}
              {o.link && <a className="link" href={o.link} target="_blank" rel="noreferrer">Open source <Icon name="external" size={13} /></a>}
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
