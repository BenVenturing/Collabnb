import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  buildHostContext, scoreCreators,
  WEIGHTS, NEW_CREATOR_WINDOW_DAYS,
} from '../../lib/creatorScore';
import { INK, SLATE, SAGE, MINT, AvatarBubble, Chip, Card, SectionLabel, PartBar } from './algoLabUI';

function scoreColor(score) {
  if (score >= 70) return { bg: MINT, color: '#166534' };
  if (score >= 45) return { bg: 'rgba(25,37,36,0.07)', color: SLATE };
  return { bg: 'rgba(220,38,38,0.08)', color: '#b45309' };
}

// ─── Simulator ────────────────────────────────────────────────────────────────
function Simulator() {
  const profiles = useQuery(api.profiles.getAll);
  const realCreators = useQuery(api.profiles.listPublicCreators);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const selectedHost = profiles?.find((p) => String(p._id) === selectedId) || null;

  const { hostCtx, ranked } = useMemo(() => {
    if (!selectedHost) return { hostCtx: null, ranked: [] };
    const hostCtx = buildHostContext(selectedHost);
    const ranked = scoreCreators(realCreators || [], hostCtx)
      .sort((a, b) => b._score - a._score || (b.followers ?? 0) - (a.followers ?? 0));
    return { hostCtx, ranked };
  }, [selectedHost, realCreators]);

  const matches = (p) => {
    const q = search.toLowerCase();
    return [p.full_name, p.username, p.email, p.city, p.region]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  };
  const candidates = (profiles || [])
    .filter((p) => p.role === 'host' || search.length > 0)
    .filter((p) => !search || matches(p))
    .slice(0, 8);

  if (profiles === undefined || realCreators === undefined) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem' }}>Loading…</div>;
  }

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 980 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Creator Algorithm Simulator
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        Pick a host and see the Creators tab exactly as the ranking engine computes it — same code the app runs.
      </p>

      {/* ── Host picker ── */}
      <Card style={{ marginBottom: '1rem' }}>
        <SectionLabel>Run as host</SectionLabel>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, username, email, or city…"
          style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: '0.75rem', border: '1px solid rgba(25,37,36,0.12)', background: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', color: INK, outline: 'none', fontFamily: 'Satoshi, sans-serif', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: '0.6rem' }}>
          {candidates.map((p) => {
            const active = String(p._id) === selectedId;
            return (
              <button
                key={String(p._id)}
                onClick={() => setSelectedId(active ? null : String(p._id))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
                  padding: '0.45rem 0.6rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer',
                  background: active ? MINT : 'transparent', textAlign: 'left',
                  transition: 'background 0.12s', fontFamily: 'Satoshi, sans-serif',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(25,37,36,0.04)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <AvatarBubble profile={p} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: INK }}>{p.full_name || p.username}</span>
                  <span style={{ fontSize: '0.7rem', color: SAGE, marginLeft: 8 }}>
                    {[p.city, p.region].filter(Boolean).join(', ') || 'no location'} · {p.email}
                  </span>
                </span>
                <Chip>{p.role || '—'}</Chip>
              </button>
            );
          })}
          {candidates.length === 0 && (
            <p style={{ fontSize: '0.78rem', color: SAGE, margin: '0.4rem 0 0' }}>No profiles match.</p>
          )}
        </div>
      </Card>

      {selectedHost && hostCtx && (
        <>
          {/* ── Signals the engine sees ── */}
          <Card style={{ marginBottom: '1rem' }}>
            <SectionLabel>Signals for {selectedHost.full_name || selectedHost.username}</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.9rem', fontSize: '0.78rem', color: SLATE }}>
              <div>
                <strong style={{ color: INK }}>Home:</strong>{' '}
                {[selectedHost.city, selectedHost.region, selectedHost.country].filter(Boolean).join(', ') || <em style={{ color: '#b45309' }}>not set — proximity scoring falls to baseline for everyone</em>}
              </div>
              <div>
                <strong style={{ color: INK }}>Real creators in pool:</strong> {realCreators.length}
              </div>
            </div>
          </Card>

          {/* ── Ranked feed ── */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <SectionLabel>Their Creators feed — {ranked.length} creators ranked</SectionLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Chip bg={MINT} color="#166534">joined ≤{NEW_CREATOR_WINDOW_DAYS}d ago gets full recency boost</Chip>
              </div>
            </div>
            <div style={{ maxHeight: 520, overflowY: 'auto', marginTop: '0.4rem' }}>
              {ranked.map((c, i) => {
                const sc = scoreColor(c._score);
                return (
                  <div key={c.id} style={{ display: 'flex', gap: '0.9rem', alignItems: 'center', padding: '0.65rem 0.25rem', borderTop: i === 0 ? 'none' : '1px solid rgba(25,37,36,0.06)' }}>
                    <span style={{ fontSize: '0.7rem', color: SAGE, width: 22, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                    <AvatarBubble profile={c} />
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '0.6rem', background: sc.bg, color: sc.color, flexShrink: 0, width: 46, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                      {c._score}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.83rem', fontWeight: 600, color: INK, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.name} <span style={{ fontWeight: 400, color: SAGE }}>· {c.location || 'no location'}</span>
                      </p>
                      <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                        {c.tier && <Chip bg={MINT} color="#166534">{c.tier}</Chip>}
                        {c._scoreMeta.daysSinceJoin != null && c._scoreMeta.daysSinceJoin <= NEW_CREATOR_WINDOW_DAYS && (
                          <Chip bg="rgba(25,37,36,0.85)" color="#F7F5F2">New · {c._scoreMeta.daysSinceJoin}d</Chip>
                        )}
                        {c._scoreReasons?.length > 0 && <span style={{ fontSize: '0.66rem', color: SAGE, alignSelf: 'center' }}>{c._scoreReasons.join(' · ')}</span>}
                      </div>
                    </div>
                    <div style={{ width: 190, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <PartBar label="prox" value={c._scoreParts.proximity} weight={WEIGHTS.proximity} />
                      <PartBar label="win%" value={c._scoreParts.success}   weight={WEIGHTS.success} />
                      <PartBar label="new"  value={c._scoreParts.recency}   weight={WEIGHTS.recency} />
                    </div>
                  </div>
                );
              })}
              {ranked.length === 0 && <p style={{ fontSize: '0.8rem', color: SAGE }}>No verified creators to rank yet.</p>}
            </div>
            <p style={{ fontSize: '0.7rem', color: SAGE, margin: '0.75rem 0 0' }}>
              In the app, this only drives the "Recommended" sort option — picking Most Followers / Highest Engagement / Most Collabs on the Creators tab always overrides personalization, same as Explore search.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Reference ────────────────────────────────────────────────────────────────
function Reference() {
  const th = { textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0.35rem 0.75rem 0.35rem 0' };
  const td = { fontSize: '0.8rem', color: SLATE, padding: '0.35rem 0.75rem 0.35rem 0', borderTop: '1px solid rgba(25,37,36,0.06)', verticalAlign: 'top' };

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 860 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        How the Creators Algorithm Works
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        Values below are read live from <code style={{ background: 'rgba(25,37,36,0.06)', padding: '0.05rem 0.35rem', borderRadius: 6, fontSize: '0.78rem' }}>app/src/lib/creatorScore.js</code> — this panel can never drift from the code. Full write-up: <code style={{ background: 'rgba(25,37,36,0.06)', padding: '0.05rem 0.35rem', borderRadius: 6, fontSize: '0.78rem' }}>creator-algorithm.md</code> at the project root.
      </p>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionLabel>The formula</SectionLabel>
        <p style={{ fontSize: '0.95rem', color: INK, fontWeight: 600, margin: '0 0 0.75rem', fontFamily: 'monospace' }}>
          score = ({WEIGHTS.proximity} × proximity + {WEIGHTS.success} × success rate + {WEIGHTS.recency} × new-creator boost) × 100
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip>Drives the "Recommended" sort only — nothing is ever hidden</Chip>
          <Chip>An explicit sort choice (Followers/Engagement/Collabs) always overrides this</Chip>
        </div>
      </Card>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionLabel>1 · Proximity to the host — {Math.round(WEIGHTS.proximity * 100)}% of the score</SectionLabel>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr><th style={th}>Best matching rule wins</th><th style={th}>Sub-score</th></tr></thead>
          <tbody>
            <tr><td style={td}>Creator lives in the host's home city</td><td style={td}>1.00</td></tr>
            <tr><td style={td}>Creator lives in the host's home state/region (US names ↔ abbreviations handled)</td><td style={td}>0.85</td></tr>
            <tr><td style={td}>Creator lives in the host's home country</td><td style={td}>0.55</td></tr>
            <tr><td style={td}>Anywhere else — nothing is ever hidden, just ranked lower</td><td style={td}>0.25</td></tr>
          </tbody>
        </table>
        <p style={{ fontSize: '0.75rem', color: SAGE, margin: '0.6rem 0 0' }}>
          Uses the host's own saved profile location today (not a specific listing/trip location). Ranks by state before city precision matters most, per how this was scoped.
        </p>
      </Card>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionLabel>2 · Success rate — {Math.round(WEIGHTS.success * 100)}% of the score</SectionLabel>
        <p style={{ fontSize: '0.8rem', color: SLATE, margin: '0 0 0.6rem', lineHeight: 1.55 }}>
          Completed ÷ total collaborations, computed live from the collaborations table (a collab counts as a win if its status is <code>completed</code> or <code>approved</code>). A creator with zero collabs scores a neutral 0.5 — no history isn't a strike against them.
          Sample/demo creators have no tracked collab records, so they're approximated from their existing follower-profile fields instead (0.9 if flagged as a past collaborator, 0.7 otherwise, 0.5 with none).
        </p>
      </Card>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionLabel>3 · New-creator boost — {Math.round(WEIGHTS.recency * 100)}% of the score</SectionLabel>
        <p style={{ fontSize: '0.8rem', color: SLATE, margin: 0, lineHeight: 1.55 }}>
          Full boost (1.0) for a creator's first <strong>{NEW_CREATOR_WINDOW_DAYS} days</strong> after joining (using Convex's built-in creation timestamp — no extra field to maintain), then it cuts to 0. Flat, not a gradual taper — there's no separate "Featured" category, this only nudges ranking for that window.
        </p>
      </Card>

      <Card>
        <SectionLabel>Guarantees</SectionLabel>
        <ul style={{ fontSize: '0.8rem', color: SLATE, margin: 0, paddingLeft: '1.1rem', lineHeight: 1.7 }}>
          <li>Nothing is ever hidden — every verified, visible creator appears; scores only reorder.</li>
          <li>Choosing an explicit sort (Followers / Engagement / Collabs) always overrides this ranking.</li>
          <li>All scoring is computed client-side on load from data already fetched — nothing extra is stored.</li>
        </ul>
      </Card>
    </div>
  );
}

export default function CreatorAlgorithmLab({ view = 'simulator' }) {
  return view === 'reference' ? <Reference /> : <Simulator />;
}
