import { useState } from 'react';
import Icon from './Icon.jsx';

export const EXAMPLE_CAPTIONS = [
  'Checked in at 4pm, didn’t leave the balcony until the light went. Some rooms you shoot, some you just sit in. This one was both.',
  'What a hotel actually looks like at 7am: coffee on the terrace, housekeeping already on floor two, nobody else awake. Save this for the trip you keep meaning to book.',
  'Three things I check before I film any stay: where the light lands at sunset, how loud the street is, and whether the shower is as good as the listing says. This one passed all three.',
];

const NICHES = ['travel', 'hotels', 'food', 'beauty', 'skincare', 'fitness', 'fashion', 'lifestyle', 'outdoor', 'tech', 'home', 'family', 'pets', 'ugc'];

const STEPS = [
  { id: 'welcome', title: 'Let’s set up your pitching agent', help: 'A few quick questions. Every pitch pulls from your answers, and it never invents anything you didn’t give it.' },
  { id: 'who', title: 'Who are you?', fields: [['name', 'Your name'], ['handle', 'Instagram handle', '@yourhandle']] },
  { id: 'reach', title: 'Your reach', help: 'Rough numbers are fine. Brands filter on these.', fields: [['followers', 'Followers', 'e.g. 18K'], ['engagement', 'Engagement rate', 'e.g. 4.2%'], ['links', 'Other platforms (TikTok, YouTube…)', 'one per line', true]] },
  { id: 'where', title: 'Where are you?', fields: [['basedIn', 'Based in', 'City, Country'], ['travel', 'Where you can travel', 'e.g. anywhere in Europe, US only']] },
  { id: 'niches', title: 'What do you create?', help: 'Pick your niches — this drives the fit score.' },
  { id: 'formats', title: 'Formats and turnaround', fields: [['formats', 'Formats you shoot', 'Reels, TikToks, photo sets, UGC ads'], ['turnaround', 'Typical turnaround', 'e.g. 5 days after the stay']] },
  { id: 'past', title: 'Past brand work', help: 'One per line, newest first. Include results if you have them.', fields: [['pastWork', 'Brand work', '3 Reels for a boutique hotel in Tulum, 120K views', true]] },
  { id: 'rate', title: 'Rates and deals', fields: [['rate', 'Your rate', 'e.g. $250 per Reel, or stay + $150'], ['deals', 'Deals you accept', 'e.g. paid only, stay + fee, gifted for hotels']] },
  { id: 'dates', title: 'When are you free?', help: 'One range per line, soonest first. Update this whenever it changes.', fields: [['availability', 'Available dates', 'Nov 3 – Nov 18\nDec 1 – Dec 20', true]] },
  { id: 'portfolio', title: 'Portfolio', fields: [['portfolio', 'Portfolio or media kit link'], ['email', 'Email for applications']] },
  { id: 'voice', title: 'How do you write?', help: 'Paste 3 captions or DMs you’ve written. The agent matches your voice from these.' },
  { id: 'mission', title: 'What are you pitching for?', help: 'Every run searches for this. You can change it any time.' },
];

export default function Onboarding({ profile, setProfile, mission, setMission, onDone }) {
  const [i, setI] = useState(0);
  const [draft, setDraft] = useState({ ...profile });
  const [captions, setCaptions] = useState(() => {
    const parts = (profile.voiceSamples || '').split(/\n\s*\n/).filter(Boolean);
    return [parts[0] || '', parts[1] || '', parts[2] || ''];
  });
  const [goal, setGoal] = useState(mission || '');
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const niches = (draft.niches || '').split(',').map((n) => n.trim()).filter(Boolean);

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const toggleNiche = (n) => set('niches', (niches.includes(n) ? niches.filter((x) => x !== n) : [...niches, n]).join(', '));

  const finish = () => {
    setProfile({ ...draft, voiceSamples: captions.filter((c) => c.trim()).join('\n\n'), onboarded: true, updatedAt: Date.now() });
    setMission(goal);
    onDone();
  };
  const next = () => (last ? finish() : setI(i + 1));

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Set up Pitchglass">
      <div className="glass onboard">
        <div className="ob-progress" aria-hidden="true">
          <span style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} />
        </div>
        <p className="muted small">Step {i + 1} of {STEPS.length}</p>
        <h2 className="ob-title">{step.title}</h2>
        {step.help && <p className="muted">{step.help}</p>}

        <div className="ob-body">
          {step.fields?.map(([k, label, ph, multi]) => (
            <label key={k}>
              <span>{label}</span>
              {multi ? (
                <textarea rows={4} value={draft[k] || ''} placeholder={ph} onChange={(e) => set(k, e.target.value)} />
              ) : (
                <input className="plain" value={draft[k] || ''} placeholder={ph} onChange={(e) => set(k, e.target.value)} />
              )}
            </label>
          ))}

          {step.id === 'niches' && (
            <div className="ob-chips">
              {NICHES.map((n) => (
                <button key={n} className={`pill ${niches.includes(n) ? 'on' : ''}`} onClick={() => toggleNiche(n)} aria-pressed={niches.includes(n)}>
                  {niches.includes(n) && <Icon name="check" size={13} />} {n}
                </button>
              ))}
            </div>
          )}

          {step.id === 'voice' && (
            <>
              {captions.map((c, j) => (
                <label key={j}>
                  <span>Caption {j + 1}</span>
                  <textarea rows={3} value={c} onChange={(e) => setCaptions(captions.map((x, k) => (k === j ? e.target.value : x)))} />
                </label>
              ))}
              <button className="btn ghost sm" onClick={() => setCaptions(EXAMPLE_CAPTIONS)}>
                Start from example captions
              </button>
              <p className="muted small">Examples are a starting point — rewrite them so they sound like you.</p>
            </>
          )}

          {step.id === 'mission' && (
            <textarea
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Paid UGC and hosted stays for travel and hotel brands, $150+ per video, remote or Europe"
              aria-label="What are you pitching for?"
            />
          )}
        </div>

        <div className="row gap between wrap">
          <button className="btn ghost" onClick={() => (i === 0 ? onDone() : setI(i - 1))}>
            {i === 0 ? 'Later' : 'Back'}
          </button>
          <div className="row gap">
            {i > 0 && !last && (
              <button className="btn ghost" onClick={() => setI(i + 1)}>
                Skip
              </button>
            )}
            <button className="btn primary" onClick={next}>
              {i === 0 ? 'Start' : last ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
