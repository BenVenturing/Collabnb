import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  buildCreatorContext, scoreListings, locationScore,
  WEIGHTS, NICHE_KEYWORDS,
  MATCH_BADGE_THRESHOLD, FOR_YOU_MIN_SCORE, NEAR_ME_MIN_LOCATION,
} from '../../lib/matchScore';
import { INK, SLATE, SAGE, MINT, AvatarBubble, Chip, Card, SectionLabel, PartBar } from './algoLabUI';

function scoreColor(score) {
  if (score >= MATCH_BADGE_THRESHOLD) return { bg: MINT, color: '#166534' };
  if (score >= FOR_YOU_MIN_SCORE) return { bg: 'rgba(25,37,36,0.07)', color: SLATE };
  return { bg: 'rgba(220,38,38,0.08)', color: '#b45309' };
}

// ─── Simulator ────────────────────────────────────────────────────────────────
function Simulator() {
  const profiles   = useQuery(api.profiles.getAll);
  const listingsRaw = useQuery(api.listings.getAll);
  const samplesRaw  = useQuery(api.listings.getSamples);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const selected = profiles?.find((p) => String(p._id) === selectedId) || null;

  const collabs = useQuery(
    api.collaborations.getByCreator,
    selectedId ? { creatorId: selectedId } : 'skip'
  ) ?? [];
  const collections = useQuery(
    api.collections.getByUser,
    selectedId ? { creatorId: selectedId } : 'skip'
  ) ?? [];

  const allListings = useMemo(() => {
    const rows = [...(listingsRaw || []), ...(samplesRaw || [])]
      .filter((l) => !l.status || l.status === 'published' || l.status === 'active');
    return rows.map((l) => ({
      ...l,
      id: String(l._id),
      collab_type: l.collab_type || l.deliverable_load || 'Collab',
    }));
  }, [listingsRaw, samplesRaw]);

  const savedIds = useMemo(
    () => new Set(collections.flatMap((c) => c.listing_ids || [])),
    [collections]
  );

  const { ctx, ranked } = useMemo(() => {
    if (!selected) return { ctx: null, ranked: [] };
    const ctx = buildCreatorContext({
      profile: selected,
      collaborations: collabs,
      savedListings: allListings.filter((l) => savedIds.has(l.id)),
      allListings,
    });
    const ranked = scoreListings(allListings, ctx)
      .map((l) => ({ ...l, _locPart: locationScore(l, ctx) }))
      .sort((a, b) => b._match - a._match || (b.rating ?? 0) - (a.rating ?? 0));
    return { ctx, ranked };
  }, [selected, collabs, allListings, savedIds]);

  const matches = (p) => {
    const q = search.toLowerCase();
    return [p.full_name, p.username, p.email, p.city, p.region]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  };
  const candidates = (profiles || [])
    .filter((p) => p.role === 'creator' || search.length > 0)
    .filter((p) => !search || matches(p))
    .slice(0, 8);

  if (profiles === undefined || listingsRaw === undefined) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem' }}>Loading…</div>;
  }

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 980 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Algorithm Simulator
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        Pick a creator and see their Explore feed exactly as the ranking engine computes it — same code the app runs.
      </p>

      {/* ── Creator picker ── */}
      <Card style={{ marginBottom: '1rem' }}>
        <SectionLabel>Run as creator</SectionLabel>
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
                {p.tier && <Chip bg={MINT} color="#166534">{p.tier}</Chip>}
              </button>
            );
          })}
          {candidates.length === 0 && (
            <p style={{ fontSize: '0.78rem', color: SAGE, margin: '0.4rem 0 0' }}>No profiles match.</p>
          )}
        </div>
      </Card>

      {selected && ctx && (
        <>
          {/* ── Signals the engine sees ── */}
          <Card style={{ marginBottom: '1rem' }}>
            <SectionLabel>Signals for {selected.full_name || selected.username}</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.9rem', fontSize: '0.78rem', color: SLATE }}>
              <div>
                <strong style={{ color: INK }}>Home:</strong>{' '}
                {[selected.city, selected.region, selected.country].filter(Boolean).join(', ') || <em style={{ color: '#b45309' }}>not set — location scoring falls to baseline</em>}
              </div>
              <div>
                <strong style={{ color: INK }}>Tier:</strong> {selected.tier || <em>none</em>}
              </div>
              <div>
                <strong style={{ color: INK }}>Niches:</strong>{' '}
                {selected.niches?.length
                  ? selected.niches.map((n) => <Chip key={n} bg={MINT} color="#166534">{n}</Chip>).reduce((a, b) => [a, ' ', b])
                  : <em style={{ color: '#b45309' }}>none picked — tag score is neutral 0.5</em>}
              </div>
              <div>
                <strong style={{ color: INK }}>Past collab areas:</strong>{' '}
                {ctx.pastLocations.length ? [...new Set(ctx.pastLocations)].join(' · ') : <em>none yet</em>}
              </div>
              <div>
                <strong style={{ color: INK }}>Saved listings:</strong> {savedIds.size}
              </div>
              <div>
                <strong style={{ color: INK }}>Tag keywords in play:</strong> {ctx.creatorKeywords.length}
                {ctx.creatorKeywords.length > 0 && (
                  <span style={{ color: SAGE }}> ({ctx.creatorKeywords.slice(0, 8).join(', ')}{ctx.creatorKeywords.length > 8 ? '…' : ''})</span>
                )}
              </div>
            </div>
          </Card>

          {/* ── Ranked feed ── */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <SectionLabel>Their Explore feed — {ranked.length} listings ranked</SectionLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Chip bg={MINT} color="#166534">≥{MATCH_BADGE_THRESHOLD} shows % badge</Chip>
                <Chip>≥{FOR_YOU_MIN_SCORE} enters Picked for You</Chip>
                <Chip>location ≥{NEAR_ME_MIN_LOCATION} enters Near You</Chip>
              </div>
            </div>
            <div style={{ maxHeight: 520, overflowY: 'auto', marginTop: '0.4rem' }}>
              {ranked.map((l, i) => {
                const sc = scoreColor(l._match);
                return (
                  <div key={l.id} style={{ display: 'flex', gap: '0.9rem', alignItems: 'center', padding: '0.65rem 0.25rem', borderTop: i === 0 ? 'none' : '1px solid rgba(25,37,36,0.06)' }}>
                    <span style={{ fontSize: '0.7rem', color: SAGE, width: 22, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '0.6rem', background: sc.bg, color: sc.color, flexShrink: 0, width: 52, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                      {l._match}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.83rem', fontWeight: 600, color: INK, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.title} <span style={{ fontWeight: 400, color: SAGE }}>· {l.location}</span>
                      </p>
                      <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                        {l._match >= MATCH_BADGE_THRESHOLD && <Chip bg={MINT} color="#166534">{l._match}% badge</Chip>}
                        {l._match >= FOR_YOU_MIN_SCORE && <Chip>Picked for You</Chip>}
                        {l._matchParts.location >= NEAR_ME_MIN_LOCATION && <Chip>Near You</Chip>}
                        {l.is_featured && <Chip bg="rgba(25,37,36,0.85)" color="#F7F5F2">Trending</Chip>}
                        {l.is_sample && <Chip bg="rgba(180,83,9,0.1)" color="#b45309">sample</Chip>}
                        {l._matchReasons?.length > 0 && <span style={{ fontSize: '0.66rem', color: SAGE, alignSelf: 'center' }}>{l._matchReasons.join(' · ')}</span>}
                      </div>
                    </div>
                    <div style={{ width: 190, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <PartBar label="loc"  value={l._matchParts.location} weight={WEIGHTS.location} />
                      <PartBar label="tags" value={l._matchParts.tags}     weight={WEIGHTS.tags} />
                      <PartBar label="fit"  value={l._matchParts.profile}  weight={WEIGHTS.profile} />
                    </div>
                  </div>
                );
              })}
              {ranked.length === 0 && <p style={{ fontSize: '0.8rem', color: SAGE }}>No published listings to rank.</p>}
            </div>
            <p style={{ fontSize: '0.7rem', color: SAGE, margin: '0.75rem 0 0' }}>
              In the app, an active search (Where / What / When) or property-type chip filters this list before ranking — personalization never overrides an explicit search.
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
        How the Explore Algorithm Works
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        Values below are read live from <code style={{ background: 'rgba(25,37,36,0.06)', padding: '0.05rem 0.35rem', borderRadius: 6, fontSize: '0.78rem' }}>app/src/lib/matchScore.js</code> — this panel can never drift from the code. Full write-up: <code style={{ background: 'rgba(25,37,36,0.06)', padding: '0.05rem 0.35rem', borderRadius: 6, fontSize: '0.78rem' }}>explore-algorithm.md</code> at the project root.
      </p>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionLabel>The formula</SectionLabel>
        <p style={{ fontSize: '0.95rem', color: INK, fontWeight: 600, margin: '0 0 0.75rem', fontFamily: 'monospace' }}>
          score = ({WEIGHTS.location} × location + {WEIGHTS.tags} × tags + {WEIGHTS.profile} × profile fit) × 100
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip bg={MINT} color="#166534">score ≥ {MATCH_BADGE_THRESHOLD} → "% match" badge on card</Chip>
          <Chip>score ≥ {FOR_YOU_MIN_SCORE} → appears in "Picked for You"</Chip>
          <Chip>location part ≥ {NEAR_ME_MIN_LOCATION} → appears in "Near You"</Chip>
          <Chip bg="rgba(25,37,36,0.85)" color="#F7F5F2">Trending = host-set Featured flag, not personalized</Chip>
        </div>
      </Card>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionLabel>1 · Location fit — {Math.round(WEIGHTS.location * 100)}% of the score</SectionLabel>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr><th style={th}>Best matching rule wins</th><th style={th}>Sub-score</th></tr></thead>
          <tbody>
            <tr><td style={td}>Listing in creator's home city</td><td style={td}>1.00</td></tr>
            <tr><td style={td}>Listing in home state/region (US names ↔ abbreviations handled)</td><td style={td}>0.85</td></tr>
            <tr><td style={td}>Listing in an area where they completed a collab before</td><td style={td}>0.70</td></tr>
            <tr><td style={td}>Listing in home country</td><td style={td}>0.55</td></tr>
            <tr><td style={td}>Anywhere else — nothing is ever hidden, just ranked lower</td><td style={td}>0.25</td></tr>
          </tbody>
        </table>
      </Card>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionLabel>2 · Tag similarity — {Math.round(WEIGHTS.tags * 100)}% of the score</SectionLabel>
        <p style={{ fontSize: '0.8rem', color: SLATE, margin: '0 0 0.6rem', lineHeight: 1.55 }}>
          Creator tags = their Content Niches from Edit Profile (expanded via the keyword map below) + the vibe tags of listings they've saved and collabed on.
          Each listing tag that hits a creator keyword counts; <strong>3 matches = full marks</strong>. A creator with no niches, saves, or history scores a neutral 0.5.
        </p>
        <details>
          <summary style={{ fontSize: '0.75rem', fontWeight: 700, color: SLATE, cursor: 'pointer' }}>Niche → keyword expansion map ({Object.keys(NICHE_KEYWORDS).length} niches — the main tuning knob)</summary>
          <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '0.5rem' }}>
            <tbody>
              {Object.entries(NICHE_KEYWORDS).map(([niche, kws]) => (
                <tr key={niche}>
                  <td style={{ ...td, fontWeight: 600, color: INK, whiteSpace: 'nowrap' }}>{niche}</td>
                  <td style={td}>{kws.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </Card>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionLabel>3 · Profile fit — {Math.round(WEIGHTS.profile * 100)}% of the score</SectionLabel>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr><th style={th}>Part</th><th style={th}>Rule</th></tr></thead>
          <tbody>
            <tr><td style={{ ...td, fontWeight: 600, color: INK }}>Tier fit (60%)</td><td style={td}>Listing's required creator tier: exact match 1.0 · no requirement 0.75 · mismatch 0.4</td></tr>
            <tr><td style={{ ...td, fontWeight: 600, color: INK }}>Familiarity (40%)</td><td style={td}>Completed this collab type before: yes 1.0 · no history at all 0.5 (neutral) · history but never this type 0.25</td></tr>
          </tbody>
        </table>
      </Card>

      <Card>
        <SectionLabel>Guarantees</SectionLabel>
        <ul style={{ fontSize: '0.8rem', color: SLATE, margin: 0, paddingLeft: '1.1rem', lineHeight: 1.7 }}>
          <li>Nothing is ever hidden — "All Stays" and search always show every published listing; scores only reorder.</li>
          <li>An explicit search always overrides personalization.</li>
          <li>Badges only show at {MATCH_BADGE_THRESHOLD}+ so users never see embarrassing low percentages.</li>
          <li>All scoring is computed client-side on load — profile edits take effect immediately, nothing is stored.</li>
        </ul>
      </Card>
    </div>
  );
}

export default function AlgorithmLab({ view = 'simulator' }) {
  return view === 'reference' ? <Reference /> : <Simulator />;
}
