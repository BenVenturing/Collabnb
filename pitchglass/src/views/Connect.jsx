import { useState } from 'react';

const STEPS = [
  { title: 'Add Pitchglass to Claude Code', cmd: 'claude mcp add --transport http pitchglass https://pitchglass.app/mcp', note: 'Opens a sign-in page once. Coming in the production build.' },
  { title: 'Install a browser driver', cmd: 'npx skills add citrolabs/ego-lite', note: 'Lets the agent use your logged-in browser for Instagram DMs and forms. Jev support comes next.' },
  { title: 'Run it', cmd: '/pitchglass run', note: 'Sends everything you approved here, then pulls new matches.' },
  { title: 'Keep it running', cmd: '/loop 2h /pitchglass run', note: 'Runs every 2 hours while your laptop is open.' },
];

export default function Connect() {
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
    </section>
  );
}
