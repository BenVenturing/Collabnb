import { useState } from 'react';
import { usePersisted } from '../lib.js';
import Icon from './Icon.jsx';

const STEPS = [
  {
    title: 'Install Node.js',
    note: 'Download the LTS version from nodejs.org and install it. Skip if you already have it.',
    link: 'https://nodejs.org',
  },
  {
    title: 'Install Claude Code',
    cmd: 'npm install -g @anthropic-ai/claude-code',
    note: 'Paste into Terminal. You sign in with your Claude account the first time you run it.',
  },
  {
    title: 'Give Claude a browser',
    cmd: 'claude mcp add --scope user playwright -- npx @playwright/mcp@latest --browser chrome --user-data-dir ~/.pitchglass/chrome-profile',
    note: 'A separate Chrome profile just for Pitchglass, so your personal browsing stays apart.',
  },
  {
    title: 'Start Claude Code in Pitchglass',
    cmd: 'cd ~/Collabnb && claude',
    note: 'Keep this Terminal window open while you use Pitchglass.',
  },
  {
    title: 'Log in to your accounts',
    cmd: 'Open instagram.com, threads.com, x.com and reddit.com in the browser.',
    note: 'Paste into Claude Code. Log in with your creator account in the Chrome window that opens. One time only.',
  },
  {
    title: 'Run your first search',
    note: 'Click Search at the top right, copy the search into Claude Code, then Load results.',
  },
];

export default function Connect({ settings, setSettings }) {
  const [copied, setCopied] = useState(null);
  const [done, setDone] = usePersisted('pg.setup', []);
  const caps = settings.caps;
  const setCap = (k) => (e) => setSettings({ ...settings, caps: { ...caps, [k]: Math.max(0, Number(e.target.value) || 0) } });
  const toggle = (i) => setDone(done.includes(i) ? done.filter((x) => x !== i) : [...done, i]);
  const copy = async (i, cmd) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(i);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };
  const sources = settings.sources || {};

  return (
    <section className="stack narrow">
      <div className="glass pad-lg">
        <h2>Set up your agent</h2>
        <p className="muted">
          Pitchglass uses Claude Code on your computer to search and apply in your own browser, so your accounts stay yours.
          About 10 minutes, once. {done.length}/{STEPS.length} done.
        </p>
        <div className="ob-progress" aria-hidden="true">
          <span style={{ width: `${(done.length / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {STEPS.map((s, i) => (
        <div key={s.title} className={`glass step ${done.includes(i) ? 'done' : ''}`}>
          <button className="num" onClick={() => toggle(i)} aria-pressed={done.includes(i)} aria-label={`Mark step ${i + 1} done`}>
            {done.includes(i) ? <Icon name="check" size={16} /> : i + 1}
          </button>
          <div className="grow">
            <h3>{s.title}</h3>
            {s.cmd && (
              <div className="cmd">
                <code>{s.cmd}</code>
                <button className="btn ghost sm" onClick={() => copy(i, s.cmd)}>{copied === i ? 'Copied' : 'Copy'}</button>
              </div>
            )}
            <p className="muted small">
              {s.note}{' '}
              {s.link && (
                <a className="link" href={s.link} target="_blank" rel="noreferrer">
                  Open <Icon name="external" size={12} />
                </a>
              )}
            </p>
          </div>
        </div>
      ))}

      <div className="glass pad-lg">
        <h2>Where to search</h2>
        <div className="seg">
          {[['instagram', 'Instagram'], ['threads', 'Threads'], ['x', 'X'], ['reddit', 'Reddit']].map(([k, l]) => (
            <button
              key={k}
              className={`pill ${sources[k] ? 'on' : ''}`}
              aria-pressed={!!sources[k]}
              onClick={() => setSettings({ ...settings, sources: { ...sources, [k]: !sources[k] } })}
            >
              {sources[k] && <Icon name="check" size={13} />} {l}
            </button>
          ))}
        </div>
      </div>

      <div className="glass pad-lg">
        <h2>Account safety</h2>
        <p className="muted small">
          Use your real, warmed-up creator account. Keep daily numbers low — Instagram limits accounts that act in bursts.
        </p>
        <div className="caps">
          {[['applications', 'Results per search'], ['follows', 'Follows / day'], ['comments', 'Comments / day'], ['dms', 'DMs / day']].map(([k, l]) => (
            <label key={k}>
              <span>{l}</span>
              <input className="plain" type="number" min="0" value={caps[k]} onChange={setCap(k)} />
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
