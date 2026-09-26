const FIELDS = [
  ['name', 'Name'],
  ['handle', 'Instagram handle'],
  ['followers', 'Followers', 'e.g. 18K'],
  ['engagement', 'Engagement', 'e.g. 4.2%'],
  ['basedIn', 'Based in', 'City, Country'],
  ['niches', 'Niches', 'comma separated'],
  ['formats', 'Formats you shoot'],
  ['rate', 'Rate', 'e.g. $250 per Reel or stay + fee'],
  ['portfolio', 'Portfolio / media kit link'],
];

export default function Profile({ profile, setProfile }) {
  const set = (k) => (e) => setProfile({ ...profile, [k]: e.target.value });
  return (
    <section className="split">
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
          <span>Past brand work (one per line, newest first)</span>
          <textarea rows={4} value={profile.pastWork} onChange={set('pastWork')} placeholder="3 Reels for a boutique hotel in Tulum, 120K views" />
        </label>
      </div>
      <div className="glass form">
        <h2 className="sub">Your voice</h2>
        <label>
          <span>Paste 3 captions or DMs you've written</span>
          <textarea rows={7} value={profile.voiceSamples} onChange={set('voiceSamples')} placeholder="The agent studies these to match how you write." />
        </label>
        <label>
          <span>Words you never use</span>
          <textarea rows={4} value={profile.banned} onChange={set('banned')} />
        </label>
      </div>
    </section>
  );
}
