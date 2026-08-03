import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import CreatorAvatar from '../components/CreatorAvatar';
import { ListingCard } from './Explore';

/*
 * Founders — the lifetime founding-member space.
 * Access is founder-only (surfaced as a tab in their search); anyone who reaches
 * this page has already been accepted + verified, so there is no locked/claim state.
 *
 * Live: founder counts (api.admin.getFounderCounts) + directory (api.admin.getFounderDirectory).
 * Seed (until the group-chat + resources backend is wired): lounge threads, resources,
 * and early-access listings (stand-in = SAMPLE_LISTINGS rendered through the real card).
 */

const GOLD       = '#B8922A';
const GOLD_SOFT  = 'rgba(212,168,67,0.12)';
const GOLD_LINE  = 'rgba(184,146,42,0.32)';
const CAP = 100;

// ── Graphic icons (match the app's line-icon style) ───────────────────────────
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconChat  = ({ s = 18 }) => (<svg viewBox="0 0 24 24" width={s} height={s} {...stroke}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>);
const IconBook  = ({ s = 18 }) => (<svg viewBox="0 0 24 24" width={s} height={s} {...stroke}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>);
const IconClock = ({ s = 18 }) => (<svg viewBox="0 0 24 24" width={s} height={s} {...stroke}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
const IconUsers = ({ s = 18 }) => (<svg viewBox="0 0 24 24" width={s} height={s} {...stroke}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const IconPin   = ({ s = 15 }) => (<svg viewBox="0 0 24 24" width={s} height={s} {...stroke}><path d="M9 4v6l-2 4h10l-2-4V4"/><path d="M12 14v7"/><path d="M8 4h8"/></svg>);
const IconPlus  = ({ s = 15 }) => (<svg viewBox="0 0 24 24" width={s} height={s} {...stroke}><path d="M12 5v14M5 12h14"/></svg>);
const IconReply = ({ s = 13 }) => (<svg viewBox="0 0 24 24" width={s} height={s} {...stroke}><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>);
const IconLock  = ({ s = 14 }) => (<svg viewBox="0 0 24 24" width={s} height={s} {...stroke}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>);

// ── Founder star — the founding-member marker (matches CreatorCard) ────────────
function FounderStar({ size = 16, ring = true }) {
  const inner = (
    <svg viewBox="0 0 16 16" width={size * (ring ? 0.58 : 1)} height={size * (ring ? 0.58 : 1)} fill={ring ? '#fff' : GOLD}>
      <path d="M8 1.5l1.67 3.38 3.73.54-2.7 2.63.64 3.72L8 9.77l-3.34 1.76.64-3.72L2.6 5.42l3.73-.54z"/>
    </svg>
  );
  if (!ring) return inner;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #D4A843, #B8922A)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 1px 5px rgba(212,168,67,0.55)', flexShrink: 0,
    }}>{inner}</div>
  );
}

function AvatarStar({ name, src, size = 38, founder }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <CreatorAvatar src={src} name={name} size={size} style={{ border: '2px solid rgba(255,255,255,0.9)' }} />
      {founder && (
        <div style={{ position: 'absolute', bottom: -3, right: -3 }}>
          <FounderStar size={Math.round(size * 0.42)} />
        </div>
      )}
    </div>
  );
}

// ── Seed data ────────────────────────────────────────────────────────────────
const SEED_THREADS = {
  creator: [
    { id: 'c1', author: 'Maya R.', founder: true, time: '9:12 AM',
      text: 'Just wrapped my first villa collab in Tulum — the host let me shoot sunrise on the rooftop. Happy to share my shot list if anyone wants it.',
      reactions: [{ e: '🔥', n: 6 }, { e: '🙌', n: 3 }],
      replies: [
        { id: 'c1r1', author: 'Devon K.', founder: true, time: '9:20 AM', text: 'Yes please! Shooting my first one next week.' },
        { id: 'c1r2', author: 'Maya R.', founder: true, time: '9:24 AM', text: 'Dropping it in Resources → Playbooks today.' },
      ] },
    { id: 'c2', author: 'Priya S.', founder: true, time: '10:02 AM',
      text: 'Reminder: early-access listings drop 3 days before they go public. Two new beachfront stays just landed in the Early access tab.',
      reactions: [{ e: '👀', n: 11 }], replies: [] },
    { id: 'c3', author: 'Jordan T.', founder: true, time: '11:37 AM',
      text: 'What rate are people charging for a 3-reel + 5-story package these days? Trying to price a luxury property.',
      reactions: [{ e: '💭', n: 2 }],
      replies: [{ id: 'c3r1', author: 'Maya R.', founder: true, time: '11:41 AM', text: 'Check the Pricing Your Collabs guide — points/tiers math makes this easy.' }] },
  ],
  host: [
    { id: 'h1', author: 'The Olive House', founder: true, time: '8:44 AM',
      text: 'Hosted our first founder creator this weekend and the content was unreal. The vetting really shows — night and day vs cold DMs.',
      reactions: [{ e: '🙌', n: 8 }, { e: '❤️', n: 4 }],
      replies: [{ id: 'h1r1', author: 'Casa Marea', founder: true, time: '9:01 AM', text: 'Same. Which package did you run?' }] },
    { id: 'h2', author: 'Pine & Co Cabins', founder: true, time: '10:15 AM',
      text: 'Question for hosts — do you comp the full stay, or nightly + a flat content fee? Curious what converts best.',
      reactions: [{ e: '💭', n: 5 }], replies: [] },
  ],
};

const RESOURCES = [
  { group: 'Playbooks', items: [
    { title: 'The First-Collab Playbook', desc: 'Step-by-step from match to published content.', type: 'PDF' },
    { title: 'Creator Rate Card Template', desc: 'Plug-and-play pricing sheet you can send hosts.', type: 'Doc' },
    { title: 'Sunrise Shoot — Shot List', desc: "Maya's rooftop villa shot list, shared to the group.", type: 'PDF' },
  ] },
  { group: 'Templates', items: [
    { title: 'Collab Contract Template', desc: 'The standard Collabnb agreement, editable.', type: 'Doc' },
    { title: 'Cold Outreach DM Scripts', desc: 'Warm, specific openers that actually get replies.', type: 'Doc' },
    { title: 'Brand Pitch Deck', desc: 'Founder-only Canva template for pitching stays.', type: 'Link' },
  ] },
  { group: 'Guides', items: [
    { title: 'Pricing Your Collabs', desc: 'Points, tiers, and the floor math explained.', type: 'Guide' },
    { title: 'Tax & 1099 Basics for Creators', desc: 'What to track and set aside, in plain English.', type: 'Guide' },
    { title: 'Hosting Creators 101', desc: 'For hosts — how to run a smooth on-site shoot.', type: 'Video' },
  ] },
];

// A single stand-in card that shows what an early-access listing looks like.
// Remove this once real curated early-access listings exist.
const EXAMPLE_EARLY_LISTING = {
  id: 'example',
  title: 'Cliffside Villa — Amalfi',
  location: 'Positano, Italy',
  image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80',
  compensation: '3-night stay + €400',
  deliverables: '3 Reels · 5 Photos',
  collab_type: 'UGC Video',
  dates_available: 'Example listing',
  is_featured: false, _isSample: false, _redacted: false,
};

const QUICK_REACTIONS = ['🔥', '🙌', '❤️', '👀', '💭'];

// ── Watermark: "more coming soon" (on-brand, subtle) ──────────────────────────
function ComingSoonWatermark({ label = 'MORE COMING SOON' }) {
  const row = new Array(5).fill(label).join('   ·   ');
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 3 }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: '240%', transform: 'translate(-50%,-50%) rotate(-24deg)', display: 'flex', flexDirection: 'column', gap: '2.2rem' }}>
        {new Array(9).fill(row).map((t, i) => (
          <div key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.28em', color: 'rgba(25,37,36,0.07)', whiteSpace: 'nowrap', textAlign: 'center', userSelect: 'none' }}>{t}</div>
        ))}
      </div>
    </div>
  );
}

// ── Lounge (single private room, threaded) ────────────────────────────────────
function Thread({ msg, onReact, onReply }) {
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState('');
  return (
    <div className="fnd-thread" style={{ display: 'flex', gap: '0.75rem', padding: '0.95rem 0' }}>
      <AvatarStar name={msg.author} founder={msg.founder} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)' }}>{msg.author}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--sage)' }}>{msg.time}</span>
        </div>
        <p style={{ margin: '0.15rem 0 0', fontSize: '0.875rem', color: 'var(--slate)', lineHeight: 1.5 }}>{msg.text}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {msg.reactions?.map((r) => (
            <button key={r.e} onClick={() => onReact(msg.id, r.e)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--hairline)', borderRadius: '999px', padding: '0.1rem 0.5rem', color: 'var(--slate)' }}>{r.e} <span style={{ fontWeight: 600 }}>{r.n}</span></button>
          ))}
          <div className="fnd-tools" style={{ display: 'inline-flex', gap: '0.15rem', alignItems: 'center' }}>
            {QUICK_REACTIONS.map((e) => (
              <button key={e} onClick={() => onReact(msg.id, e)} title="React" style={{ fontSize: '0.82rem', opacity: 0.6, padding: '0.05rem 0.15rem' }}>{e}</button>
            ))}
            <button onClick={() => setReplying((v) => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', fontWeight: 600, color: GOLD, marginLeft: '0.2rem' }}><IconReply /> Reply</button>
          </div>
        </div>

        {msg.replies?.length > 0 && (
          <div style={{ marginTop: '0.6rem', paddingLeft: '0.85rem', borderLeft: `2px solid ${GOLD_SOFT}`, display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {msg.replies.map((r) => (
              <div key={r.id} style={{ display: 'flex', gap: '0.55rem' }}>
                <AvatarStar name={r.author} founder={r.founder} size={26} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--ink)' }}>{r.author}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--sage)' }}>{r.time}</span>
                  </div>
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.82rem', color: 'var(--slate)', lineHeight: 1.45 }}>{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {replying && (
          <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onReply(msg.id, draft.trim()); setDraft(''); setReplying(false); } }} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
            <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Reply in thread…" style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem 0.75rem', borderRadius: '999px', border: '1px solid var(--hairline)', background: 'rgba(255,255,255,0.85)', outline: 'none' }} />
            <button type="submit" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', background: GOLD, borderRadius: '999px', padding: '0.5rem 0.9rem' }}>Send</button>
          </form>
        )}
      </div>
    </div>
  );
}

function Lounge({ role }) {
  const [threads, setThreads] = useState(() => SEED_THREADS[role].map((m) => ({ ...m })));
  const [draft, setDraft] = useState('');
  const composerRef = useRef(null);
  const scrollRef = useRef(null);
  const roomLabel = role === 'creator' ? "Creators' Lounge" : "Hosts' Lounge";

  useEffect(() => { setThreads(SEED_THREADS[role].map((m) => ({ ...m }))); }, [role]);

  const react = (id, emoji) => setThreads((prev) => prev.map((m) => {
    if (m.id !== id) return m;
    const existing = (m.reactions || []).find((r) => r.e === emoji);
    const reactions = existing ? m.reactions.map((r) => r.e === emoji ? { ...r, n: r.n + 1 } : r) : [...(m.reactions || []), { e: emoji, n: 1 }];
    return { ...m, reactions };
  }));

  const reply = (id, text) => setThreads((prev) => prev.map((m) => m.id === id
    ? { ...m, replies: [...(m.replies || []), { id: `${id}r${Date.now()}`, author: 'You', founder: true, time: 'now', text }] } : m));

  const startThread = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setThreads((prev) => [...prev, { id: `me${Date.now()}`, author: 'You', founder: true, time: 'now', text: draft.trim(), reactions: [], replies: [] }]);
    setDraft('');
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }));
  };

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '68vh', minHeight: 480 }}>
      <div style={{ padding: '0.9rem 1.15rem', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: GOLD, display: 'flex' }}><IconChat s={20} /></span>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: 'var(--ink)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>{roomLabel}</p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--sage)' }}>Private to founding {role}s · threaded</p>
          </div>
        </div>
        <button onClick={() => composerRef.current?.focus()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem', fontWeight: 700, color: GOLD, background: GOLD_SOFT, border: `1px solid ${GOLD_LINE}`, borderRadius: '999px', padding: '0.4rem 0.8rem' }}><IconPlus /> New thread</button>
      </div>

      <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start', padding: '0.7rem 1.15rem', background: GOLD_SOFT, borderBottom: `1px solid ${GOLD_LINE}` }}>
        <span style={{ color: GOLD, display: 'flex', marginTop: 1 }}><IconPin /></span>
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--slate)' }}>
          <strong style={{ color: GOLD }}>Pinned by Ben</strong> — Welcome to the founders' space. New resources are on the way, and early-access listings appear 3 days before they go public. This room is yours.
        </p>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0.35rem 1.15rem' }}>
        {threads.map((m, i) => (
          <div key={m.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--hairline)' }}>
            <Thread msg={m} onReact={react} onReply={reply} />
          </div>
        ))}
      </div>

      <form onSubmit={startThread} style={{ padding: '0.8rem 1.15rem', borderTop: '1px solid var(--hairline)', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <input ref={composerRef} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Start a new thread…" style={{ flex: 1, fontSize: '0.87rem', padding: '0.7rem 1rem', borderRadius: '999px', border: '1px solid var(--hairline)', background: 'rgba(255,255,255,0.85)', outline: 'none' }} />
        <button type="submit" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', background: GOLD, borderRadius: '999px', padding: '0.7rem 1.25rem' }}>Post</button>
      </form>
    </div>
  );
}

// ── Resources ─────────────────────────────────────────────────────────────────
function Resources() {
  return (
    <div style={{ position: 'relative' }}>
      <div className="glass-card" style={{ padding: '0.9rem 1.15rem', marginBottom: '1.4rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <span style={{ color: GOLD, display: 'flex' }}><IconBook s={18} /></span>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--slate)' }}>
          <strong style={{ color: GOLD }}>Your founder library — coming soon.</strong> A preview of the playbooks, templates & guides being prepared for founders.
        </p>
      </div>

      {/* Grid is a non-interactive preview until resources are ready */}
      <div style={{ position: 'relative' }}>
        <div aria-hidden style={{ pointerEvents: 'none', userSelect: 'none', filter: 'blur(2.5px)', opacity: 0.45, display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {RESOURCES.map((grp) => (
            <div key={grp.group}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--sage)', margin: '0 0 0.75rem' }}>{grp.group}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '0.85rem' }}>
                {grp.items.map((it) => (
                  <div key={it.title} className="glass-card" style={{ padding: '1.05rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: GOLD, background: GOLD_SOFT, border: `1px solid ${GOLD_LINE}`, borderRadius: '999px', padding: '0.15rem 0.5rem' }}>{it.type}</span>
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>{it.title}</p>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--sage)', lineHeight: 1.45, flex: 1 }}>{it.desc}</p>
                    <span style={{ alignSelf: 'flex-start', marginTop: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', background: 'rgba(25,37,36,0.05)', border: '1px solid var(--hairline)', borderRadius: '999px', padding: '0.3rem 0.7rem' }}><IconLock s={12} /> Coming soon</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <ComingSoonWatermark label="COMING SOON" />

        {/* Distinct centred gate */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', padding: '1rem' }}>
          <div className="glass-card" style={{ pointerEvents: 'auto', textAlign: 'center', padding: '1.75rem 2rem', maxWidth: 380 }}>
            <div style={{ width: 52, height: 52, margin: '0 auto', borderRadius: '50%', background: 'linear-gradient(135deg, #D4A843, #B8922A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 6px 18px rgba(184,146,42,0.45)' }}>
              <IconLock s={22} />
            </div>
            <p style={{ margin: '0.9rem 0 0', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', color: 'var(--ink)' }}>Resources are coming soon</p>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: 'var(--slate)', lineHeight: 1.5 }}>
              We're preparing the founder playbooks, templates & guides. You'll be the first to get them — check back shortly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Early access — one example card showing how early-access listings appear ──
function EarlyAccess() {
  return (
    <div>
      <div className="glass-card" style={{ padding: '0.9rem 1.15rem', marginBottom: '1.2rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <span style={{ color: GOLD, display: 'flex' }}><IconClock s={18} /></span>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--slate)' }}>
          <strong style={{ color: GOLD }}>3-day head-start.</strong> Real early-access listings will appear here for founders only, 3 days before they go public. Here's an example of how they'll look.
        </p>
      </div>

      <div style={{ position: 'relative', width: 260, maxWidth: '100%' }}>
        <ListingCard listing={EXAMPLE_EARLY_LISTING} saved={false} onSave={() => {}} delay={0} onNavigate={() => {}} />
        <span style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', background: 'rgba(184,146,42,0.94)', borderRadius: '999px', padding: '0.28rem 0.6rem', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
          <FounderStar size={12} ring={false} /> Early · public in 3d
        </span>
        <span style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 2, fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--slate)', background: 'rgba(255,255,255,0.9)', borderRadius: '999px', padding: '0.24rem 0.55rem' }}>
          Example
        </span>
      </div>
    </div>
  );
}

// ── Directory — real founders only (no placeholders) ──────────────────────────
function Directory() {
  const [filter, setFilter] = useState('all');
  const founders = useQuery(api.admin.getFounderDirectory);

  const people = useMemo(() => (founders || [])
    .filter((f) => f.role === 'creator' || f.role === 'host')
    .map((f) => ({
      name: f.full_name || f.username || 'Founder',
      username: f.username || [f.city, f.region].filter(Boolean).join(', '),
      role: f.role,
      tag: f.role === 'host'
        ? ([f.city, f.region].filter(Boolean).join(', ') || 'Founding host')
        : (Array.isArray(f.niches) && f.niches.length ? f.niches.slice(0, 2).join(' · ') : 'Creator'),
      avatar_url: f.avatar_url,
    })), [founders]);

  const shown = filter === 'all' ? people : people.filter((d) => d.role === filter);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.1rem' }}>
        {[['all', 'All'], ['creator', 'Creators'], ['host', 'Hosts']].map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.4rem 0.9rem', borderRadius: '999px', background: filter === v ? GOLD : 'rgba(255,255,255,0.6)', color: filter === v ? '#fff' : 'var(--slate)', border: filter === v ? 'none' : '1px solid var(--hairline)' }}>{label}</button>
        ))}
      </div>
      {founders !== undefined && shown.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--sage)', padding: '1rem 0' }}>No founders here yet.</p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '0.85rem' }}>
        {shown.map((d, i) => (
          <div key={`${d.name}-${i}`} className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <AvatarStar name={d.name} src={d.avatar_url} size={44} founder />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</p>
              <p style={{ margin: '0.05rem 0 0', fontSize: '0.72rem', color: 'var(--sage)' }}>{d.username?.startsWith?.('@') || d.role !== 'creator' ? d.username : `@${d.username}`}</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'var(--slate)' }}>{d.tag}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Founders() {
  const { profile } = useAuth();
  const counts = useQuery(api.admin.getFounderCounts);

  const role = profile?.role === 'host' ? 'host' : 'creator';
  const used = counts?.[role] ?? (role === 'creator' ? 47 : 31);
  const spotsLeft = Math.max(0, CAP - used);
  const [tab, setTab] = useState('lounge');

  const TABS = [
    ['lounge', 'Lounge', IconChat],
    ['resources', 'Resources', IconBook],
    ['access', 'Early access', IconClock],
    ['directory', 'Directory', IconUsers],
  ];

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 1.25rem 4rem' }}>
      <style>{`
        .fnd-tools { opacity: 0; transition: opacity 140ms; }
        .fnd-thread:hover .fnd-tools { opacity: 1; }
        @media (hover: none) { .fnd-tools { opacity: 1; } }
      `}</style>

      {/* Header — brand display type, founding-star marker */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FounderStar size={26} />
            <h1 style={{ margin: 0, fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)' }}>Founders</h1>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--slate)' }}>Your lifetime founding-member space.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: GOLD, background: GOLD_SOFT, border: `1px solid ${GOLD_LINE}`, borderRadius: '999px', padding: '0.4rem 0.85rem' }}>
            <FounderStar size={15} /> Founder
          </span>
          <span style={{ fontSize: '0.74rem', color: 'var(--sage)', background: 'rgba(255,255,255,0.6)', border: '1px solid var(--hairline)', borderRadius: '999px', padding: '0.4rem 0.75rem' }}>{spotsLeft} {role} spots left</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.15rem', borderBottom: '1px solid var(--hairline)', marginBottom: '1.4rem', overflowX: 'auto' }}>
        {TABS.map(([v, label, Icon]) => (
          <button key={v} onClick={() => setTab(v)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, padding: '0.6rem 0.9rem', whiteSpace: 'nowrap', color: tab === v ? 'var(--ink)' : 'var(--sage)', borderBottom: tab === v ? `2px solid ${GOLD}` : '2px solid transparent', marginBottom: -1 }}>
            <Icon s={17} /> {label}
          </button>
        ))}
      </div>

      {tab === 'lounge' && <Lounge role={role} />}
      {tab === 'resources' && <Resources />}
      {tab === 'access' && <EarlyAccess />}
      {tab === 'directory' && <Directory />}
    </div>
  );
}
