import { useEffect, useState } from 'react';
import { SourceChip, Fit } from './Card.jsx';
import { draftPitch, voiceIssues } from '../lib.js';

export default function Approvals({ opps, profile, update }) {
  const queue = opps.filter((o) => o.status === 'drafted');
  const ready = opps.filter((o) => o.status === 'approved');
  const [activeId, setActiveId] = useState(queue[0]?.id);
  const active = queue.find((o) => o.id === activeId) || queue[0];
  const [text, setText] = useState(active?.draft || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => setText(active?.draft || ''), [active?.id]);

  const issues = voiceIssues(text, profile);
  const save = (patch) => update(active.id, { draft: text, ...patch });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <section className="split">
      <div className="glass list">
        <h2 className="sub">Waiting on you <span className="count">{queue.length}</span></h2>
        {queue.length === 0 && <p className="muted pad">No drafts. Pick a project in Opportunities and hit Draft pitch.</p>}
        {queue.map((o) => (
          <button key={o.id} className={`item ${active?.id === o.id ? 'on' : ''}`} onClick={() => setActiveId(o.id)}>
            <SourceChip source={o.source} />
            <span className="t">{o.title}</span>
            <span className="muted small">{o.brand}</span>
          </button>
        ))}
        {ready.length > 0 && (
          <>
            <h2 className="sub">Approved — ready to send <span className="count">{ready.length}</span></h2>
            {ready.map((o) => (
              <div key={o.id} className="item static">
                <SourceChip source={o.source} />
                <span className="t">{o.title}</span>
                <button className="link" onClick={() => update(o.id, { status: 'sent', sentAt: Date.now() })}>Mark sent</button>
              </div>
            ))}
          </>
        )}
      </div>

      {active ? (
        <div className="glass editor">
          <div className="row between">
            <div>
              <SourceChip source={active.source} /> <Fit value={active.fit} />
              <h3>{active.title}</h3>
              <p className="muted small">
                {active.brand} · {active.channel === 'dm' ? 'Direct message' : active.channel === 'collabnb' ? 'Collabnb pitch' : 'Application form'}
              </p>
            </div>
          </div>
          <label htmlFor="draft" className="sr">Draft</label>
          <textarea id="draft" value={text} onChange={(e) => setText(e.target.value)} onBlur={() => save({})} rows={12} />
          <div className="voice">
            {issues.banned.length === 0 && issues.placeholders === 0 ? (
              <span className="ok">✓ Voice check passed</span>
            ) : (
              <>
                {issues.placeholders > 0 && <span className="warn">{issues.placeholders} placeholder{issues.placeholders > 1 ? 's' : ''} to fill — add details in Profile</span>}
                {issues.banned.length > 0 && <span className="warn">Off-voice: {issues.banned.join(', ')}</span>}
              </>
            )}
          </div>
          <div className="row gap end wrap">
            <button className="btn ghost" onClick={() => update(active.id, { status: 'skipped' })}>Skip</button>
            <button className="btn ghost" onClick={() => setText(draftPitch(active, profile))}>Regenerate</button>
            <button className="btn ghost" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
            <button className="btn primary" onClick={() => save({ status: 'approved' })} disabled={issues.placeholders > 0}>
              Approve
            </button>
          </div>
          <p className="muted small">Approved pitches are sent by your agent on its next run. Nothing sends without approval.</p>
        </div>
      ) : (
        <div className="glass editor empty">
          <h2>All caught up</h2>
          <p className="muted">Approved pitches wait here until your agent sends them.</p>
        </div>
      )}
    </section>
  );
}
