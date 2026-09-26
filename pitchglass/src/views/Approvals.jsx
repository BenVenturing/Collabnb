import { useEffect, useState } from 'react';
import { SourceChip, Fit } from './Card.jsx';
import { draftPitch, voiceIssues, stepsReady } from '../lib.js';
import { STEP_KINDS, FORM_TYPES } from '../data.js';
import Icon from './Icon.jsx';

export default function Approvals({ opps, profile, update }) {
  const queue = opps.filter((o) => o.status === 'drafted');
  const ready = opps.filter((o) => o.status === 'approved');
  const [activeId, setActiveId] = useState(queue[0]?.id);
  const active = queue.find((o) => o.id === activeId) || queue[0];
  const [text, setText] = useState(active?.draft || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => setText(active?.draft || ''), [active?.id]);

  const extrasText = active ? [active.comment, ...(active.answers || []).map((a) => a.value)].join('\n') : '';
  const issues = voiceIssues(`${text}\n${extrasText}`, profile);
  const missing = active ? stepsReady(active) : [];
  const setAnswer = (i, value) =>
    update(active.id, { answers: active.answers.map((a, j) => (j === i ? { ...a, value } : a)) });
  const save = (patch) => update(active.id, { draft: text, ...patch });

  const applyPrompt = () =>
    [
      `Use the project-apply skill. Apply to ${active.link || active.applyLink || active.brand}.`,
      `Use this pitch: ${text}`,
      active.comment && `Comment: ${active.comment}`,
      active.recipients && `Tag only: ${active.recipients}`,
      active.answers?.length && `Form answers: ${active.answers.map((a) => `${a.field}: ${a.value}`).join(' | ')}`,
      'Stop before sending or submitting so I can check it.',
    ]
      .filter(Boolean)
      .join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(applyPrompt());
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
              <SourceChip source={active.source} /> <Fit value={active.fit} why={active.fitWhy} />
              <h3>{active.title}</h3>
              <p className="muted small">
                {active.brand} · {active.channel === 'dm' ? 'Direct message' : 'Application form'}
              </p>
            </div>
          </div>
          <label htmlFor="draft" className="sr">Draft</label>
          <textarea id="draft" value={text} onChange={(e) => setText(e.target.value)} onBlur={() => save({})} rows={12} />
          <div className="voice">
            {issues.banned.length === 0 && issues.placeholders === 0 ? (
              <span className="ok"><Icon name="check" size={14} /> Voice check passed</span>
            ) : (
              <>
                {issues.placeholders > 0 && <span className="warn">{issues.placeholders} placeholder{issues.placeholders > 1 ? 's' : ''} to fill — add details in Profile</span>}
                {issues.banned.length > 0 && <span className="warn">Off-voice: {issues.banned.join(', ')}</span>}
              </>
            )}
            {missing.length > 0 && <span className="warn">Still needed: {missing.join(', ')}</span>}
          </div>
          <div className="row gap end wrap">
            <button className="btn ghost" onClick={() => update(active.id, { status: 'skipped' })}>Skip</button>
            <button className="btn ghost" onClick={() => setText(draftPitch(active, profile))}>Regenerate</button>
            <button className="btn ghost" onClick={copy}>{copied ? 'Copied' : 'Copy for Claude Code'}</button>
            <button className="btn primary" onClick={() => save({ status: 'approved' })} disabled={issues.placeholders > 0 || missing.length > 0}>
              Approve
            </button>
          </div>
          <p className="muted small">Copy for Claude Code, paste it in, and Claude fills everything in your browser and stops before sending. Mark it sent here when it's done.</p>

          {active.steps?.length > 0 && (
            <div className="glass inset plan">
              <h2 className="sub">Agent plan</h2>
              {active.caption && (
                <blockquote className="caption">
                  <span className="muted small">Caption the agent read</span>
                  {active.caption}
                </blockquote>
              )}
              <ol className="steps-list">
                {active.steps.map((s, i) => (
                  <li key={s + i}>
                    <span className="sico"><Icon name={STEP_KINDS[s]?.icon} size={15} /></span>
                    <span className="grow">
                      <strong>{STEP_KINDS[s]?.label}</strong>
                      {s === 'follow' && <span className="muted small"> {active.brand}</span>}
                      {s === 'fill_form' && active.formType && <span className="muted small"> · {FORM_TYPES[active.formType]}</span>}
                      {s === 'comment' && (
                        <input className="stepin" value={active.comment || ''} onChange={(e) => update(active.id, { comment: e.target.value })} aria-label="Comment text" />
                      )}
                      {s === 'tag' && (
                        <>
                          <input
                            className="stepin"
                            value={active.recipients || ''}
                            onChange={(e) => update(active.id, { recipients: e.target.value })}
                            placeholder={`@friend1 @friend2 — ${active.tagCount || 1} needed`}
                            aria-label="People to tag"
                          />
                          <span className="muted small">Only tag people who agreed to it. The agent never picks them for you.</span>
                        </>
                      )}
                      {s === 'dm' && <span className="muted small"> — sends the message above</span>}
                    </span>
                  </li>
                ))}
              </ol>
              {active.answers?.length > 0 && (
                <div className="answers">
                  <h2 className="sub">Form answers</h2>
                  {active.answers.map((a, i) => (
                    <label key={a.field}>
                      <span>{a.field}</span>
                      <input value={a.value} onChange={(e) => setAnswer(i, e.target.value)} className={a.value ? '' : 'empty-field'} />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
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
