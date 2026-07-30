import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { NICHE_KEYWORDS } from '../../lib/matchScore';

const NICHES = Object.keys(NICHE_KEYWORDS);

const STATUS_FLOW = ['new', 'queued', 'contacted', 'replied', 'signed'];
const STATUS_CFG = {
  new:       { label: 'New',       bg: 'rgba(25,37,36,0.06)',    color: '#3C5759' },
  queued:    { label: 'Queued',    bg: 'rgba(212,168,67,0.15)',  color: '#b45309' },
  contacted: { label: 'Contacted', bg: 'rgba(123,104,200,0.14)', color: '#5b4aa8' },
  replied:   { label: 'Replied',   bg: 'rgba(74,155,127,0.15)',  color: '#2d7d5e' },
  signed:    { label: 'Signed',    bg: 'rgba(209,235,219,0.8)',  color: '#166534' },
  declined:  { label: 'Declined',  bg: 'rgba(200,104,104,0.1)',  color: '#9b2d2d' },
};
const TIERS = ['nano', 'micro', 'mid', 'macro'];
const ANGLE_LABELS = {
  curiosity: 'Curiosity',
  social_proof: 'Social proof',
  compliment: 'Compliment',
  data_stat: 'Data/stat',
  founder_story: 'Founder story',
};

const input = {
  padding: '0.5rem 0.75rem', border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: '0.6rem',
  fontFamily: 'Satoshi, sans-serif', fontSize: '0.8rem', color: '#192524',
  background: '#fafafa', outline: 'none', boxSizing: 'border-box',
};
const label = { fontSize: '0.68rem', fontWeight: 700, color: '#959D90', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem', fontFamily: 'Satoshi, sans-serif' };

function fmtFollowers(n) {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.new;
  return (
    <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.18rem 0.5rem', borderRadius: 9999, background: cfg.bg, color: cfg.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {cfg.label}
    </span>
  );
}

function scoreChipColors(score) {
  if (score >= 70) return { bg: 'rgba(209,235,219,0.8)', color: '#166534' };
  if (score >= 45) return { bg: 'rgba(25,37,36,0.07)', color: '#3C5759' };
  return { bg: 'rgba(180,83,9,0.1)', color: '#b45309' };
}

function ScoreChip({ score }) {
  if (score === undefined || score === null) return null;
  const c = scoreChipColors(score);
  return (
    <span title="Composite fit score (views 35% · quality 35% · reach 30%)" style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: 8, background: c.bg, color: c.color, fontVariantNumeric: 'tabular-nums' }}>
      {score}
    </span>
  );
}

function ScoreBar({ name, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={`${name}: ${value}/100`}>
      <span style={{ fontSize: '0.6rem', color: '#959D90', width: 44, flexShrink: 0 }}>{name}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(25,37,36,0.07)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, value ?? 0)}%`, height: '100%', borderRadius: 99, background: value >= 70 ? '#4A9B7F' : value >= 45 ? '#8FBCA8' : '#C9CFC6' }} />
      </div>
      <span style={{ fontSize: '0.6rem', color: '#3C5759', width: 24, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value ?? 0}</span>
    </div>
  );
}

function ScoreBars({ p }) {
  if (p.enriched_at === undefined && p.score_reach === undefined) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <ScoreBar name="reach" value={p.score_reach} />
      <ScoreBar name="views" value={p.score_views} />
      <ScoreBar name="quality" value={p.score_quality} />
    </div>
  );
}

function bestPost(p) {
  return (p.recent_posts || [])
    .slice()
    .sort((a, b) => ((b.views ?? b.likes ?? 0) - (a.views ?? a.likes ?? 0)))[0];
}

// ─── Single prospect card ─────────────────────────────────────────────────────
function ProspectCard({ prospect }) {
  const updateStatus = useMutation(api.prospects.updateStatus);
  const update = useMutation(api.prospects.update);
  const remove = useMutation(api.prospects.remove);
  const generateDm = useAction(api.prospects.generateDmDraft);
  const enrich = useAction(api.prospects.enrichProspect);
  const [open, setOpen] = useState(false);
  const [dmDraft, setDmDraft] = useState(prospect.dm_draft || '');
  const [notes, setNotes] = useState(prospect.notes || '');
  const [copied, setCopied] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState('');
  const [enrichBusy, setEnrichBusy] = useState(false);

  async function genDm() {
    setGenBusy(true); setGenErr('');
    try {
      setDmDraft(await generateDm({ id: prospect._id }));
    } catch (e) {
      setGenErr(e.message?.replace(/^.*Error:\s*/, '') || 'Could not generate a draft');
    } finally {
      setGenBusy(false);
    }
  }

  async function analyze() {
    setEnrichBusy(true); setGenErr('');
    try {
      await enrich({ id: prospect._id });
    } catch (e) {
      setGenErr(e.message?.replace(/^.*Error:\s*/, '') || 'Analysis failed');
    } finally {
      setEnrichBusy(false);
    }
  }

  async function dmOnInstagram() {
    if (dmDraft) {
      try { await navigator.clipboard.writeText(dmDraft); } catch { /* clipboard unavailable */ }
    }
    window.open(`https://ig.me/m/${prospect.instagram_handle}`, '_blank', 'noopener');
  }

  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(prospect.status) + 1];

  async function copyDm() {
    try {
      await navigator.clipboard.writeText(dmDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div style={{ padding: '0.8rem 0.9rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(25,37,36,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {prospect.avatar_url
          ? <img src={prospect.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(149,157,144,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#3C5759', flexShrink: 0 }}>
              {(prospect.display_name || prospect.instagram_handle)[0]?.toUpperCase()}
            </div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <a href={`https://instagram.com/${prospect.instagram_handle}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '0.84rem', fontWeight: 700, color: '#192524', textDecoration: 'none' }}>
              @{prospect.instagram_handle}
            </a>
            <StatusBadge status={prospect.status} />
            {prospect.tier && <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem', borderRadius: 9999, background: 'rgba(209,235,219,0.6)', color: '#166534', fontWeight: 600, textTransform: 'capitalize' }}>{prospect.tier}</span>}
            {prospect.dm_angle && (
              <span title="Outreach copy angle" style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem', borderRadius: 9999, background: 'rgba(123,104,200,0.12)', color: '#5b4aa8', fontWeight: 600 }}>
                {ANGLE_LABELS[prospect.dm_angle] || prospect.dm_angle}
              </span>
            )}
            {prospect.published && (
              <span title="Reviewed and published — ready to send" style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem', borderRadius: 9999, background: 'rgba(209,235,219,0.8)', color: '#166534', fontWeight: 700 }}>
                ✓ Published
              </span>
            )}
            <ScoreChip score={prospect.score} />
          </div>
          <div style={{ fontSize: '0.7rem', color: '#959D90', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[prospect.display_name, fmtFollowers(prospect.follower_count) && `${fmtFollowers(prospect.follower_count)} followers`, prospect.location].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)} aria-label={open ? 'Collapse details' : 'Expand details'} aria-expanded={open} style={{ border: 'none', background: 'rgba(25,37,36,0.05)', borderRadius: 8, width: 26, height: 26, cursor: 'pointer', color: '#3C5759', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>

      {/* Quick status advance */}
      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
        {nextStatus && (
          <button onClick={() => updateStatus({ id: prospect._id, status: nextStatus })}
            style={{ padding: '0.32rem 0.8rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
            Mark {STATUS_CFG[nextStatus].label.toLowerCase()}
          </button>
        )}
        {prospect.status !== 'declined' && prospect.status !== 'signed' && (
          <button onClick={() => updateStatus({ id: prospect._id, status: 'declined' })}
            style={{ padding: '0.32rem 0.7rem', borderRadius: 9999, border: '1px solid rgba(200,104,104,0.3)', background: 'transparent', color: '#9b2d2d', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
            Declined
          </button>
        )}
        {prospect.email && (
          <a href={`mailto:${prospect.email}`} style={{ padding: '0.32rem 0.7rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', color: '#3C5759', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
            Email
          </a>
        )}
      </div>

      {open && (
        <div style={{ marginTop: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {prospect.bio && <p style={{ fontSize: '0.74rem', color: '#3C5759', margin: 0, lineHeight: 1.5 }}>{prospect.bio}</p>}

          {/* Profile analysis: score breakdown when enriched, Analyze button otherwise */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{ ...label, display: 'inline', marginBottom: 0 }}>Profile analysis</span>
              <button onClick={analyze} disabled={enrichBusy}
                style={{ padding: '0.2rem 0.6rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.66rem', fontWeight: 600, cursor: 'pointer', opacity: enrichBusy ? 0.5 : 1 }}>
                {enrichBusy ? 'Analyzing…' : prospect.enriched_at ? 'Re-analyze' : 'Analyze profile'}
              </button>
              {prospect.enriched_at && (
                <span style={{ fontSize: '0.64rem', color: '#959D90' }}>
                  {new Date(prospect.enriched_at).toLocaleDateString()}
                  {prospect.avg_video_views ? ` · ~${fmtFollowers(prospect.avg_video_views)} avg views` : ''}
                </span>
              )}
            </div>
            {prospect.enriched_at
              ? <ScoreBars p={prospect} />
              : <p style={{ fontSize: '0.7rem', color: '#959D90', margin: 0 }}>Not analyzed yet — pulls their recent posts to score reach, views, and quality (uses Apify credits).</p>}
            {(() => {
              const post = bestPost(prospect);
              if (!post) return null;
              return (
                <p style={{ fontSize: '0.7rem', color: '#3C5759', margin: '0.4rem 0 0', lineHeight: 1.45, background: 'rgba(25,37,36,0.04)', padding: '0.4rem 0.55rem', borderRadius: 8 }}>
                  <strong style={{ color: '#192524' }}>Top recent {post.type}</strong>
                  {post.views ? ` · ${fmtFollowers(post.views)} views` : post.likes ? ` · ${fmtFollowers(post.likes)} likes` : ''}
                  {post.caption ? ` — “${post.caption.slice(0, 140)}${post.caption.length > 140 ? '…' : ''}”` : ''}
                  {post.url && <> <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2d7d5e' }}>view</a></>}
                </p>
              );
            })()}
          </div>

          <div>
            <span style={label}>DM draft</span>
            <textarea value={dmDraft} onChange={e => setDmDraft(e.target.value)}
              onBlur={() => dmDraft !== (prospect.dm_draft || '') && update({ id: prospect._id, dmDraft })}
              rows={3} placeholder="Write the outreach message here, then copy it into Instagram."
              style={{ ...input, width: '100%', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
              <button onClick={genDm} disabled={genBusy}
                style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', opacity: genBusy ? 0.5 : 1 }}>
                {genBusy ? 'Writing…' : dmDraft ? 'Rewrite DM' : 'Generate DM'}
              </button>
              <button onClick={copyDm} disabled={!dmDraft}
                style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: copied ? 'rgba(209,235,219,0.6)' : 'transparent', color: copied ? '#166534' : '#3C5759', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
                {copied ? 'Copied' : 'Copy DM'}
              </button>
              <button onClick={dmOnInstagram}
                title="Copies the draft, then opens their Instagram DM thread"
                style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: '1px solid rgba(123,104,200,0.35)', background: 'rgba(123,104,200,0.08)', color: '#5b4aa8', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                DM on Instagram ↗
              </button>
              {genErr && <span style={{ fontSize: '0.68rem', color: '#9b2d2d', alignSelf: 'center' }}>{genErr}</span>}
            </div>
          </div>
          <div>
            <span style={label}>Notes</span>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              onBlur={() => notes !== (prospect.notes || '') && update({ id: prospect._id, notes })}
              rows={2} style={{ ...input, width: '100%', resize: 'vertical' }} />
          </div>
          <button onClick={() => { if (window.confirm(`Remove @${prospect.instagram_handle} from the list?`)) remove({ id: prospect._id }); }}
            style={{ alignSelf: 'flex-start', padding: '0.3rem 0.7rem', borderRadius: 9999, border: 'none', background: 'transparent', color: '#9b2d2d', fontSize: '0.7rem', cursor: 'pointer' }}>
            Remove prospect
          </button>
        </div>
      )}
    </div>
  );
}

// ─── One side (creators or hosts) ─────────────────────────────────────────────
function ProspectPanel({ kind, title }) {
  const [status, setStatus] = useState('');
  const [tier, setTier] = useState('');
  const [location, setLocation] = useState('');
  const prospects = useQuery(api.prospects.getByKind, {
    kind,
    status: status || undefined,
    tier: tier || undefined,
    location: location || undefined,
  }) || [];

  const select = { ...input, padding: '0.45rem 0.6rem', fontSize: '0.75rem' };

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#192524', margin: '0 0 0.6rem' }}>
        {title} <span style={{ color: '#959D90', fontWeight: 500, fontSize: '0.8rem' }}>({prospects.length})</span>
      </p>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
        <select aria-label={`Filter ${kind}s by status`} value={status} onChange={e => setStatus(e.target.value)} style={select}>
          <option value="">All statuses</option>
          {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
        </select>
        <select aria-label={`Filter ${kind}s by tier`} value={tier} onChange={e => setTier(e.target.value)} style={select}>
          <option value="">All tiers</option>
          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input aria-label={`Filter ${kind}s by location`} value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" style={{ ...select, width: 110 }} />
      </div>
      {prospects.length === 0 ? (
        <div style={{ padding: '1.75rem 1rem', textAlign: 'center', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.5)', border: '1px dashed rgba(25,37,36,0.12)' }}>
          <p style={{ fontSize: '0.8rem', color: '#959D90', margin: 0 }}>No {kind}s yet. Add one manually or import from Apify above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '58vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {prospects.map(p => <ProspectCard key={p._id} prospect={p} />)}
        </div>
      )}
    </div>
  );
}

// ─── Add prospect form ────────────────────────────────────────────────────────
function AddProspectForm({ onDone }) {
  const add = useMutation(api.prospects.add);
  const [kind, setKind] = useState('creator');
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [followers, setFollowers] = useState('');
  const [loc, setLoc] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!handle.trim()) { setErr('Handle is required'); return; }
    setBusy(true); setErr('');
    try {
      await add({
        kind,
        instagramHandle: handle,
        displayName: name || undefined,
        followerCount: followers ? parseInt(followers, 10) : undefined,
        location: loc || undefined,
        email: email || undefined,
      });
      setHandle(''); setName(''); setFollowers(''); setLoc(''); setEmail('');
      onDone?.();
    } catch (e) {
      setErr(e.message?.replace(/^.*Error:\s*/, '') || 'Could not add prospect');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <select aria-label="Prospect type" value={kind} onChange={e => setKind(e.target.value)} style={{ ...input, width: 100 }}>
        <option value="creator">Creator</option>
        <option value="host">Host</option>
      </select>
      <input aria-label="Instagram handle" name="ig-handle" autoComplete="off" value={handle} onChange={e => setHandle(e.target.value)} placeholder="@handle" style={{ ...input, width: 130 }} />
      <input aria-label="Display name" name="prospect-name" autoComplete="off" value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={{ ...input, width: 120 }} />
      <input aria-label="Follower count" name="followers" value={followers} onChange={e => setFollowers(e.target.value)} placeholder="Followers" type="number" inputMode="numeric" style={{ ...input, width: 100 }} />
      <input aria-label="Location" name="prospect-location" autoComplete="off" value={loc} onChange={e => setLoc(e.target.value)} placeholder="Location" style={{ ...input, width: 110 }} />
      <input aria-label="Email" name="prospect-email" type="email" spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optional)" style={{ ...input, width: 150 }} />
      <button onClick={submit} disabled={busy}
        style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
        {busy ? 'Adding' : 'Add'}
      </button>
      {err && <span style={{ fontSize: '0.72rem', color: '#9b2d2d', width: '100%' }}>{err}</span>}
    </div>
  );
}

// ─── Apify import row ─────────────────────────────────────────────────────────
function ApifyImport() {
  const importFromApify = useAction(api.prospects.importFromApify);
  const [kind, setKind] = useState('creator');
  const [queryStr, setQueryStr] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');

  async function run() {
    if (!queryStr.trim()) return;
    setBusy(true); setResult('');
    try {
      const r = await importFromApify({ kind, searchQuery: queryStr.trim(), limit: 50 });
      setResult(`Imported ${r.inserted} new of ${r.fetched} found.`);
    } catch (e) {
      setResult(e.message?.replace(/^.*Error:\s*/, '') || 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <select aria-label="Import as" value={kind} onChange={e => setKind(e.target.value)} style={{ ...input, width: 100 }}>
        <option value="creator">Creators</option>
        <option value="host">Hosts</option>
      </select>
      <input aria-label="Apify search term" value={queryStr} onChange={e => setQueryStr(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()}
        placeholder='Search term, e.g. "travel creator bali" or "boutique hotel lisbon"'
        style={{ ...input, flex: 1, minWidth: 220 }} />
      <button onClick={run} disabled={busy}
        style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: 'transparent', color: '#192524', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
        {busy ? 'Importing' : 'Import from Apify'}
      </button>
      {result && <span style={{ fontSize: '0.72rem', color: result.startsWith('Imported') ? '#2d7d5e' : '#9b2d2d', width: '100%' }}>{result}</span>}
    </div>
  );
}

// ─── Find creators (niche search + ranked top 10) ─────────────────────────────
function FindCreators() {
  const search = useAction(api.prospects.searchCreators);
  const [niche, setNiche] = useState('travel');
  const [loc, setLoc] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [results, setResults] = useState(null); // { imported, fetched, ranked }

  async function run() {
    setBusy(true); setErr(''); setResults(null);
    try {
      setResults(await search({ niche, location: loc.trim() || undefined }));
    } catch (e) {
      setErr(e.message?.replace(/^.*Error:\s*/, '') || 'Search failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select aria-label="Niche" value={niche} onChange={e => setNiche(e.target.value)} style={{ ...input, width: 160, textTransform: 'capitalize' }}>
          {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input aria-label="Location" value={loc} onChange={e => setLoc(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()}
          placeholder="Location (optional), e.g. Asheville" style={{ ...input, flex: 1, minWidth: 180 }} />
        <button onClick={run} disabled={busy}
          style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
          {busy ? 'Searching…' : 'Find creators'}
        </button>
        {busy && <span style={{ fontSize: '0.7rem', color: '#959D90' }}>Scraping + scoring the top 10 — this can take a minute.</span>}
        {err && <span style={{ fontSize: '0.72rem', color: '#9b2d2d', width: '100%' }}>{err}</span>}
      </div>

      {results && (
        <div style={{ marginTop: '0.9rem' }}>
          <p style={{ fontSize: '0.72rem', color: '#959D90', margin: '0 0 0.5rem' }}>
            Found {results.fetched}, imported {results.imported} new. Top {results.ranked.length} by fit score — all are saved as prospects below.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {results.ranked.map((p, i) => {
              const post = bestPost(p);
              return (
                <div key={String(p._id)} style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', padding: '0.55rem 0.65rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(25,37,36,0.07)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#959D90', width: 16, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(149,157,144,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#3C5759', flexShrink: 0 }}>{p.instagram_handle[0]?.toUpperCase()}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <a href={`https://instagram.com/${p.instagram_handle}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '0.8rem', fontWeight: 700, color: '#192524', textDecoration: 'none' }}>
                        @{p.instagram_handle}
                      </a>
                      <span style={{ fontSize: '0.68rem', color: '#959D90' }}>{fmtFollowers(p.follower_count)} followers{p.avg_video_views ? ` · ~${fmtFollowers(p.avg_video_views)} avg views` : ''}</span>
                    </div>
                    {post?.caption && (
                      <div style={{ fontSize: '0.66rem', color: '#959D90', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        “{post.caption.slice(0, 90)}”
                      </div>
                    )}
                  </div>
                  <div style={{ width: 150, flexShrink: 0 }}><ScoreBars p={p} /></div>
                  <ScoreChip score={p.score} />
                </div>
              );
            })}
            {results.ranked.length === 0 && <p style={{ fontSize: '0.74rem', color: '#959D90', margin: 0 }}>No creators found for that search.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Host outreach campaign (search → select → confirm, manual send) ──────────

function csvEscape(val) {
  const s = String(val ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadHostsCsv(rows, filename) {
  const header = ['Instagram handle', 'Name', 'Location', 'Niche', 'Followers', 'Email', 'Angle', 'Status', 'Message sent', 'Contacted date'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([
      `@${r.instagram_handle}`,
      r.display_name || '',
      r.location || '',
      r.niche || '',
      r.follower_count ?? '',
      r.email || '',
      ANGLE_LABELS[r.dm_angle] || r.dm_angle || '',
      r.status,
      r.dm_draft || '',
      r.contacted_at ? new Date(r.contacted_at).toISOString().slice(0, 10) : '',
    ].map(csvEscape).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// Search/import controls — swaps to instructions when Agent-Reach is the
// selected provider (Social tab), since that runs locally, not server-side.
function HostSearchImport() {
  const settings = useQuery(api.admin.getSettings);
  const provider = settings?.host_search_provider || 'hikerapi';
  const importFromApify = useAction(api.prospects.importFromApify);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(40);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function run() {
    if (!q.trim()) return;
    setBusy(true); setMsg('');
    try {
      const r = await importFromApify({ kind: 'host', searchQuery: q.trim(), limit });
      setMsg(`Imported ${r.inserted} new of ${r.fetched} found.`);
    } catch (e) {
      setMsg(e.message?.replace(/^.*Error:\s*/, '') || 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  if (provider === 'agent_reach') {
    return (
      <div style={{ padding: '0.7rem 0.9rem', borderRadius: '0.75rem', background: 'rgba(123,104,200,0.06)', border: '1px solid rgba(123,104,200,0.2)' }}>
        <p style={{ fontSize: '0.76rem', color: '#3C5759', margin: 0, lineHeight: 1.5 }}>
          Search provider is set to <strong>Agent-Reach</strong> (Social tab). Its Instagram search needs a live local agent session with your own logged-in Chrome — it can't run from this hosted admin page. On your Mac, open a local Claude Code session and ask it to search Instagram via Agent-Reach for a region, then have it push the results in with the <code>prospects:importHostsLocal</code> mutation (secret in Convex env as <code>LOCAL_IMPORT_SECRET</code>). New listings appear in the pool below automatically once pushed.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <input aria-label="Search hosts" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()}
        placeholder='Search hosts by region, e.g. "boutique hotel lisbon" or "airbnb tulum"'
        style={{ ...input, flex: 1, minWidth: 240 }} />
      <input aria-label="Pool size" type="number" min="5" max="100" value={limit}
        onChange={e => setLimit(Math.max(5, Math.min(100, parseInt(e.target.value, 10) || 40)))}
        style={{ ...input, width: 70 }} />
      <button onClick={run} disabled={busy}
        style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
        {busy ? 'Searching…' : 'Search & import'}
      </button>
      {msg && <span style={{ fontSize: '0.72rem', color: '#959D90' }}>{msg}</span>}
    </div>
  );
}

function ConfirmedRow({ prospect, update, updateStatus }) {
  const [draft, setDraft] = useState(prospect.dm_draft || '');
  const [copied, setCopied] = useState(false);
  const isContacted = prospect.status !== 'queued';

  async function copyAndOpen() {
    try { await navigator.clipboard.writeText(draft); } catch { /* clipboard unavailable */ }
    window.open(`https://ig.me/m/${prospect.instagram_handle}`, '_blank', 'noopener');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{ padding: '0.6rem 0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(25,37,36,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
        <a href={`https://instagram.com/${prospect.instagram_handle}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: '#192524', fontSize: '0.8rem', textDecoration: 'none' }}>@{prospect.instagram_handle}</a>
        <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem', borderRadius: 9999, background: 'rgba(123,104,200,0.12)', color: '#5b4aa8', fontWeight: 600 }}>
          {ANGLE_LABELS[prospect.dm_angle] || prospect.dm_angle}
        </span>
        <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem', borderRadius: 9999, background: isContacted ? 'rgba(209,235,219,0.8)' : 'rgba(212,168,67,0.15)', color: isContacted ? '#166534' : '#b45309', fontWeight: 700 }}>
          {isContacted ? 'Contacted' : 'Ready'}
        </span>
      </div>
      <textarea value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={() => draft !== (prospect.dm_draft || '') && update({ id: prospect._id, dmDraft: draft })}
        rows={2} style={{ ...input, width: '100%', resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
        <button onClick={copyAndOpen}
          style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: '1px solid rgba(123,104,200,0.35)', background: copied ? 'rgba(123,104,200,0.16)' : 'rgba(123,104,200,0.08)', color: '#5b4aa8', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
          {copied ? 'Copied — opening Instagram…' : 'Copy + open Instagram DM ↗'}
        </button>
        {!isContacted && (
          <button onClick={() => updateStatus({ id: prospect._id, status: 'contacted' })}
            style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
            Mark contacted
          </button>
        )}
      </div>
    </div>
  );
}

function HostOutreachCampaign() {
  const pool = useQuery(api.prospects.getHostPool) || [];
  const confirmed = useQuery(api.prospects.getConfirmedHosts) || [];
  const confirmBatch = useAction(api.prospects.confirmHostBatch);
  const update = useMutation(api.prospects.update);
  const updateStatus = useMutation(api.prospects.updateStatus);

  const [filterText, setFilterText] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [confirmedFilter, setConfirmedFilter] = useState('');

  const filteredPool = pool.filter((p) => {
    if (!filterText.trim()) return true;
    const t = filterText.toLowerCase();
    return p.instagram_handle.toLowerCase().includes(t)
      || (p.display_name || '').toLowerCase().includes(t)
      || (p.location || '').toLowerCase().includes(t)
      || (p.niche || '').toLowerCase().includes(t)
      || (p.bio || '').toLowerCase().includes(t);
  });

  function selectTop(n) {
    setSelected(new Set(filteredPool.slice(0, n).map((p) => String(p._id))));
  }

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function doConfirm() {
    if (selected.size === 0) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await confirmBatch({ ids: [...selected] });
      setMsg(`Confirmed ${r.confirmed} — drafted with the NVIDIA model. Copy + send each manually below.`);
      setSelected(new Set());
    } catch (e) {
      setErr(e.message?.replace(/^.*Error:\s*/, '') || 'Confirm failed');
    } finally {
      setBusy(false);
    }
  }

  const filteredConfirmed = confirmed.filter((p) => {
    if (confirmedFilter === 'contacted') return p.status !== 'queued';
    if (confirmedFilter === 'pending') return p.status === 'queued';
    return true;
  });

  return (
    <div>
      <p style={{ fontSize: '0.78rem', color: '#3C5759', margin: '0 0 0.7rem', lineHeight: 1.5 }}>
        Search & import a pool of candidates (default 40/day), tick ~20 in the table below — top-scored are pre-selected, swap in others as backups — then Confirm to draft + lock those in. Nothing sends automatically: copy each draft and send it yourself via Instagram.
      </p>

      <HostSearchImport />

      <div style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#192524' }}>Candidate pool ({filteredPool.length})</span>
          <input aria-label="Filter pool" value={filterText} onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter by name, location, niche…" style={{ ...input, width: 220, padding: '0.35rem 0.6rem', fontSize: '0.74rem' }} />
          <button onClick={() => selectTop(20)}
            style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
            Select top 20
          </button>
          <button onClick={() => setSelected(new Set())} disabled={selected.size === 0}
            style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', opacity: selected.size === 0 ? 0.5 : 1 }}>
            Clear
          </button>
          <button onClick={doConfirm} disabled={busy || selected.size === 0}
            style={{ padding: '0.4rem 1rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', opacity: (busy || selected.size === 0) ? 0.5 : 1 }}>
            {busy ? 'Confirming…' : `Confirm (${selected.size})`}
          </button>
        </div>
        {msg && <p style={{ fontSize: '0.74rem', color: '#166534', margin: '0 0 0.5rem' }}>{msg}</p>}
        {err && <p style={{ fontSize: '0.74rem', color: '#9b2d2d', margin: '0 0 0.5rem' }}>{err}</p>}

        {filteredPool.length === 0 ? (
          <p style={{ fontSize: '0.76rem', color: '#959D90' }}>No candidates yet — search above to import some.</p>
        ) : (
          <div style={{ maxHeight: '18rem', overflowY: 'auto', border: '1px solid rgba(25,37,36,0.08)', borderRadius: '0.75rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#959D90', fontSize: '0.64rem', textTransform: 'uppercase', position: 'sticky', top: 0, background: '#fdfdfb' }}>
                  <th style={{ padding: '0.4rem 0.5rem', width: 28 }}></th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Handle</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Location</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Niche</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Followers</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredPool.map((p) => (
                  <tr key={String(p._id)} style={{ borderTop: '1px solid rgba(25,37,36,0.06)' }}>
                    <td style={{ padding: '0.35rem 0.5rem' }}>
                      <input type="checkbox" aria-label={`Select @${p.instagram_handle}`} checked={selected.has(String(p._id))} onChange={() => toggle(p._id)} />
                    </td>
                    <td style={{ padding: '0.35rem 0.5rem' }}>
                      <a href={`https://instagram.com/${p.instagram_handle}`} target="_blank" rel="noopener noreferrer" style={{ color: '#192524', fontWeight: 700, textDecoration: 'none' }}>@{p.instagram_handle}</a>
                      {p.display_name && <span style={{ color: '#959D90' }}> · {p.display_name}</span>}
                    </td>
                    <td style={{ padding: '0.35rem 0.5rem', color: '#3C5759' }}>{p.location || '—'}</td>
                    <td style={{ padding: '0.35rem 0.5rem', color: '#3C5759' }}>{p.niche || '—'}</td>
                    <td style={{ padding: '0.35rem 0.5rem', color: '#3C5759' }}>{fmtFollowers(p.follower_count) || '—'}</td>
                    <td style={{ padding: '0.35rem 0.5rem' }}><ScoreChip score={p.score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#192524' }}>Confirmed ({filteredConfirmed.length})</span>
          <select aria-label="Filter confirmed" value={confirmedFilter} onChange={(e) => setConfirmedFilter(e.target.value)}
            style={{ ...input, padding: '0.35rem 0.6rem', fontSize: '0.74rem' }}>
            <option value="">All confirmed</option>
            <option value="pending">Not yet contacted</option>
            <option value="contacted">Contacted</option>
          </select>
          <button onClick={() => downloadHostsCsv(filteredConfirmed, `collabnb-host-outreach-${new Date().toISOString().slice(0, 10)}.csv`)}
            disabled={filteredConfirmed.length === 0}
            style={{ padding: '0.35rem 0.9rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: 'transparent', color: '#192524', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', opacity: filteredConfirmed.length === 0 ? 0.5 : 1 }}>
            Download CSV
          </button>
        </div>

        {filteredConfirmed.length === 0 ? (
          <p style={{ fontSize: '0.76rem', color: '#959D90' }}>Nothing confirmed yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '22rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {filteredConfirmed.map((p) => (
              <ConfirmedRow key={String(p._id)} prospect={p} update={update} updateStatus={updateStatus} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Auto-discovery config (daily cron) ───────────────────────────────────────
function AutoDiscoveryCard() {
  const settings = useQuery(api.admin.getSettings);
  const setSetting = useMutation(api.admin.setSetting);
  const saved = (() => {
    try { return JSON.parse(settings?.discovery_auto || 'null') || {}; } catch { return {}; }
  })();
  const [draft, setDraft] = useState(null); // null = mirror saved
  const cfg = draft ?? { enabled: !!saved.enabled, niche: saved.niche || 'travel', location: saved.location || '', perDay: saved.perDay || 10 };
  const [savedMsg, setSavedMsg] = useState('');

  async function save(next) {
    const merged = { ...cfg, ...next };
    setDraft(merged);
    await setSetting({ key: 'discovery_auto', value: JSON.stringify(merged) });
    setSavedMsg('Saved');
    setTimeout(() => setSavedMsg(''), 2000);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => save({ enabled: !cfg.enabled })}
          role="switch" aria-checked={cfg.enabled}
          style={{ padding: '0.45rem 1rem', borderRadius: 9999, border: 'none', background: cfg.enabled ? '#166534' : 'rgba(25,37,36,0.12)', color: cfg.enabled ? '#fff' : '#3C5759', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>
          {cfg.enabled ? 'On' : 'Off'}
        </button>
        <select aria-label="Auto-discovery niche" value={cfg.niche} onChange={e => save({ niche: e.target.value })} style={{ ...input, width: 150, textTransform: 'capitalize' }}>
          {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input aria-label="Auto-discovery location" value={cfg.location} onChange={e => setDraft({ ...cfg, location: e.target.value })} onBlur={() => save({})}
          placeholder="Target location" style={{ ...input, width: 160 }} />
        <input aria-label="Creators per day" type="number" min="1" max="20" value={cfg.perDay}
          onChange={e => setDraft({ ...cfg, perDay: Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 10)) })} onBlur={() => save({})}
          style={{ ...input, width: 70 }} />
        <span style={{ fontSize: '0.7rem', color: '#959D90' }}>
          per day{savedMsg && <span style={{ color: '#166534', fontWeight: 700 }}> · {savedMsg}</span>}
        </span>
      </div>
      <p style={{ fontSize: '0.7rem', color: '#959D90', margin: '0.5rem 0 0' }}>
        Every morning at 7am UTC this searches Instagram for {cfg.niche} creators{cfg.location ? ` around ${cfg.location}` : ''}, imports new ones, and scores the top {cfg.perDay} — ready before the 8am outreach queue builds. Uses Apify credits daily while on.
      </p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Discovery() {
  const stats = useQuery(api.prospects.getStats);
  const buildQueue = useMutation(api.prospects.buildTodayQueue);
  const [openPanel, setOpenPanel] = useState('find'); // 'find' | 'add' | 'import' | 'auto' | null
  const [queueMsg, setQueueMsg] = useState('');
  const togglePanel = (p) => setOpenPanel(cur => (cur === p ? null : p));

  const contactedCreators = stats?.contactedToday?.creators ?? 0;
  const contactedHosts = stats?.contactedToday?.hosts ?? 0;

  async function handleBuildQueue() {
    const r = await buildQueue({ perKind: 20 });
    setQueueMsg(r.promoted > 0 ? `Queued ${r.promoted} prospects for today.` : 'Queue is already full (or no new prospects to queue).');
    setTimeout(() => setQueueMsg(''), 4000);
  }

  return (
    <div style={{ padding: '1.75rem 2rem 2rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: '#192524', margin: '0 0 0.2rem' }}>Discovery</h2>
          <p style={{ fontSize: '0.78rem', color: '#959D90', margin: 0 }}>
            Today's outreach: {contactedCreators}/20 creators · {contactedHosts}/20 hosts. Instagram DMs stay manual (20 a day is the safe limit); this board preps and tracks everything else.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={handleBuildQueue}
            style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
            Build today's queue
          </button>
          {[
            { id: 'outreach', label: 'Host outreach' },
            { id: 'find',   label: 'Find creators' },
            { id: 'auto',   label: 'Auto-discovery' },
            { id: 'add',    label: 'Add manually' },
            { id: 'import', label: 'Import' },
          ].map(({ id, label: l }) => (
            <button key={id} onClick={() => togglePanel(id)}
              style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: openPanel === id ? 'rgba(25,37,36,0.06)' : 'transparent', color: '#192524', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {queueMsg && (
        <div style={{ marginBottom: '1rem', padding: '0.6rem 1rem', borderRadius: '0.75rem', background: 'rgba(209,235,219,0.4)', border: '1px solid rgba(209,235,219,0.8)', fontSize: '0.78rem', color: '#166534' }}>
          {queueMsg}
        </div>
      )}

      {openPanel && (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(25,37,36,0.08)' }}>
          {openPanel === 'outreach' && <HostOutreachCampaign />}
          {openPanel === 'find' && <FindCreators />}
          {openPanel === 'auto' && <AutoDiscoveryCard />}
          {openPanel === 'add' && <AddProspectForm onDone={() => setOpenPanel(null)} />}
          {openPanel === 'import' && <ApifyImport />}
        </div>
      )}

      {/* Two-panel layout: creators left, hosts right */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <ProspectPanel kind="creator" title="Creators" />
        <div style={{ width: 1, background: 'rgba(25,37,36,0.08)', alignSelf: 'stretch' }} />
        <ProspectPanel kind="host" title="Hosts" />
      </div>
    </div>
  );
}
