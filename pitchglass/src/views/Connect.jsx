import { useState } from 'react';

const STEPS = [
  { title: 'Add Pitchglass to Claude Code', cmd: 'claude mcp add --transport http pitchglass https://pitchglass.app/mcp', note: 'Opens a sign-in page once. Coming in the production build.' },
  { title: 'Install a browser driver', cmd: 'npx skills add citrolabs/ego-lite', note: 'Lets the agent use your logged-in browser for Instagram DMs and forms. Jev support comes next.' },
  { title: 'Run it', cmd: '/pitchglass run', note: 'Sends everything you approved here, then pulls new matches.' },
  { title: 'Keep it running', cmd: '/loop 2h /pitchglass run', note: 'Runs every 2 hours while your laptop is open.' },
];

export default function Connect({ settings, setSettings }) {
  const caps = settings.caps;
  const setCap = (k) => (e) => setSettings({ ...settings, caps: { ...caps, [k]: Math.max(0, Number(e.target.value) || 0) } });
  const [copied, setCopied] = useState(null);
  const copy = async (i, cmd) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(i);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };
  return (
    <section className="stack narrow">
      <div className="glass pad-lg">
        <h2>Connect your agent</h2>
        <p className="muted">
          Pitchglass finds and drafts in the cloud. Your own Claude Code does the sending, from your own browser,
          so your accounts stay yours. <strong>MVP note:</strong> the hosted MCP isn't live yet — this page shows the flow.
        </p>
      </div>
      {STEPS.map((s, i) => (
        <div key={s.title} className="glass step">
          <span className="num">{i + 1}</span>
          <div className="grow">
            <h3>{s.title}</h3>
            <div className="cmd">
              <code>{s.cmd}</code>
              <button className="btn ghost sm" onClick={() => copy(i, s.cmd)}>{copied === i ? 'Copied' : 'Copy'}</button>
            </div>
            <p className="muted small">{s.note}</p>
          </div>
        </div>
      ))}
      <div className="glass pad-lg">
        <h2>Ping me on my phone</h2>
        <p className="muted small">After each run you get the brief list and can confirm or remove from your phone.</p>
        <div className="seg" role="radiogroup" aria-label="Notification channel">
          {[['telegram', 'Telegram'], ['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['off', 'Off']].map(([v, l]) => (
            <button key={v} role="radio" aria-checked={settings.notify === v} className={`pill ${settings.notify === v ? 'on' : ''}`} onClick={() => setSettings({ ...settings, notify: v })}>
              {l}
            </button>
          ))}
        </div>
        {settings.notify !== 'off' && (
          <label>
            <span>{settings.notify === 'whatsapp' ? 'WhatsApp number' : `${settings.notify === 'telegram' ? 'Telegram' : 'Instagram'} username`}</span>
            <input className="plain" value={settings.notifyHandle} onChange={(e) => setSettings({ ...settings, notifyHandle: e.target.value })} />
          </label>
        )}
      </div>

      <div className="glass pad-lg">
        <h2>Account safety</h2>
        <p className="muted small">
          Daily limits keep your Instagram looking human. Run it on your real, warmed-up creator account — never a fresh one.
        </p>
        <div className="caps">
          {[['applications', 'Applications per run'], ['follows', 'Follows / day'], ['comments', 'Comments / day'], ['dms', 'DMs / day']].map(([k, l]) => (
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
