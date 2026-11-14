import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import collabnbLogo from '../assets/collabnb-logo.png';

const C = {
  bg: '#F4F8F3', mint: '#D1EBDB', mintSoft: '#E8F4EC', green: '#3F6B52', greenDeep: '#2F5440',
  ink: '#192524', slate: '#3C5759', sage: '#646B62', line: '#E1EADF', white: '#FFFFFF', red: '#B5544B', amber: '#B7862F',
};
const SEV = { high: C.red, medium: C.amber, good: C.green };
const SEV_LABEL = { high: 'Gap', medium: 'Watch', good: 'Strength' };
const WHATSAPP = 'https://wa.me/16232212170';

// Same figures and sources as collabnb.com/how-it-works.
const CREATOR_STATS = [
  ['73%', 'of travelers say influencer recommendations have shaped a trip or booking decision', 'Expedia Group, Traveler Value Index 2025'],
  ['61%', 'of travelers now find trip inspiration on social media, up from 35% in 2022', 'Expedia Group, Traveler Value Index 2025'],
  ['$5.78', 'average return for every $1 spent on influencer marketing', 'Influencer Marketing Hub, Benchmark Report 2026'],
  ['74%', 'of consumers say they trust influencer product recommendations', 'Sprout Social, Consumer Behavior Survey 2026'],
];

export default function HotelAudit() {
  const { token } = useParams();
  const [params] = useSearchParams();
  const data = useQuery(api.autoOutreach.getAudit, token ? { token } : 'skip');
  const requestBuild = useMutation(api.autoOutreach.requestBuild);
  const markViewed = useMutation(api.autoOutreach.markViewed);
  const [building, setBuilding] = useState(false);
  const autoStarted = useRef(false);
  useEffect(() => { try { sessionStorage.setItem('cb_quiet', '1'); } catch {} }, []);

  const start = () => { setBuilding(true); requestBuild({ token }).catch(() => {}); };

  // Mail scanners load links in a real browser, so ?build=1 only scrolls to the
  // button; a build needs a human tap. An in-progress build still resumes.
  const ctaRef = useRef(null);
  const wantsBuild = params.get('build') === '1';
  useEffect(() => {
    if (!data || autoStarted.current) return;
    autoStarted.current = true;
    markViewed({ token }).catch(() => {});
    if (data.build.claim_token) return;
    if (data.build.step > 0 && !data.build.error) start();
    else if (wantsBuild) setTimeout(() => ctaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (data === undefined) return <Shell><p style={muted}>Loading your audit…</p></Shell>;
  if (data === null) return <Shell><p style={muted}>This audit isn't available. Reach us at hellocollabnb@gmail.com.</p></Shell>;

  if (building) return <Builder data={data} retry={start} />;

  const a = data.audit;
  const built = !!data.build.claim_token;
  const stats = [
    ['Followers', a.followers?.toLocaleString()],
    ['Avg engagement', `${a.engagement}%`],
    ['Posts in last 30 days', a.posts_last_30],
    [`Reels in last ${a.posts_analyzed}`, a.reels],
  ];

  return (
    <Shell>
      <section style={{ textAlign: 'center', padding: '2.25rem 0 1.5rem' }}>
        {a.avatar && <img src={a.avatar} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${C.white}`, boxShadow: '0 6px 18px -8px rgba(25,37,36,.35)' }} />}
        <div style={{ ...pill, marginTop: '0.9rem' }}>Instagram audit · @{a.handle}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.9rem,6vw,2.8rem)', lineHeight: 1.1, color: C.ink, margin: '0.9rem 0 0.6rem', letterSpacing: '-0.02em' }}>
          How {data.hotel_name} shows up on Instagram
        </h1>
        <p style={{ color: C.slate, fontSize: '1rem', lineHeight: 1.6, maxWidth: 520, margin: '0 auto' }}>
          Based on your last {a.posts_analyzed} posts, pulled {new Date(a.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
        {stats.map(([k, val]) => (
          <div key={k} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 14, padding: '1rem' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: C.ink }}>{val ?? '—'}</div>
            <div style={{ fontSize: '0.8rem', color: C.sage, marginTop: 2 }}>{k}</div>
          </div>
        ))}
      </div>

      <Label>What we found</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(a.findings || []).map((f, i) => (
          <div key={i} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: '1rem 1.1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: SEV[f.severity] || C.sage }}>{SEV_LABEL[f.severity] || 'Note'}</div>
            <div style={{ fontWeight: 700, color: C.ink, margin: '0.2rem 0 0.3rem' }}>{f.title}</div>
            <div style={{ color: C.slate, lineHeight: 1.55, fontSize: '0.95rem' }}>{f.detail}</div>
          </div>
        ))}
      </div>

      {a.best_post_url && (
        <p style={{ color: C.slate, fontSize: '0.9rem', margin: '0.9rem 0 0' }}>
          Your strongest recent post: <a href={a.best_post_url} target="_blank" rel="noreferrer" style={{ color: C.green, fontWeight: 600 }}>view on Instagram</a>
        </p>
      )}

      <Label>Why creator content works</Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
        {CREATOR_STATS.map(([n, label, src]) => (
          <div key={n} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 14, padding: '1rem 1.1rem' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: C.ink }}>{n}</div>
            <div style={{ color: C.slate, lineHeight: 1.45, fontSize: '0.9rem', margin: '0.2rem 0 0.4rem' }}>{label}</div>
            <div style={{ fontSize: '0.72rem', color: C.sage }}>{src}</div>
          </div>
        ))}
      </div>

      <section ref={ctaRef} style={{ background: C.white, border: `${wantsBuild && !built ? 2 : 1}px solid ${wantsBuild && !built ? C.green : C.line}`, borderRadius: 20, padding: '1.75rem 1.4rem', textAlign: 'center', margin: '2rem 0 1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: C.ink, margin: '0 0 0.5rem' }}>
          {built ? 'Your Collabnb listing is ready' : 'Close these gaps with creator content'}
        </h2>
        <p style={{ color: C.slate, lineHeight: 1.6, margin: '0 auto 1.2rem', maxWidth: 460 }}>
          Collabnb connects boutique stays with pre-vetted creators who make Reels and photos in exchange for a stay. We'll build your listing from your feed in about a minute. It's free for Founding Hosts, and nothing goes live until you publish.
        </p>
        {built
          ? <a href={`/claim/${data.build.claim_token}?go=1`} style={cta}>Open my listing →</a>
          : <button onClick={start} style={{ ...cta, border: 'none', cursor: 'pointer', font: 'inherit', fontWeight: 700 }}>Build my listing →</button>}
        <p style={{ color: C.sage, fontSize: '0.85rem', marginTop: '0.9rem' }}>
          Questions? WhatsApp Benjamin on <a href={WHATSAPP} style={{ color: C.green, fontWeight: 600 }}>+1 623-221-2170</a>
        </p>
      </section>
    </Shell>
  );
}

// ─── Build loading screen ────────────────────────────────────────────────────
const STEPS = [
  { title: 'Picking your best photos', done: 2 },
  { title: 'Writing your listing', sub: 'About, perks and vibe', done: 3 },
  { title: 'Drafting your creator brief', sub: 'Built around the gaps in your audit', done: 3 },
  { title: 'Setting up your Founding Host account', sub: 'No password needed', done: 4 },
];
const TIPS = [
  'Free for Founding Hosts',
  'Nothing goes live until you publish',
  "You'll be signed in automatically, no password",
  "All that's left is what you'd offer creators on top of the stay",
  'Pre-vetted creators are already on Collabnb',
];

export function Builder({ data, retry, opening = false }) {
  const navigate = useNavigate();
  const { build, audit: a, hotel_name } = data;
  // Rows tick over at most every 900ms so fast server steps still read clearly.
  const target = STEPS.filter((s) => build.step >= s.done).length;
  const [shown, setShown] = useState(opening ? STEPS.length : 0);
  const [tip, setTip] = useState(0);
  const [creep, setCreep] = useState(0);

  useEffect(() => {
    if (shown >= target) return;
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 500 : 900);
    return () => clearTimeout(t);
  }, [shown, target]);
  useEffect(() => {
    const t = setInterval(() => setTip((n) => (n + 1) % TIPS.length), 3500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    setCreep(0);
    const t = setInterval(() => setCreep((c) => Math.min(0.85, c + 0.03)), 400);
    return () => clearInterval(t);
  }, [shown]);

  const done = shown >= STEPS.length && !!build.claim_token;
  // Same screen carries over into the claim sign-in, so it reads as one page.
  const openListing = (e) => {
    e.preventDefault();
    try { sessionStorage.setItem(`cb_build_${build.claim_token}`, JSON.stringify({ build, audit: { avatar: a.avatar, handle: a.handle }, hotel_name })); } catch {}
    navigate(`/claim/${build.claim_token}?go=1`);
  };

  const pct = done ? 100 : Math.min(97, ((shown + (build.error ? 0 : creep)) / STEPS.length) * 100);
  const photos = build.photos || [];

  return (
    <div className="cb-build" style={{ minHeight: '100vh', background: `radial-gradient(1200px 600px at 50% -10%, ${C.mint} 0%, ${C.bg} 55%)`, padding: '0 16px 3rem' }}>
      <style>{BUILD_CSS}</style>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <header style={{ padding: '1.25rem 0', display: 'flex', justifyContent: 'center' }}>
          <img src={collabnbLogo} alt="Collabnb" style={{ height: 26 }} />
        </header>

        <div style={{ textAlign: 'center', padding: '1.5rem 0 1.25rem' }}>
          <div className={`cb-avatar ${done ? 'is-done' : build.error ? '' : 'is-spinning'}`}>
            {a.avatar ? <img src={a.avatar} alt="" /> : <span>{hotel_name.slice(0, 1)}</span>}
            {done && <div className="cb-badge">✓</div>}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem,5.5vw,2.2rem)', lineHeight: 1.15, color: C.ink, margin: '1.2rem 0 0.4rem', letterSpacing: '-0.02em' }}>
            {build.error ? 'We hit a snag' : done ? 'Your listing is ready' : <>Building {hotel_name}'s listing</>}
          </h1>
          <p style={{ color: C.slate, margin: 0 }}>
            {build.error ? "Something went wrong on our side. Your audit is safe." : done ? (opening ? 'Opening your listing…' : 'Everything is set. Have a look whenever you’re ready.') : <>Pulling from @{a.handle}. This takes about a minute.</>}
          </p>
        </div>

        <div style={{ height: 6, background: C.white, borderRadius: 99, overflow: 'hidden', boxShadow: `inset 0 0 0 1px ${C.line}` }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${C.green}, #5C9474)`, borderRadius: 99, transition: 'width 600ms cubic-bezier(.2,.8,.2,1)' }} />
        </div>

        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 18, padding: '0.5rem 1.1rem', marginTop: '1.1rem', boxShadow: '0 20px 40px -24px rgba(25,37,36,.25)' }}>
          {STEPS.map((s, i) => {
            const state = i < shown ? 'done' : i === shown && !build.error && !done ? 'active' : 'todo';
            const sub = i === 0 ? (photos.length ? `${photos.length} of 8 from your feed` : 'From your Instagram feed') : s.sub;
            return (
              <div key={s.title} className={`cb-row is-${state}`}>
                <div className="cb-dot">{state === 'done' ? '✓' : state === 'active' ? <span className="cb-spin" /> : null}</div>
                <div>
                  <div style={{ fontWeight: 600, color: state === 'todo' ? C.sage : C.ink }}>{s.title}</div>
                  <div style={{ fontSize: '0.82rem', color: C.sage, marginTop: 1 }}>{sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: '1.1rem' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            photos[i]
              ? <img key={photos[i]} src={photos[i]} alt="" decoding="async" className="cb-tile cb-shimmer" onLoad={(e) => e.currentTarget.classList.replace('cb-shimmer', 'cb-in')} />
              : <div key={`e${i}`} className={`cb-tile ${build.error ? '' : 'cb-shimmer'}`} />
          ))}
        </div>

        {build.ideas?.length > 0 && !build.error && (
          <div className="cb-in" style={{ background: C.mintSoft, borderRadius: 14, padding: '0.9rem 1rem', marginTop: '1.1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.green, marginBottom: 6 }}>Your creator brief</div>
            {build.ideas.map((x, i) => <div key={i} style={{ color: C.ink, fontSize: '0.9rem', lineHeight: 1.5 }}>· {x}</div>)}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.4rem', minHeight: 48 }}>
          {build.error ? (
            <>
              <button onClick={retry} style={{ ...cta, border: 'none', cursor: 'pointer', font: 'inherit', fontWeight: 700 }}>Try again</button>
              <p style={{ color: C.sage, fontSize: '0.85rem', marginTop: '0.8rem' }}>Or WhatsApp Benjamin on <a href={WHATSAPP} style={{ color: C.green, fontWeight: 600 }}>+1 623-221-2170</a> and he'll set it up for you.</p>
            </>
          ) : done ? (
            opening
              ? <p style={{ color: C.slate, fontSize: '0.92rem', margin: 0 }}><span className="cb-spin" style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 8 }} />Signing you in…</p>
              : <a href={`/claim/${build.claim_token}?go=1`} onClick={openListing} style={cta}>Open my listing →</a>
          ) : (
            <p key={tip} className="cb-tip" style={{ color: C.slate, fontSize: '0.92rem', margin: 0 }}>{TIPS[tip]}</p>
          )}
        </div>
      </div>
    </div>
  );
}

const BUILD_CSS = `
.cb-avatar{position:relative;width:96px;height:96px;margin:0 auto;border-radius:50%;padding:4px;background:${C.line}}
.cb-avatar.is-spinning{background:conic-gradient(${C.green} 0 25%, ${C.mint} 25% 100%);animation:cb-rot 1.1s linear infinite}
.cb-avatar.is-done{background:${C.green};transition:background .4s}
.cb-avatar img,.cb-avatar span{width:100%;height:100%;border-radius:50%;object-fit:cover;display:flex;align-items:center;justify-content:center;background:${C.white};border:3px solid ${C.white};box-sizing:border-box;font-size:2rem;font-weight:700;color:${C.green}}
.cb-avatar.is-spinning img,.cb-avatar.is-spinning span{animation:cb-rot 1.1s linear infinite reverse}
.cb-badge{position:absolute;right:-2px;bottom:-2px;width:30px;height:30px;border-radius:50%;background:${C.green};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;border:3px solid ${C.bg};animation:cb-pop .45s cubic-bezier(.2,1.4,.4,1)}
.cb-row{display:flex;gap:.85rem;align-items:center;padding:.8rem 0;border-bottom:1px solid ${C.line};transition:opacity .3s}
.cb-row:last-child{border-bottom:none}
.cb-row.is-todo{opacity:.55}
.cb-dot{flex:none;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;border:2px solid ${C.line};color:#fff;transition:all .35s}
.cb-row.is-done .cb-dot{background:${C.green};border-color:${C.green};animation:cb-pop .4s cubic-bezier(.2,1.4,.4,1)}
.cb-row.is-active .cb-dot{border-color:${C.mint}}
.cb-spin{width:14px;height:14px;border-radius:50%;border:2px solid ${C.mint};border-top-color:${C.green};animation:cb-rot .8s linear infinite}
.cb-tile{width:100%;aspect-ratio:1;border-radius:10px;object-fit:cover;background:${C.white};border:1px solid ${C.line};box-sizing:border-box}
.cb-shimmer{background:linear-gradient(100deg,${C.white} 30%,${C.mintSoft} 50%,${C.white} 70%);background-size:300% 100%;animation:cb-sh 1.6s ease-in-out infinite}
.cb-in{animation:cb-fade .5s cubic-bezier(.2,.8,.2,1) both}
.cb-tip{animation:cb-fade .5s ease both}
@keyframes cb-rot{to{transform:rotate(360deg)}}
@keyframes cb-pop{0%{transform:scale(.4)}100%{transform:scale(1)}}
@keyframes cb-sh{0%{background-position:100% 0}100%{background-position:0 0}}
@keyframes cb-fade{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.cb-build *{animation:none!important;transition:none!important}}
`;

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '0 16px 3rem' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <header style={{ padding: '1.25rem 0', display: 'flex', justifyContent: 'center' }}>
          <a href="https://collabnb.com"><img src={collabnbLogo} alt="Collabnb" style={{ height: 28 }} /></a>
        </header>
        {children}
      </div>
    </div>
  );
}

function Label({ children }) {
  return <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.sage, margin: '2rem 0 0.75rem' }}>{children}</h3>;
}

const muted = { color: C.sage, textAlign: 'center', padding: '4rem 0' };
const pill = { display: 'inline-block', background: C.mint, color: C.green, fontWeight: 600, fontSize: '0.8rem', padding: '0.35rem 0.85rem', borderRadius: 999 };
const cta = { display: 'inline-block', background: C.green, color: C.white, fontWeight: 700, padding: '0.9rem 1.8rem', borderRadius: 999, textDecoration: 'none' };
