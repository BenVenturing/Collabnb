import { daysSince } from '../lib.js';

const FIELDS = [
  ['name', 'Name'],
  ['handle', 'Instagram handle'],
  ['email', 'Email for applications'],
  ['followers', 'Followers', 'e.g. 18K'],
  ['engagement', 'Engagement', 'e.g. 4.2%'],
  ['basedIn', 'Based in', 'City, Country'],
  ['niches', 'Niches', 'comma separated'],
  ['formats', 'Formats you shoot'],
  ['rate', 'Rate', 'e.g. $250 per Reel or stay + fee'],
  ['portfolio', 'Portfolio / media kit link'],
];

export default function Profile({ profile, setProfile }) {
  const touch = (patch) => setProfile({ ...profile, ...patch, updatedAt: Date.now() });
  const set = (k) => (e) => touch({ [k]: e.target.value });
  const age = daysSince(profile.updatedAt);

  const upload = (e) => {
    const f = e.target.files?.[0];
    if (f) touch({ mediaKit: { name: f.name, size: f.size, type: f.type } });
  };

  return (
    <section className="stack">
      <div className={`glass fresh ${age == null || age > 14 ? 'stale' : ''}`}>
        {age == null
          ? 'Fill this in once — every pitch pulls from here.'
          : age > 14
            ? `Last updated ${age} days ago. Check your dates and numbers before the next run.`
            : `Up to date · updated ${age === 0 ? 'today' : `${age} day${age > 1 ? 's' : ''} ago`}`}
      </div>
      <div className="split">
        <div className="glass form">
          <h2 className="sub">About you</h2>
          <p className="muted small">The agent only uses facts from here. It never invents stats or past work.</p>
          <div className="fields">
            {FIELDS.map(([k, label, ph]) => (
              <label key={k}>
                <span>{label}</span>
                <input value={profile[k] || ''} onChange={set(k)} placeholder={ph} />
              </label>
            ))}
          </div>
          <label>
            <span>Available dates (one range per line, soonest first)</span>
            <textarea rows={3} value={profile.availability || ''} onChange={set('availability')} placeholder={'Nov 3 – Nov 18\nDec 1 – Dec 20'} />
          </label>
          <label>
            <span>Past brand work (one per line, newest first)</span>
            <textarea rows={4} value={profile.pastWork} onChange={set('pastWork')} placeholder="3 Reels for a boutique hotel in Tulum, 120K views" />
          </label>
        </div>
        <div className="stack">
          <div className="glass form">
            <h2 className="sub">Portfolio</h2>
            <label>
              <span>Links (TikTok, YouTube, site, Collabnb — one per line)</span>
              <textarea rows={3} value={profile.links || ''} onChange={set('links')} />
            </label>
            <label className="upload">
              <span>Media kit (PDF) — attached when a form asks for it</span>
              <input type="file" accept=".pdf,image/*" onChange={upload} />
              {profile.mediaKit && (
                <span className="small">
                  ✓ {profile.mediaKit.name} · {Math.round(profile.mediaKit.size / 1024)} KB
                  <span className="muted"> (MVP keeps the file name only)</span>
                </span>
              )}
            </label>
          </div>
          <div className="glass form">
            <h2 className="sub">Your voice</h2>
            <label>
              <span>Paste 3 captions or DMs you've written</span>
              <textarea rows={6} value={profile.voiceSamples} onChange={set('voiceSamples')} placeholder="The agent studies these to match how you write." />
            </label>
            <label>
              <span>Words you never use</span>
              <textarea rows={3} value={profile.banned} onChange={set('banned')} />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
