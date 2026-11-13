import { useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import collabnbLogo from '../assets/collabnb-logo.png';

const C = {
  bg: '#F4F8F3', mint: '#D1EBDB', mintSoft: '#E8F4EC', green: '#3F6B52',
  ink: '#192524', slate: '#3C5759', sage: '#646B62', line: '#E1EADF', white: '#FFFFFF', red: '#B5544B', amber: '#B7862F',
};
const SEV = { high: C.red, medium: C.amber, good: C.green };
const SEV_LABEL = { high: 'Gap', medium: 'Watch', good: 'Strength' };

export default function HotelAudit() {
  const { token } = useParams();
  const data = useQuery(api.autoOutreach.getAudit, token ? { token } : 'skip');

  if (data === undefined) return <Shell><p style={muted}>Loading your audit…</p></Shell>;
  if (data === null) return <Shell><p style={muted}>This audit isn't available. Reach us at hellocollabnb@gmail.com.</p></Shell>;

  const a = data.audit;
  const claimUrl = `/claim/${token}?go=1`;
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
          <div key={i} style={{ background: C.white, border: `1px solid ${C.line}`, borderLeft: `4px solid ${SEV[f.severity] || C.sage}`, borderRadius: 12, padding: '1rem 1.1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: SEV[f.severity] || C.sage }}>{SEV_LABEL[f.severity] || 'Note'}</div>
            <div style={{ fontWeight: 700, color: C.ink, margin: '0.2rem 0 0.3rem' }}>{f.title}</div>
            <div style={{ color: C.slate, lineHeight: 1.55, fontSize: '0.95rem' }}>{f.detail}</div>
          </div>
        ))}
      </div>

      {a.ideas?.length > 0 && (
        <>
          <Label>3 creator content ideas for {data.hotel_name}</Label>
          <ol style={{ background: C.mintSoft, borderRadius: 14, padding: '1rem 1.25rem 1rem 2.4rem', margin: 0, color: C.ink, lineHeight: 1.6 }}>
            {a.ideas.map((x, i) => <li key={i} style={{ marginBottom: 6 }}>{x}</li>)}
          </ol>
        </>
      )}

      {a.photos?.length > 0 && (
        <>
          <Label>Your feed, already on your draft listing</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {a.photos.slice(0, 6).map((src) => (
              <img key={src} src={src} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10, background: C.mint }} />
            ))}
          </div>
        </>
      )}

      <section style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 20, padding: '1.75rem 1.4rem', textAlign: 'center', margin: '2rem 0 1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: C.ink, margin: '0 0 0.5rem' }}>
          {data.claimed ? 'Your listing is live on Collabnb' : 'Your Collabnb listing is already built'}
        </h2>
        <p style={{ color: C.slate, lineHeight: 1.6, margin: '0 auto 1.2rem', maxWidth: 460 }}>
          Pre-vetted creators make the Reels and photos, and you host them for a stay. It's free for Founding Hosts and takes under 5 minutes, and nothing goes live until you publish.
        </p>
        <a href={claimUrl} style={cta}>{data.claimed ? 'Open my dashboard →' : 'Open my draft listing →'}</a>
        <p style={{ color: C.sage, fontSize: '0.85rem', marginTop: '0.9rem' }}>
          Questions? WhatsApp Benjamin on <a href="https://wa.me/16232212170" style={{ color: C.green, fontWeight: 600 }}>+1 623-221-2170</a>
        </p>
      </section>
    </Shell>
  );
}

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
