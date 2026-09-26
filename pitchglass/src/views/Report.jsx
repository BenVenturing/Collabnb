import { useEffect, useState } from 'react';
import { SOURCES, STEP_KINDS, FORM_TYPES } from '../data.js';

const NOTIFY_LABEL = { telegram: 'Telegram', whatsapp: 'WhatsApp', instagram: 'Instagram', off: null };

export default function Report({ report, opps, settings, onConfirm, onClose }) {
  const [keep, setKeep] = useState(() => opps.filter((o) => (o.fit ?? 60) >= 55).map((o) => o.id));
  const toggle = (id) => setKeep((k) => (k.includes(id) ? k.filter((x) => x !== id) : [...k, id]));

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const bySource = opps.reduce((m, o) => ({ ...m, [o.source]: (m[o.source] || 0) + 1 }), {});
  const avgFit = Math.round(opps.reduce((s, o) => s + (o.fit ?? 0), 0) / (opps.length || 1));
  const totalSteps = opps.reduce((s, o) => s + (o.steps?.length || 0), 0);
  const forms = opps.filter((o) => o.steps?.includes('fill_form')).length;
  const engage = opps.filter((o) => o.steps?.some((s) => ['comment', 'tag', 'share_story', 'follow'].includes(s))).length;
  const stamp = new Date(report.at);
  const notify = NOTIFY_LABEL[settings.notify];

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Run report">
      <div className="report">
        <div className="receipt">
          <p className="rc-title">PITCHGLASS</p>
          <p className="rc-sub">run report · {stamp.toLocaleDateString()} {stamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <hr />
          <p className="rc-row"><span>Asked for</span><span>{report.asked}</span></p>
          <p className="rc-row"><span>Found</span><span>{opps.length}</span></p>
          {Object.entries(bySource).map(([s, n]) => (
            <p key={s} className="rc-row ind"><span>{SOURCES[s]?.label || s}</span><span>{n}</span></p>
          ))}
          <hr />
          <p className="rc-row"><span>Avg fit</span><span>{avgFit}%</span></p>
          <p className="rc-row"><span>Forms to fill</span><span>{forms}</span></p>
          <p className="rc-row"><span>Need engagement first</span><span>{engage}</span></p>
          <p className="rc-row"><span>Browser steps</span><span>{totalSteps}</span></p>
          <hr />
          <p className="rc-row big"><span>Selected</span><span>{keep.length}</span></p>
          <p className="rc-foot">nothing is sent until you approve each draft</p>
          {notify && (
            <div className="phone">
              <p className="phone-head">{notify} · Pitchglass</p>
              <div className="bubble">
                Found {opps.length} projects for you.
                {opps.slice(0, 3).map((o) => (
                  <span key={o.id} className="bl">• {o.oneLiner || o.title}</span>
                ))}
                {opps.length > 3 && <span className="bl">+ {opps.length - 3} more</span>}
                <span className="bbtns"><b>Confirm all</b><b>Review</b></span>
              </div>
              <p className="phone-note">Preview — phone delivery comes with the hosted service.</p>
            </div>
          )}
        </div>

        <div className="briefs">
          <div className="row between wrap gap">
            <div>
              <h2>Pick what to apply for</h2>
              <p className="muted small">Confirmed briefs get drafted. Removed ones are skipped.</p>
            </div>
            <div className="row gap">
              <button className="btn ghost sm" onClick={() => setKeep(keep.length === opps.length ? [] : opps.map((o) => o.id))}>
                {keep.length === opps.length ? 'Clear all' : 'Select all'}
              </button>
              <button className="btn ghost sm" onClick={onClose}>Later</button>
            </div>
          </div>

          <div className="notes">
            {opps.map((o, i) => {
              const on = keep.includes(o.id);
              return (
                <button
                  key={o.id}
                  className={`note ${on ? 'on' : 'off'}`}
                  style={{ '--tilt': `${(i % 3) - 1}deg` }}
                  onClick={() => toggle(o.id)}
                  aria-pressed={on}
                >
                  <span className="note-top">
                    <span>{SOURCES[o.source]?.label}{o.formType ? ` · ${FORM_TYPES[o.formType]}` : ''}</span>
                    <span>{o.fit != null ? `${o.fit}%` : ''}</span>
                  </span>
                  <span className="note-brand">{o.brand}</span>
                  <span className="note-line">{o.oneLiner || o.title}</span>
                  <span className="note-steps" aria-label="Steps">
                    {(o.steps || []).map((s) => (
                      <span key={s} title={STEP_KINDS[s]?.label}>{STEP_KINDS[s]?.icon}</span>
                    ))}
                  </span>
                  <span className="stamp">{on ? 'CONFIRMED' : 'REMOVED'}</span>
                </button>
              );
            })}
          </div>

          <div className="row gap end">
            <button className="btn primary" onClick={() => onConfirm(keep)}>
              Confirm {keep.length} & draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
