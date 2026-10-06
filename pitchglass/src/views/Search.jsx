import { useRef, useState } from 'react';
import { searchPrompt } from '../lib.js';
import Icon from './Icon.jsx';

export default function Search({ count, settings, onImport, onClose }) {
  const prompt = searchPrompt(settings, count);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState(null);
  const file = useRef(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const take = (data) => {
    const items = Array.isArray(data) ? data : data?.results;
    if (!Array.isArray(items)) return setStatus({ bad: true, text: 'That file isn’t a Pitchglass results list.' });
    const n = onImport(items, count);
    if (n) onClose();
    else setStatus({ text: 'No new results in that file — everything in it is already in your feed.' });
  };

  const load = async () => {
    setStatus({ text: 'Loading…' });
    try {
      const r = await fetch(`/results.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) throw new Error();
      take(await r.json());
    } catch {
      setStatus({ bad: true, text: 'No results yet. Wait until Claude Code says it saved results.json, then try again.' });
    }
  };

  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      take(JSON.parse(await f.text()));
    } catch {
      setStatus({ bad: true, text: 'Couldn’t read that file.' });
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Search">
      <div className="glass onboard">
        <div className="row between">
          <h2 className="ob-title">Find {count} opportunities</h2>
          <button className="btn ghost sm" onClick={onClose}>Close</button>
        </div>
        {!settings.mission?.trim() && (
          <p className="warn-line small">Tip: fill in “What are you pitching for?” on Opportunities first so the search knows what to look for.</p>
        )}

        <ol className="search-steps">
          <li>
            <strong>Copy this search</strong>
            <div className="cmd tall">
              <code>{prompt}</code>
            </div>
            <button className="btn sm" onClick={copy}>{copied ? 'Copied' : 'Copy search'}</button>
          </li>
          <li>
            <strong>Paste it into Claude Code</strong>
            <span className="muted small">In the Terminal window where Claude Code is running. It searches in your logged-in browser — reading only, it never likes, follows, comments or messages while searching.</span>
          </li>
          <li>
            <strong>Load the results</strong>
            <span className="muted small">When Claude Code says it saved results.json:</span>
            <div className="row gap wrap">
              <button className="btn primary" onClick={load}>
                <Icon name="inbox" size={15} /> Load results
              </button>
              <button className="btn ghost" onClick={() => file.current?.click()}>Choose file…</button>
              <input ref={file} type="file" accept="application/json,.json" hidden onChange={pick} />
            </div>
          </li>
        </ol>
        {status && <p className={`small ${status.bad ? 'warn-line' : 'muted'}`} role="status">{status.text}</p>}
      </div>
    </div>
  );
}
