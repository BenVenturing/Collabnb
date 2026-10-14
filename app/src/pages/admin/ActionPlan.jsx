import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#646B62';
const BONE  = '#F7F5F2';
const MINT  = '#D1EBDB';

const SETTING_KEY = 'action_plan_progress';

const TYPE_STYLE = {
  do:          { label: 'Do',        bg: INK,       color: '#fff' },
  review:      { label: 'Review',    bg: '#E8E1F5', color: '#4B3A78' },
  'follow-up': { label: 'Follow-up', bg: '#FCEBD2', color: '#8A5A12' },
};

// Ordered by impact. Goal: 100 founding hotels + 50 more creators.
const TASKS = [
  { id: 'lock-offer', type: 'do', title: 'Lock the offer: 100 founding hosts + 100 founding creators',
    why: 'Decided. Founding Hosts get free lifetime access, a Founding Host badge, first look from founding creators, and done-for-you listing setup. The website and Discovery DM templates are already updated.',
    steps: ['Paste the new IG bio (below) into Instagram.', 'Paste the founding paragraph into every GoHighLevel template.', 'Use the live spots line at the top of this page in DMs and posts.'],
    script: 'IG bio:\nCreators × boutique stays 🌿\nFree stays & paid collabs, matched for you\n100 founding hosts + 100 creators → free for life\n👇 claim a spot\n\nGoHighLevel founding paragraph:\nWe\'re welcoming our first 100 properties as Founding Hosts: free lifetime access, a Founding Host badge, first look from our founding creators, and I\'ll set up your listing for you. No fees, ever.' },

  { id: 'pause-blasts', type: 'do', title: 'Pause the scraped-list email blasts',
    why: '10–15% bounces are hurting your sending domain. Most of the 1,000 CRM hosts came from the Hotel Creators import, and many are chains (Hyatt, Fairmont, Marriott) where nobody can say yes to a founding deal.',
    steps: ['Pause any scheduled GoHighLevel batches.', 'From now on, only contact independent or boutique properties (under ~50 rooms, owner-run).', 'In Discovery, hit the target button on independents you want to pursue (star stays for quick follow-ups). Chains are badged, ranked last, and hidden by default in the pool.'] },

  { id: 'first-hotel', type: 'do', title: 'Ask your signed hotel for a testimonial + 2 intros',
    why: 'One owner vouching for you beats 100 cold DMs. Owners know other owners.',
    script: 'Hi [Name]! Thanks again for being one of our first founding hotels 🙏 Two small favours: (1) could you send me 1–2 sentences on why you joined? (2) Do you know 2 other owners nearby who\'d want free creator content? Happy to give you [perk] for every one who joins.' },

  { id: 'walkin-list', type: 'do', title: 'Build your Lombok walk-in list (15 properties)',
    why: 'In person, owners say yes far more often than they reply to a DM. You\'re here, so use that.',
    steps: ['On Google Maps, search villas and boutique hotels within 30 min (Kuta, Selong Belanak, Senggigi).', 'Filter: 4.5★+, independent, active Instagram, looks like it needs content.', 'Write down the owner\'s name if they sign their review replies ("Thanks! – Made, Owner").', 'Add each one to Discovery as a host.'],
    target: '15 properties' },

  { id: 'walkin-1', type: 'do', title: 'Walk-in round 1: visit 5 properties',
    why: 'Pitch a result they get (creator content), not a platform.',
    steps: ['Go mid-morning (10–11am), when the owner or manager is usually around and checkout is done.', 'Ask for the owner or manager by name if you have it.', 'Show a real listing on your phone, then offer to build theirs right there.'],
    script: 'Hi! I\'m [you], I live here in Lombok. I run Collabnb. We send travel creators to stay at villas like yours in exchange for photos and reels you can use. I\'m picking the first 100 founding hotels, who get it free for life. I can set up your listing in 10 minutes right now. You just approve it. Want to see one?',
    target: '5 visits' },

  { id: 'build-listings-1', type: 'do', title: 'Build listings for every yes (same day)',
    why: 'Momentum dies overnight. A listing that\'s already live makes the yes real.',
    steps: ['Use their IG photos and website copy to build each listing.', 'WhatsApp them the link: "Here\'s your listing, reply OK and it goes live."', 'Mark the property as signed in Discovery.'] },

  { id: 'review-walkin', type: 'review', title: 'Debrief round 1: what objections came up?',
    why: 'Five conversations will teach you more than 200 emails did.',
    steps: ['Write each objection in the notes below (cost? trust? "we already have creators"?).', 'Write one sentence that answers each objection and add it to the walk-in script.', 'Note which opener got the owner leaning in.'] },

  { id: 'warm-replies', type: 'do', title: 'Go back to every hotel that already replied',
    why: 'Alila, Adila and anyone at "replied" in the CRM already answered once. They were the warmest leads you had.',
    steps: ['Filter Discovery by status = replied.', 'Pitch a creator match instead of the platform.'],
    script: 'Hi [Name]! Following up from earlier: [Creator] (@handle, [X]k followers, travel/family) is heading to [area] in [month] and would love to feature [Hotel]. I can set the whole thing up through Collabnb, and as a founding hotel it\'s free for you for life. Want me to send their profile?' },

  { id: 'run-finder', type: 'do', title: 'Run the contact finder on your CRM hosts',
    why: 'Pulls direct emails, WhatsApp numbers, creator/partner forms and named owners or GMs from each hotel\'s own website, and puts reservations@ inboxes last.',
    steps: ['Ask Claude: "run the decision-maker finder on my hosts" (it will ask for your LOCAL_IMPORT_SECRET).', 'Or run it yourself from /app:', 'node scripts/export-hosts-for-contact-scrape.mjs targets.json', '~/.venvs/scrapling/bin/python scripts/find-decision-makers.py targets.json found.json', 'node scripts/push-decision-makers-local.mjs found.json', 'Leave it running. It goes slowly on purpose and picks up where it left off if stopped.'] },

  { id: 'review-finder', type: 'review', title: 'Review finder results → pick your top 30',
    why: 'Better targets beat more messages.',
    steps: ['In Discovery, open hosts with a decision-maker, a personal-looking email or a WhatsApp number.', 'Star the 30 best independent properties that fit your creators.', 'Skip anything whose only contact is reservations@ / booking@.'],
    target: '30 starred' },

  { id: 'manual-names', type: 'do', title: 'Find the owner\'s name for the top 30 (2 min each)',
    why: 'Most boutique sites don\'t publish names. These four places usually have them.',
    steps: ['Google Maps: owners often sign their replies to reviews.', 'Booking.com / Airbnb: the host name on the listing.', 'Instagram: tagged team members, or "Meet the owner" story highlights.', 'LinkedIn search (just look; don\'t scrape it): "[Hotel] owner" or "[Hotel] marketing".', 'Guess firstname@domain and check it with an email validator before sending.'],
    target: '30 names' },

  { id: 'creator-match', type: 'do', title: 'Creator-match DMs to 15 hotels already working with creators',
    why: 'These hotels are already sold on creator marketing. You\'re just making it easier.',
    steps: ['Pick hotels that repost creator content, have "collab" in their bio, or run casting forms (Nova Skyland, Traverse Connect).', 'Warm them up first: comment on 2 posts and reply to a story, then DM.', 'Use the warm-replies script with a real creator from your 43.'],
    target: '15 DMs' },

  { id: 'routing', type: 'do', title: 'Routing question to 20 general inboxes',
    why: 'Where you have no named person, a one-line question gets forwarded. A pitch gets deleted.',
    script: 'Hi! Quick one: who handles creator/influencer partnerships at [Hotel]? I have a creator heading to [area] who\'d love to feature you. Thanks!',
    target: '20 sends' },

  { id: 'threads-launch', type: 'do', title: 'Threads: announce live stays + "bring 3 creators" referral',
    why: 'Creators join when there are real stays to apply for. Your 43 creators can recruit the next 50.',
    steps: ['Post: "First Lombok stays are open to creators: [villa names]. Founding creators apply first."', 'DM your 43 creators: bring 3 creator friends and get [perk] (priority stays / founder badge).', 'Keep posting 3 Threads a day, and reply to 20 travel-creator posts.'],
    target: '+15 creators' },

  { id: 'fu-walkin', type: 'follow-up', title: 'Follow up every walk-in "maybe" (2 days after)',
    why: 'Most yeses come on the second touch.',
    script: 'Hi [Name], great meeting you on [day]! I have a creator asking about [area] stays this month. Want me to put your listing up so they can request it? Takes 10 min and you approve everything.' },

  { id: 'gili-day', type: 'do', title: 'Gili day: 8 walk-ins on Gili T / Gili Air',
    why: 'There are more boutique hotels per square metre there than anywhere else near you, and they compete hard for content.',
    target: '8 visits' },

  { id: 'build-listings-2', type: 'do', title: 'Build listings for the Gili yeses + ask each for one intro',
    why: 'Every new founding hotel should bring you the next one.',
    steps: ['Build each listing the same day.', 'Ask each owner: "Who\'s one other owner I should talk to?"'] },

  { id: 'creator-dms', type: 'do', title: 'DM 15 creators posting Lombok / Bali / SE Asia content',
    why: 'The live stays are now the reason for them to join.',
    script: 'Hey! Love your [place] content. We just opened free stays at [villa names] in Lombok for creators. You\'d be one of our founding creators. Want the link?',
    target: '15 DMs' },

  { id: 'fu-1', type: 'follow-up', title: 'Follow-up #1 to creator-match + routing messages (3 days after)',
    why: 'One polite bump roughly doubles the reply rate.',
    script: 'Hi [Name], just bumping this in case it got buried. [Creator] is still keen on [Hotel] for [month]. Happy to send their profile 🙂' },

  { id: 'walkin-reel', type: 'do', title: 'Film and post the walk-in story',
    why: 'Content that shows real hotels saying yes recruits creators and gives the next owners proof.',
    steps: ['Reel/Thread: "I walked into 8 hotels to get creators free stays. Here\'s what happened."', 'Tag the founding hotels (with their OK).'] },

  { id: 'groups', type: 'do', title: 'Post in 3 digital-nomad / creator communities',
    why: 'A new channel for creators while Threads keeps compounding.',
    steps: ['Pick 3 Facebook groups or subreddits (Bali/Lombok nomads, UGC creators, travel bloggers).', 'Share something useful (how hotel collabs work), not an ad, then link the open stays.'],
    target: '+10 creators' },

  { id: 'walkin-3', type: 'do', title: 'Walk-in round 3: 5 more (Senggigi / Kuta)',
    why: 'Bring a printed testimonial and the names of hotels already signed. Social proof makes this round easier.',
    target: '5 visits' },

  { id: 'fu-final', type: 'follow-up', title: 'Final follow-up to non-responders (5–7 days after first)',
    why: 'End the thread politely. Some reply only to the last message.',
    script: 'Hi [Name], last note from me! We\'re down to [X] of 100 founding spots. If creator content for [Hotel] is ever interesting, just reply "yes" and I\'ll set it up. All the best!' },

  { id: 'review-scoreboard', type: 'review', title: 'Scoreboard: what worked? Double it.',
    why: 'Put more time into the channels that worked and drop the rest.',
    steps: ['Count founding hotels (/100) and new creators (/50).', 'For each signup, write down where it came from (walk-in, intro, creator-match, routing, finder).', 'Restart from "Build your walk-in list" in your best channel and a new area (Bali is next door).'] },
];

function Badge({ type }) {
  const s = TYPE_STYLE[type];
  return <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: 99, background: s.bg, color: s.color }}>{s.label}</span>;
}

function parseProgress(raw) {
  try {
    const p = JSON.parse(raw || '{}');
    return { done: p.done || [], skipped: p.skipped || [], notes: p.notes || {} };
  } catch {
    return { done: [], skipped: [], notes: {} };
  }
}

export default function ActionPlan() {
  const settings = useQuery(api.admin.getSettings);
  const counts = useQuery(api.admin.getFounderCounts);
  const setSetting = useMutation(api.admin.setSetting);
  const [viewing, setViewing] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);

  if (settings === undefined) return <p style={{ color: SAGE, fontSize: '0.85rem' }}>Loading…</p>;

  const progress = parseProgress(settings[SETTING_KEY]);
  const save = (next) => setSetting({ key: SETTING_KEY, value: JSON.stringify(next) });

  // Skipped tasks drop to the back of the queue instead of disappearing.
  const queue = [
    ...TASKS.filter(t => !progress.done.includes(t.id) && !progress.skipped.includes(t.id)),
    ...TASKS.filter(t => !progress.done.includes(t.id) && progress.skipped.includes(t.id)),
  ];
  const task = TASKS.find(t => t.id === viewing) || queue[0];
  const doneCount = progress.done.length;
  const isDone = task && progress.done.includes(task.id);

  const markDone = () => {
    save({ ...progress, done: [...progress.done, task.id], skipped: progress.skipped.filter(id => id !== task.id) });
    setViewing(null);
  };
  const skip = () => {
    save({ ...progress, skipped: [...progress.skipped.filter(id => id !== task.id), task.id] });
    setViewing(null);
  };
  const reopen = () => save({ ...progress, done: progress.done.filter(id => id !== task.id) });
  const saveNote = (text) => save({ ...progress, notes: { ...progress.notes, [task.id]: text } });
  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const btn = (primary) => ({ padding: '0.55rem 1.1rem', borderRadius: 9999, border: primary ? 'none' : `1px solid ${SLATE}40`, background: primary ? INK : 'transparent', color: primary ? '#fff' : SLATE, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' });

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: INK }}>Action Plan</h2>
        <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.82rem', color: SAGE }}>100 founding hotels + 50 more creators · one task at a time</p>
        <div style={{ height: 6, borderRadius: 99, background: '#E5E2DC', overflow: 'hidden' }}>
          <div style={{ width: `${(doneCount / TASKS.length) * 100}%`, height: '100%', background: SLATE, transition: 'width 0.3s' }} />
        </div>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.72rem', color: SAGE }}>{doneCount} of {TASKS.length} done</p>
        {counts && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            {[
              `${Math.max(0, 100 - counts.host)} of 100 founding host spots left`,
              `${Math.max(0, 100 - counts.creator)} of 100 founding creator spots left`,
            ].map(line => (
              <button key={line} onClick={() => copy(line)} title="Copy for DMs / posts"
                style={{ padding: '0.35rem 0.8rem', borderRadius: 9999, border: 'none', background: MINT, color: INK, fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>
                {line} · copy
              </button>
            ))}
          </div>
        )}
      </div>

      {!task ? (
        <div style={{ background: MINT, borderRadius: 16, padding: '1.5rem', color: INK }}>
          <strong>All {TASKS.length} tasks done.</strong> Run the scoreboard review again and restart the loop in your best channel.
          <div style={{ marginTop: '0.75rem' }}>
            <button style={btn(false)} onClick={() => save({ done: [], skipped: [], notes: progress.notes })}>Start a new round</button>
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: `1px solid ${SLATE}25`, borderRadius: 16, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <Badge type={task.type} />
            <span style={{ fontSize: '0.72rem', color: SAGE }}>Task {TASKS.indexOf(task) + 1}</span>
            {task.target && <span style={{ fontSize: '0.72rem', color: SAGE }}>· Target: {task.target}</span>}
            {isDone && <span style={{ fontSize: '0.72rem', color: '#2d7d5e', fontWeight: 700 }}>✓ Done</span>}
          </div>
          <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', color: INK }}>{task.title}</h3>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: SLATE, lineHeight: 1.5 }}>{task.why}</p>

          {task.steps && (
            <ol style={{ margin: '0 0 1rem', paddingLeft: '1.2rem', fontSize: '0.84rem', color: INK, lineHeight: 1.6 }}>
              {task.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          )}

          {task.script && (
            <div style={{ background: BONE, borderRadius: 12, padding: '0.9rem 1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: SAGE, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Script</span>
                <button onClick={() => copy(task.script)} style={{ ...btn(false), padding: '0.2rem 0.7rem', fontSize: '0.7rem' }}>{copied ? 'Copied' : 'Copy'}</button>
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: INK, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{task.script}</p>
            </div>
          )}

          <textarea key={task.id} defaultValue={progress.notes[task.id] || ''}
            onBlur={(e) => e.target.value !== (progress.notes[task.id] || '') && saveNote(e.target.value)}
            rows={3} placeholder="Notes: who you contacted, objections, results…"
            style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${SLATE}30`, borderRadius: 10, padding: '0.6rem 0.75rem', fontSize: '0.82rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: '1rem' }} />

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {isDone
              ? <button style={btn(false)} onClick={reopen}>Mark not done</button>
              : <button style={btn(true)} onClick={markDone}>Done → next task</button>}
            {!isDone && <button style={btn(false)} onClick={skip}>Do later</button>}
            {viewing && <button style={btn(false)} onClick={() => setViewing(null)}>Back to current</button>}
          </div>
        </div>
      )}

      <button onClick={() => setShowAll(!showAll)} style={{ marginTop: '1.25rem', background: 'none', border: 'none', color: SLATE, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
        {showAll ? 'Hide full list ▲' : 'Show full list ▼'}
      </button>
      {showAll && (
        <ol style={{ margin: '0.6rem 0 0', paddingLeft: '1.2rem', fontSize: '0.8rem', lineHeight: 1.9 }}>
          {TASKS.map(t => (
            <li key={t.id} onClick={() => setViewing(t.id)} style={{ cursor: 'pointer', color: progress.done.includes(t.id) ? SAGE : INK, textDecoration: progress.done.includes(t.id) ? 'line-through' : 'none', fontWeight: t.id === task?.id ? 700 : 400 }}>
              {t.title}{progress.skipped.includes(t.id) && !progress.done.includes(t.id) ? ' (later)' : ''}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
