import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import CreatorAvatar from '../components/CreatorAvatar';

/*
 * Founders — the lifetime founding-member space.
 * Access is founder-only (surfaced as a tab in their search); anyone who reaches
 * this page has already been accepted + verified, so there is no locked/claim state.
 *
 * Live: founder counts (api.admin.getFounderCounts) + directory (api.admin.getFounderDirectory).
 * Lounge: live Convex threads (api.founderLounge). Seed (until the resources backend is wired): resources
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

const QUICK_REACTIONS = ['🔥', '🙌', '❤️', '👀', '💭'];

// ── Watermark: "more coming soon" (on-brand, subtle) ──────────────────────────
function ComingSoonWatermark({ label }) {
  const { t } = useTranslation('founders');
  const row = new Array(5).fill(label ?? t('comingSoonWatermark.moreComingSoon')).join('   ·   ');
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
function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function Thread({ msg, meId, onReact, onReply, onDelete }) {
  const { t } = useTranslation('founders');
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState('');
  const canDelete = (id) => id === meId;
  return (
    <div className="fnd-thread" style={{ display: 'flex', gap: '0.75rem', padding: '0.95rem 0' }}>
      <AvatarStar name={msg.author} src={msg.avatar} founder={msg.founder} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)' }}>{msg.author}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--sage)' }}>{timeAgo(msg.created_at)}</span>
          {canDelete(msg.author_id) && <button onClick={() => onDelete(msg.id)} style={{ fontSize: '0.68rem', color: 'var(--sage)' }}>{t('thread.delete')}</button>}
        </div>
        <p style={{ margin: '0.15rem 0 0', fontSize: '0.875rem', color: 'var(--slate)', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{msg.text}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {msg.reactions?.map((r) => (
            <button key={r.e} onClick={() => onReact(msg.id, r.e)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', background: r.mine ? GOLD_SOFT : 'rgba(255,255,255,0.7)', border: `1px solid ${r.mine ? GOLD_LINE : 'var(--hairline)'}`, borderRadius: '999px', padding: '0.1rem 0.5rem', color: 'var(--slate)' }}>{r.e} <span style={{ fontWeight: 600 }}>{r.n}</span></button>
          ))}
          <div className="fnd-tools" style={{ display: 'inline-flex', gap: '0.15rem', alignItems: 'center' }}>
            {QUICK_REACTIONS.map((e) => (
              <button key={e} onClick={() => onReact(msg.id, e)} title={t('thread.reactTitle')} style={{ fontSize: '0.82rem', opacity: 0.6, padding: '0.05rem 0.15rem' }}>{e}</button>
            ))}
            {onReply && <button onClick={() => setReplying((v) => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', fontWeight: 600, color: GOLD, marginLeft: '0.2rem' }}><IconReply /> {t('thread.reply')}</button>}
          </div>
        </div>

        {msg.replies?.length > 0 && (
          <div style={{ marginTop: '0.6rem', paddingLeft: '0.85rem', borderLeft: `2px solid ${GOLD_SOFT}`, display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {msg.replies.map((r) => (
              <div key={r.id} className="fnd-thread">
                <Thread msg={{ ...r, replies: [] }} meId={meId} onReact={onReact} onDelete={onDelete} />
              </div>
            ))}
          </div>
        )}

        {replying && onReply && (
          <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onReply(msg.id, draft.trim()); setDraft(''); setReplying(false); } }} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
            <input autoFocus maxLength={2000} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('thread.replyPlaceholder')} style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem 0.75rem', borderRadius: '999px', border: '1px solid var(--hairline)', background: 'rgba(255,255,255,0.85)', outline: 'none' }} />
            <button type="submit" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', background: GOLD, borderRadius: '999px', padding: '0.5rem 0.9rem' }}>{t('thread.send')}</button>
          </form>
        )}
      </div>
    </div>
  );
}

function Lounge({ role }) {
  const { t } = useTranslation('founders');
  const { profile } = useAuth();
  const threads = useQuery(api.founderLounge.list, { room: role });
  const post = useMutation(api.founderLounge.post);
  const react = useMutation(api.founderLounge.react);
  const remove = useMutation(api.founderLounge.remove);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const composerRef = useRef(null);
  const scrollRef = useRef(null);
  const roomLabel = role === 'creator' ? t('lounge.roomLabelCreator') : t('lounge.roomLabelHost');
  const meId = profile?._id ? String(profile._id) : null;

  const run = async (fn) => {
    setError('');
    try { await fn(); } catch (e) { setError(e?.data || t('lounge.error')); }
  };

  const startThread = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    run(async () => {
      await post({ room: role, text });
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }));
    });
  };

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '68vh', minHeight: 480 }}>
      <div style={{ padding: '0.9rem 1.15rem', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: GOLD, display: 'flex' }}><IconChat s={20} /></span>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: 'var(--ink)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>{roomLabel}</p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--sage)' }}>{t('lounge.privateNotice', { rolePlural: t(`roleLabelPlural.${role}`) })}</p>
          </div>
        </div>
        <button onClick={() => composerRef.current?.focus()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem', fontWeight: 700, color: GOLD, background: GOLD_SOFT, border: `1px solid ${GOLD_LINE}`, borderRadius: '999px', padding: '0.4rem 0.8rem' }}><IconPlus /> {t('lounge.newThread')}</button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0.35rem 1.15rem' }}>
        {threads !== undefined && threads.length === 0 && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '0.5rem', padding: '1rem' }}>
            <span style={{ color: GOLD, display: 'flex' }}><IconChat s={30} /></span>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--ink)' }}>{t('lounge.emptyTitle')}</p>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--sage)', maxWidth: 320 }}>{t('lounge.emptyBody', { rolePlural: t(`roleLabelPlural.${role}`) })}</p>
          </div>
        )}
        {threads?.map((m, i) => (
          <div key={m.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--hairline)' }}>
            <Thread msg={m} meId={meId}
              onReact={(id, emoji) => run(() => react({ postId: id, emoji }))}
              onReply={(id, text) => run(() => post({ room: role, text, parentId: id }))}
              onDelete={(id) => run(() => remove({ postId: id }))} />
          </div>
        ))}
      </div>

      {error && <p style={{ margin: 0, padding: '0.4rem 1.15rem', fontSize: '0.76rem', color: '#B3402E' }}>{error}</p>}
      <form onSubmit={startThread} style={{ padding: '0.8rem 1.15rem', borderTop: '1px solid var(--hairline)', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <input ref={composerRef} maxLength={2000} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('lounge.startThreadPlaceholder')} style={{ flex: 1, fontSize: '0.87rem', padding: '0.7rem 1rem', borderRadius: '999px', border: '1px solid var(--hairline)', background: 'rgba(255,255,255,0.85)', outline: 'none' }} />
        <button type="submit" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', background: GOLD, borderRadius: '999px', padding: '0.7rem 1.25rem' }}>{t('lounge.post')}</button>
      </form>
    </div>
  );
}

// ── Resources ─────────────────────────────────────────────────────────────────
function Resources() {
  const { t } = useTranslation('founders');
  return (
    <div style={{ position: 'relative' }}>
      <div className="glass-card" style={{ padding: '0.9rem 1.15rem', marginBottom: '1.4rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <span style={{ color: GOLD, display: 'flex' }}><IconBook s={18} /></span>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--slate)' }}>
          <strong style={{ color: GOLD }}>{t('resources.libraryHeading')}</strong> {t('resources.libraryBody')}
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
                    <span style={{ alignSelf: 'flex-start', marginTop: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', background: 'rgba(25,37,36,0.05)', border: '1px solid var(--hairline)', borderRadius: '999px', padding: '0.3rem 0.7rem' }}><IconLock s={12} /> {t('resources.comingSoonBadge')}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <ComingSoonWatermark label={t('comingSoonWatermark.comingSoon')} />

        {/* Distinct centred gate */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', padding: '1rem' }}>
          <div className="glass-card" style={{ pointerEvents: 'auto', textAlign: 'center', padding: '1.75rem 2rem', maxWidth: 380 }}>
            <div style={{ width: 52, height: 52, margin: '0 auto', borderRadius: '50%', background: 'linear-gradient(135deg, #D4A843, #B8922A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 6px 18px rgba(184,146,42,0.45)' }}>
              <IconLock s={22} />
            </div>
            <p style={{ margin: '0.9rem 0 0', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', color: 'var(--ink)' }}>{t('resources.gateHeading')}</p>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: 'var(--slate)', lineHeight: 1.5 }}>
              {t('resources.gateBody')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Early access — blurred preview until real curated listings exist ─────────
function EarlyAccess() {
  const { t } = useTranslation('founders');
  return (
    <div style={{ position: 'relative', minHeight: 360 }}>
      <div aria-hidden style={{ pointerEvents: 'none', userSelect: 'none', filter: 'blur(6px)', opacity: 0.45, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '1rem' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ height: 170, background: 'linear-gradient(135deg, rgba(212,168,67,0.35), rgba(25,37,36,0.12))' }} />
            <div style={{ padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ height: 12, width: '70%', borderRadius: 6, background: 'rgba(25,37,36,0.18)' }} />
              <div style={{ height: 10, width: '45%', borderRadius: 6, background: 'rgba(25,37,36,0.12)' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: '1.75rem 2rem', maxWidth: 400 }}>
          <div style={{ width: 52, height: 52, margin: '0 auto', borderRadius: '50%', background: 'linear-gradient(135deg, #D4A843, #B8922A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 6px 18px rgba(184,146,42,0.45)' }}>
            <IconClock s={22} />
          </div>
          <p style={{ margin: '0.9rem 0 0', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', color: 'var(--ink)' }}>{t('earlyAccess.gateHeading')}</p>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: 'var(--slate)', lineHeight: 1.5 }}>{t('earlyAccess.gateBody')}</p>
        </div>
      </div>
    </div>
  );
}

// ── Directory — real founders only (no placeholders) ──────────────────────────
function Directory() {
  const { t } = useTranslation('founders');
  const [filter, setFilter] = useState('all');
  const founders = useQuery(api.admin.getFounderDirectory);

  const people = useMemo(() => (founders || [])
    .filter((f) => f.role === 'creator' || f.role === 'host')
    .map((f) => ({
      name: f.full_name || f.username || t('directory.fallbackName'),
      username: f.username || [f.city, f.region].filter(Boolean).join(', '),
      role: f.role,
      tag: f.role === 'host'
        ? ([f.city, f.region].filter(Boolean).join(', ') || t('directory.fallbackTagHost'))
        : (Array.isArray(f.niches) && f.niches.length ? f.niches.slice(0, 2).join(' · ') : t('directory.fallbackTagCreator')),
      avatar_url: f.avatar_url,
    })), [founders, t]);

  const shown = filter === 'all' ? people : people.filter((d) => d.role === filter);

  const FILTERS = [['all', t('directory.filterAll')], ['creator', t('directory.filterCreators')], ['host', t('directory.filterHosts')]];

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.1rem' }}>
        {FILTERS.map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.4rem 0.9rem', borderRadius: '999px', background: filter === v ? GOLD : 'rgba(255,255,255,0.6)', color: filter === v ? '#fff' : 'var(--slate)', border: filter === v ? 'none' : '1px solid var(--hairline)' }}>{label}</button>
        ))}
      </div>
      {founders !== undefined && shown.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--sage)', padding: '1rem 0' }}>{t('directory.noneYet')}</p>
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
  const { t } = useTranslation('founders');
  const { profile } = useAuth();
  const counts = useQuery(api.admin.getFounderCounts);

  const role = profile?.role === 'host' ? 'host' : 'creator';
  const used = counts?.[role] ?? (role === 'creator' ? 47 : 31);
  const spotsLeft = Math.max(0, CAP - used);
  const [tab, setTab] = useState('lounge');

  const TABS = [
    ['lounge', t('tabs.lounge'), IconChat],
    ['resources', t('tabs.resources'), IconBook],
    ['access', t('tabs.access'), IconClock],
    ['directory', t('tabs.directory'), IconUsers],
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
            <h1 style={{ margin: 0, fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)' }}>{t('header.title')}</h1>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--slate)' }}>{t('header.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: GOLD, background: GOLD_SOFT, border: `1px solid ${GOLD_LINE}`, borderRadius: '999px', padding: '0.4rem 0.85rem' }}>
            <FounderStar size={15} /> {t('header.founderBadge')}
          </span>
          <span style={{ fontSize: '0.74rem', color: 'var(--sage)', background: 'rgba(255,255,255,0.6)', border: '1px solid var(--hairline)', borderRadius: '999px', padding: '0.4rem 0.75rem' }}>{t('header.spotsLeft', { count: spotsLeft, role: t(`roleLabel.${role}`) })}</span>
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
