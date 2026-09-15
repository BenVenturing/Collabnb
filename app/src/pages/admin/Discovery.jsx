import { useState, useRef } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { NICHE_KEYWORDS } from '../../lib/matchScore';

const NICHES = Object.keys(NICHE_KEYWORDS);

// Both kinds share the same stages now — an auto-fired welcome email
// (host: after scraping their site for a marketing address; creator: to
// whatever email was already on file from their Instagram bio) comes right
// after Confirmed, before the manual Instagram DM.
const HOST_STATUS_FLOW = ['new', 'queued', 'emailed', 'contacted', 'replied', 'signed'];
const CREATOR_STATUS_FLOW = ['new', 'queued', 'emailed', 'contacted', 'replied', 'signed'];
const STATUS_CFG = {
  new:       { label: 'New',       bg: 'rgba(25,37,36,0.06)',    color: '#3C5759' },
  queued:    { label: 'Confirmed', bg: 'rgba(212,168,67,0.15)',  color: '#b45309' },
  emailed:   { label: 'Emailed',   bg: 'rgba(212,168,67,0.15)',  color: '#b45309' }, // set automatically right after Confirm, for both kinds
  contacted: { label: 'DMed',      bg: 'rgba(123,104,200,0.14)', color: '#5b4aa8' },
  replied:   { label: 'Responded', bg: 'rgba(74,155,127,0.15)',  color: '#2d7d5e' },
  signed:    { label: 'Signed',    bg: 'rgba(209,235,219,0.8)',  color: '#166534' },
  declined:  { label: 'Declined',  bg: 'rgba(200,104,104,0.1)',  color: '#9b2d2d' },
};
const OUTREACH_LOG_LABELS = {
  confirmed: 'Confirmed',
  email_sent: 'Email sent',
  emailed: 'Emailed',
  contacted: 'DMed on Instagram',
  replied: 'Responded',
  declined: 'Declined',
  signed: 'Signed',
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
const label = { fontSize: '0.68rem', fontWeight: 700, color: '#646B62', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem', fontFamily: 'Satoshi, sans-serif' };

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
      <span style={{ fontSize: '0.6rem', color: '#646B62', width: 44, flexShrink: 0 }}>{name}</span>
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

// Avatar with a graceful initials fallback — Instagram's scraped avatar URLs
// (from Apify/HikerAPI) are short-lived/session-scoped CDN links that
// frequently go stale, so a broken <img> swaps itself out for initials
// instead of showing the browser's broken-image icon.
function Avatar({ url, name, size = 34 }) {
  const [broken, setBroken] = useState(false);
  const initials = (name || '?')[0]?.toUpperCase();
  if (!url || broken) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: 'rgba(149,157,144,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.24), fontWeight: 700, color: '#3C5759', flexShrink: 0 }}>
        {initials}
      </div>
    );
  }
  return (
    <img src={url} alt="" onError={() => setBroken(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  );
}

// ─── Single prospect card ─────────────────────────────────────────────────────
function ProspectCard({ prospect, selected, onToggleSelect, crm }) {
  const updateStatus = useMutation(api.prospects.updateStatus);
  const update = useMutation(api.prospects.update);
  const remove = useMutation(api.prospects.remove);
  const resetToPool = useMutation(api.prospects.resetToPool);
  const generateDm = useAction(api.prospects.generateDmDraft);
  const enrich = useAction(api.prospects.enrichProspect);
  const sendSequenceEmail = useAction(api.prospects.sendSequenceEmail);
  const sendHostEmailNow = useAction(api.prospects.sendHostEmailNow);
  const sendCreatorEmailNow = useAction(api.prospects.sendCreatorEmailNow);
  const [open, setOpen] = useState(false);
  const [dmDraft, setDmDraft] = useState(prospect.dm_draft || '');
  const [emailField, setEmailField] = useState(prospect.email || '');
  const [notes, setNotes] = useState(prospect.notes || '');
  const [copied, setCopied] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState('');
  const [enrichBusy, setEnrichBusy] = useState(false);
  const [angle, setAngle] = useState('');
  const [resetting, setResetting] = useState(false);
  const [sendingStep, setSendingStep] = useState(null);
  const [seqErr, setSeqErr] = useState('');

  async function genDm() {
    setGenBusy(true); setGenErr('');
    try {
      setDmDraft(await generateDm({ id: prospect._id, angleId: angle || undefined }));
    } catch (e) {
      setGenErr((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Could not generate a draft');
    } finally {
      setGenBusy(false);
    }
  }

  async function doReset() {
    setResetting(true); setGenErr('');
    try {
      await resetToPool({ id: prospect._id });
    } catch (e) {
      setGenErr((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Reset failed');
    } finally {
      setResetting(false);
    }
  }

  async function analyze() {
    setEnrichBusy(true); setGenErr('');
    try {
      await enrich({ id: prospect._id });
    } catch (e) {
      setGenErr((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Analysis failed');
    } finally {
      setEnrichBusy(false);
    }
  }

  async function dmOnInstagram() {
    let text = dmDraft;
    if (!text) {
      // No draft yet — generate one now (using analyzed data if available)
      // instead of opening Instagram with nothing to send.
      setGenBusy(true); setGenErr('');
      try {
        text = await generateDm({ id: prospect._id, angleId: angle || undefined });
        setDmDraft(text);
      } catch (e) {
        setGenErr((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Could not generate a draft');
        setGenBusy(false);
        return;
      }
      setGenBusy(false);
    }
    try { await navigator.clipboard.writeText(text); } catch { /* clipboard unavailable */ }
    window.open(`https://ig.me/m/${prospect.instagram_handle}`, '_blank', 'noopener');
    // Moves the card into the "DMed" column the moment you actually go do
    // it — no separate click needed, for either kind. Only from earlier in
    // the pipeline, so this never rewinds a card that's already moved further.
    if (['new', 'queued', 'emailed'].includes(prospect.status)) {
      updateStatus({ id: prospect._id, status: 'contacted' }).catch(() => {});
    }
  }

  async function sendStep(step) {
    setSendingStep(step); setSeqErr('');
    try {
      // Creators only ever have step 1 (no drip sequence, no marketing_email
      // lookup) — sendSequenceEmail's host-only checks would reject them.
      if (prospect.kind === 'host') await sendSequenceEmail({ id: prospect._id, step });
      else await sendCreatorEmailNow({ id: prospect._id });
    } catch (e) {
      setSeqErr((e.data || e.message)?.replace(/^.*Error:\s*/, '') || `Could not send step ${step}`);
    } finally {
      setSendingStep(null);
    }
  }

  // Declined isn't part of the forward flow — indexOf returns -1 there, which
  // would otherwise wrap around to flow[0] ("new") and offer a nonsensical
  // "Mark new" button. Hosts always get an Emailed stop (their address is
  // looked up from their site at send time, so it's worth trying even with
  // nothing on file yet). Creators skip straight to DMed when there's no
  // email already on file — cold outreach with no address to send to just
  // isn't a step, not a step that's expected to fail.
  const creatorFlow = prospect.email ? CREATOR_STATUS_FLOW : CREATOR_STATUS_FLOW.filter((s) => s !== 'emailed');
  const flow = prospect.kind === 'host' ? HOST_STATUS_FLOW : creatorFlow;
  const flowIdx = flow.indexOf(prospect.status);
  const nextStatus = flowIdx === -1 ? undefined : flow[flowIdx + 1];
  // queued -> emailed is a real send (find/use an address, draft, send),
  // not a bare label change, so it goes through sendHostEmailNow/
  // sendCreatorEmailNow instead of the generic updateStatus every other step uses.
  const advanceIsSend = nextStatus === 'emailed';

  async function advance() {
    if (advanceIsSend) {
      setSendingStep('now'); setSeqErr('');
      try {
        if (prospect.kind === 'host') await sendHostEmailNow({ id: prospect._id });
        else await sendCreatorEmailNow({ id: prospect._id });
      } catch (e) {
        setSeqErr((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Could not send');
      } finally {
        setSendingStep(null);
      }
    } else {
      updateStatus({ id: prospect._id, status: nextStatus });
    }
  }

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
        {onToggleSelect && (
          <input type="checkbox" aria-label={`Select @${prospect.instagram_handle}`} checked={!!selected}
            onChange={() => onToggleSelect(prospect._id)} style={{ flexShrink: 0 }} />
        )}
        <Avatar url={prospect.avatar_url} name={prospect.display_name || prospect.instagram_handle} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <a href={`https://instagram.com/${prospect.instagram_handle}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '0.84rem', fontWeight: 700, color: '#192524', textDecoration: 'none' }}>
              @{prospect.instagram_handle}
            </a>
            {!crm && <StatusBadge status={prospect.status} />}
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
          <div style={{ fontSize: '0.7rem', color: '#646B62', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[prospect.display_name, fmtFollowers(prospect.follower_count) && `${fmtFollowers(prospect.follower_count)} followers`, prospect.location].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)} aria-label={open ? 'Collapse details' : 'Expand details'} aria-expanded={open} style={{ border: 'none', background: 'rgba(25,37,36,0.05)', borderRadius: 8, width: 26, height: 26, cursor: 'pointer', color: '#3C5759', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>

      {/* Quick status advance */}
      {crm ? (
        <div style={{ marginTop: '0.6rem' }}>
          {nextStatus && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
              <button onClick={advance} disabled={sendingStep === 'now'}
                style={{ padding: '0.32rem 0.8rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', opacity: sendingStep === 'now' ? 0.5 : 1 }}>
                {advanceIsSend ? (sendingStep === 'now' ? 'Emailing…' : 'Email') : `Mark ${STATUS_CFG[nextStatus].label.toLowerCase()}`}
              </button>
              {advanceIsSend && seqErr && <span style={{ fontSize: '0.66rem', color: '#9b2d2d' }}>{seqErr}</span>}
            </div>
          )}
          {prospect.status !== 'signed' && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '0.4rem' }}>
              {prospect.status !== 'declined' && (
                <button onClick={() => updateStatus({ id: prospect._id, status: 'declined' })}
                  style={{ padding: '0.32rem 0.7rem', borderRadius: 9999, border: '1px solid rgba(200,104,104,0.3)', background: 'transparent', color: '#9b2d2d', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                  Declined
                </button>
              )}
              <button onClick={doReset} disabled={resetting}
                title="Back to a fresh pool candidate — keeps the draft, clears status/queue"
                style={{ padding: '0.32rem 0.7rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', opacity: resetting ? 0.5 : 1 }}>
                {resetting ? 'Resetting…' : 'Reset'}
              </button>
            </div>
          )}
        </div>
      ) : (
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
          {prospect.status !== 'new' && prospect.status !== 'signed' && (
            <button onClick={doReset} disabled={resetting}
              title="Back to a fresh pool candidate — keeps the draft, clears status/queue"
              style={{ padding: '0.32rem 0.7rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', opacity: resetting ? 0.5 : 1 }}>
              {resetting ? 'Resetting…' : 'Reset'}
            </button>
          )}
          {prospect.email && (
            <a href={`mailto:${prospect.email}`} style={{ padding: '0.32rem 0.7rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', color: '#3C5759', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
              Email
            </a>
          )}
        </div>
      )}

      {open && (
        <div style={{ marginTop: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {prospect.bio && <p style={{ fontSize: '0.74rem', color: '#3C5759', margin: 0, lineHeight: 1.5 }}>{prospect.bio}</p>}

          <div>
            <span style={label}>Email{prospect.kind === 'creator' && !prospect.email ? ' — none on file, so this one goes straight to DM' : ''}</span>
            <input type="email" value={emailField} onChange={e => setEmailField(e.target.value)}
              onBlur={() => emailField.trim() !== (prospect.email || '') && update({ id: prospect._id, email: emailField.trim() })}
              placeholder="Found automatically from their bio when the search tool sees one" spellCheck={false}
              style={{ ...input, width: '100%' }} />
          </div>

          {/* Profile analysis: score breakdown when enriched, Analyze button otherwise */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{ ...label, display: 'inline', marginBottom: 0 }}>Profile analysis</span>
              <button onClick={analyze} disabled={enrichBusy}
                style={{ padding: '0.2rem 0.6rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.66rem', fontWeight: 600, cursor: 'pointer', opacity: enrichBusy ? 0.5 : 1 }}>
                {enrichBusy ? 'Analyzing…' : prospect.enriched_at ? 'Re-analyze' : 'Analyze profile'}
              </button>
              {prospect.enriched_at && (
                <span style={{ fontSize: '0.64rem', color: '#646B62' }}>
                  {new Date(prospect.enriched_at).toLocaleDateString()}
                  {prospect.avg_video_views ? ` · ~${fmtFollowers(prospect.avg_video_views)} avg views` : ''}
                </span>
              )}
            </div>
            {prospect.enriched_at
              ? <ScoreBars p={prospect} />
              : <p style={{ fontSize: '0.7rem', color: '#646B62', margin: 0 }}>Not analyzed yet — pulls their recent posts to score reach, views, and quality (uses Apify credits).</p>}
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
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {prospect.kind === 'host' && (
                <select aria-label="Copy angle" value={angle} onChange={(e) => setAngle(e.target.value)}
                  title="Pick a specific angle, or leave on Auto-rotate to balance across all 5"
                  style={{ ...input, padding: '0.3rem 0.5rem', fontSize: '0.68rem', width: 132 }}>
                  <option value="">Auto-rotate angle</option>
                  {Object.entries(ANGLE_LABELS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              )}
              <button onClick={genDm} disabled={genBusy}
                style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', opacity: genBusy ? 0.5 : 1 }}>
                {genBusy ? 'Writing…' : dmDraft ? 'Rewrite DM' : 'Generate DM'}
              </button>
              <button onClick={copyDm} disabled={!dmDraft}
                style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: copied ? 'rgba(209,235,219,0.6)' : 'transparent', color: copied ? '#166534' : '#3C5759', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
                {copied ? 'Copied' : 'Copy DM'}
              </button>
              <button onClick={dmOnInstagram} disabled={genBusy}
                title={dmDraft ? 'Copies the draft, then opens their Instagram DM thread' : 'Generates a draft (using Analyze profile data if available), copies it, then opens their Instagram DM thread'}
                style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: '1px solid rgba(123,104,200,0.35)', background: 'rgba(123,104,200,0.08)', color: '#5b4aa8', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', opacity: genBusy ? 0.5 : 1 }}>
                {genBusy && !dmDraft ? 'Writing…' : 'DM on Instagram ↗'}
              </button>
              {genErr && <span style={{ fontSize: '0.68rem', color: '#9b2d2d', alignSelf: 'center' }}>{genErr}</span>}
            </div>
          </div>
          {(prospect.marketing_email || (prospect.email_sequence?.length > 0)) && (
            <div>
              <span style={label}>Email sequence{prospect.marketing_email ? ` · ${prospect.marketing_email}` : ''}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {(prospect.email_sequence || []).map((e) => (
                  <div key={e.step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: '#3C5759' }}>
                    <span style={{ fontWeight: 700, minWidth: 46 }}>Step {e.step}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</span>
                    {e.sent_at ? (
                      <span style={{ color: '#166534', fontSize: '0.68rem', flexShrink: 0 }}>Sent {new Date(e.sent_at).toLocaleDateString()}</span>
                    ) : (
                      <button onClick={() => sendStep(e.step)} disabled={sendingStep === e.step}
                        style={{ padding: '0.2rem 0.6rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.66rem', fontWeight: 700, cursor: 'pointer', opacity: sendingStep === e.step ? 0.5 : 1, flexShrink: 0 }}>
                        {sendingStep === e.step ? 'Sending…' : 'Send'}
                      </button>
                    )}
                  </div>
                ))}
                {seqErr && <span style={{ fontSize: '0.68rem', color: '#9b2d2d' }}>{seqErr}</span>}
              </div>
            </div>
          )}

          {prospect.outreach_log?.length > 0 && (
            <div>
              <span style={label}>Outreach history</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                {prospect.outreach_log.map((e, i) => (
                  <div key={i} style={{ fontSize: '0.7rem', color: '#646B62' }}>
                    {new Date(e.at).toLocaleDateString()} — {OUTREACH_LOG_LABELS[e.type] || e.type}{e.note ? ` (${e.note})` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}

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

// ─── Add prospect form ────────────────────────────────────────────────────────
function AddProspectForm({ onDone, defaultKind = 'creator' }) {
  const add = useMutation(api.prospects.add);
  const [kind, setKind] = useState(defaultKind);
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
      setErr((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Could not add prospect');
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
// Minimal dependency-free CSV parser — handles quoted fields (commas,
// newlines, escaped "" inside quotes), mirroring csvEscape's escaping above.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const CSV_HEADER_ALIASES = {
  instagram_handle: ['instagram handle', 'handle', 'username', 'instagram'],
  display_name: ['name', 'display name'],
  location: ['location'],
  niche: ['niche'],
  follower_count: ['followers', 'follower count'],
  email: ['email'],
  bio: ['bio'],
  website: ['website'],
};

// Header-matches loosely (case-insensitive) against known aliases so an
// export from this same app (downloadHostsCsv) or a hand-built spreadsheet
// both work without the admin needing to match exact column names.
function rowsFromCsv(text) {
  const table = parseCsv(text);
  if (table.length < 2) return [];
  const headerRow = table[0].map((h) => h.trim().toLowerCase());
  const fieldForCol = headerRow.map((h) => {
    const entry = Object.entries(CSV_HEADER_ALIASES).find(([, aliases]) => aliases.includes(h));
    return entry?.[0];
  });
  const rows = [];
  for (const line of table.slice(1)) {
    const row = {};
    line.forEach((val, i) => {
      const field = fieldForCol[i];
      if (!field || !val.trim()) return;
      row[field] = field === 'follower_count' ? parseInt(val.replace(/[^\d]/g, ''), 10) || undefined : val.trim();
    });
    if (row.instagram_handle) {
      row.instagram_handle = row.instagram_handle.replace(/^@/, '');
      rows.push(row);
    }
  }
  return rows;
}

// ─── CSV import (bring your own list — an export from here, or a curated sheet) ──
function CsvImport() {
  const importCsvRows = useAction(api.prospects.importCsvRows);
  const [kind, setKind] = useState('creator');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');

  const parsed = text.trim() ? rowsFromCsv(text) : [];

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ''));
    reader.readAsText(file);
    e.target.value = '';
  }

  async function run() {
    if (!parsed.length) return;
    setBusy(true); setResult('');
    try {
      const r = await importCsvRows({ kind, rows: parsed });
      setResult(`Imported ${r.inserted} new of ${r.fetched} rows.`);
      setText('');
    } catch (e) {
      setResult((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
        <select aria-label="Import as" value={kind} onChange={e => setKind(e.target.value)} style={{ ...input, width: 100 }}>
          <option value="creator">Creators</option>
          <option value="host">Hosts</option>
        </select>
        <label style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: 'transparent', color: '#192524', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
          Choose CSV file
          <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
        </label>
        <span style={{ fontSize: '0.7rem', color: '#646B62' }}>or paste CSV text below</span>
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="Instagram handle,Name,Location,Niche,Followers,Email,Bio,Website"
        rows={5} style={{ ...input, width: '100%', resize: 'vertical', fontSize: '0.72rem', fontFamily: 'monospace' }} />
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
        <button onClick={run} disabled={busy || !parsed.length}
          style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', opacity: (busy || !parsed.length) ? 0.5 : 1 }}>
          {busy ? 'Importing…' : `Import ${parsed.length || ''} row${parsed.length === 1 ? '' : 's'}`.trim()}
        </button>
        {result && <span style={{ fontSize: '0.72rem', color: result.startsWith('Imported') ? '#2d7d5e' : '#9b2d2d' }}>{result}</span>}
      </div>
      <p style={{ fontSize: '0.68rem', color: '#646B62', margin: '0.5rem 0 0' }}>
        First row must be a header. Recognized columns (any order, case-insensitive): Instagram handle, Name, Location, Niche, Followers, Email, Bio, Website. Only Instagram handle is required.
      </p>
    </div>
  );
}

// ─── Find creators (niche search + ranked top 10) ─────────────────────────────
function FindCreators() {
  const search = useAction(api.prospects.searchCreators);
  const [tags, setTags] = useState('');
  const [loc, setLoc] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [results, setResults] = useState(null); // { imported, fetched, ranked }

  async function run() {
    if (!tags.trim()) return;
    setBusy(true); setErr(''); setResults(null);
    try {
      // No niche dropdown — discoverAndScore already falls back to using
      // whatever string it's given verbatim as the search term when it
      // isn't one of the recognized NICHE_SEARCH_TERMS keys, so free-text
      // tags work here with no backend change needed.
      setResults(await search({ niche: tags.trim(), location: loc.trim() || undefined }));
    } catch (e) {
      setErr((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Search failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input aria-label="Creator tags" value={tags} onChange={e => setTags(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()}
          placeholder='Creator tags, e.g. "sunset yoga retreat"' style={{ ...input, flex: 2, minWidth: 200 }} />
        <input aria-label="Location" value={loc} onChange={e => setLoc(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()}
          placeholder="Location (optional), e.g. Asheville" style={{ ...input, flex: 1, minWidth: 180 }} />
        <button onClick={run} disabled={busy || !tags.trim()}
          style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', opacity: (busy || !tags.trim()) ? 0.5 : 1 }}>
          {busy ? 'Searching…' : 'Search'}
        </button>
        {busy && <span style={{ fontSize: '0.7rem', color: '#646B62' }}>Scraping + scoring the top 10 — this can take a minute.</span>}
        {err && <span style={{ fontSize: '0.72rem', color: '#9b2d2d', width: '100%' }}>{err}</span>}
      </div>

      {results && (
        <div style={{ marginTop: '0.9rem' }}>
          <p style={{ fontSize: '0.72rem', color: '#646B62', margin: '0 0 0.5rem' }}>
            Found {results.fetched}, imported {results.imported} new. Top {results.ranked.length} by fit score — all are saved as prospects below.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {results.ranked.map((p, i) => {
              const post = bestPost(p);
              return (
                <div key={String(p._id)} style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', padding: '0.55rem 0.65rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(25,37,36,0.07)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#646B62', width: 16, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                  <Avatar url={p.avatar_url} name={p.display_name || p.instagram_handle} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <a href={`https://instagram.com/${p.instagram_handle}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '0.8rem', fontWeight: 700, color: '#192524', textDecoration: 'none' }}>
                        @{p.instagram_handle}
                      </a>
                      <span style={{ fontSize: '0.68rem', color: '#646B62' }}>{fmtFollowers(p.follower_count)} followers{p.avg_video_views ? ` · ~${fmtFollowers(p.avg_video_views)} avg views` : ''}</span>
                    </div>
                    {post?.caption && (
                      <div style={{ fontSize: '0.66rem', color: '#646B62', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        “{post.caption.slice(0, 90)}”
                      </div>
                    )}
                  </div>
                  <div style={{ width: 150, flexShrink: 0 }}><ScoreBars p={p} /></div>
                  <ScoreChip score={p.score} />
                </div>
              );
            })}
            {results.ranked.length === 0 && <p style={{ fontSize: '0.74rem', color: '#646B62', margin: 0 }}>No creators found for that search.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// Suggested regions for the host auto-search's "+ Add profile" button —
// starts dense in Southeast Asia (where Ben actually lives/travels, so
// bios/niches are easiest to judge) then branches out to other major
// boutique-stay tourist hubs. Just a prefill; fully editable in the UI.
const DEFAULT_HOST_DISCOVERY_REGIONS = [
  'villa Lombok', 'boutique hotel Bali', 'villa Canggu', 'boutique hotel Ubud',
  'boutique hotel Jakarta', 'boutique hotel Yogyakarta', 'boutique hotel Bandung',
  'boutique hotel Bangkok', 'boutique hotel Chiang Mai', 'boutique hotel Phuket', 'boutique hotel Koh Samui',
  'boutique hotel Hanoi', 'boutique hotel Hoi An', 'boutique hotel Siem Reap',
  'boutique hotel Manila', 'boutique hotel Palawan', 'boutique hotel Singapore', 'boutique hotel Kuala Lumpur',
  'boutique hotel Tulum', 'boutique hotel Lisbon', 'boutique hotel Tuscany',
  'boutique hotel Santorini', 'boutique hotel Marrakech', 'boutique hotel Byron Bay', 'boutique hotel Costa Rica',
];

// Short random id for profile rows — not security-sensitive, just needs to
// be unique enough to key a list and target updates.
function rid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Host auto-discovery config (daily cron — every profile toggled On runs every day) ──
function HostAutoDiscoveryCard() {
  const settings = useQuery(api.admin.getSettings);
  const setSetting = useMutation(api.admin.setSetting);
  const saved = (() => {
    try { return JSON.parse(settings?.host_discovery_auto || 'null') || {}; } catch { return {}; }
  })();
  const [draft, setDraft] = useState(null); // null = mirror saved
  const profiles = draft ?? (saved.profiles?.length ? saved.profiles : [
    { id: 'default', enabled: false, query: DEFAULT_HOST_DISCOVERY_REGIONS[0], perDay: 50 },
  ]);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [collapsed, setCollapsed] = useState(true);

  // `updater` reads the previous array via React's functional setState form,
  // not the `profiles` closed over at render time — toggling one row right
  // after editing another (onBlur fires async) previously clobbered
  // whichever field saved first, since both closed over the same stale
  // snapshot. See the equivalent fix in the creator AutoDiscoveryCard.
  async function save(updater) {
    let merged;
    setDraft(prev => {
      merged = updater(prev ?? profiles);
      return merged;
    });
    try {
      await setSetting({ key: 'host_discovery_auto', value: JSON.stringify({ profiles: merged }) });
      setErrorMsg('');
      setSavedMsg('Saved');
      setTimeout(() => setSavedMsg(''), 2000);
    } catch (e) {
      setErrorMsg((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Save failed');
    }
  }

  function updateProfile(id, patch) {
    setDraft(prev => (prev ?? profiles).map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function nextSuggestedQuery(list) {
    const used = new Set(list.map((p) => p.query));
    return DEFAULT_HOST_DISCOVERY_REGIONS.find((r) => !used.has(r)) || '';
  }

  const enabledCount = profiles.filter((p) => p.enabled).length;
  const dailyTotal = profiles.filter((p) => p.enabled).reduce((s, p) => s + (p.perDay || 0), 0);

  return (
    <div style={{ padding: '0.7rem 0.9rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(25,37,36,0.08)', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#192524' }}>Daily auto-search</span>
        <span style={{ fontSize: '0.7rem', color: '#646B62' }}>
          {enabledCount > 0 ? `${enabledCount} profile${enabledCount === 1 ? '' : 's'} on · ~${dailyTotal}/day at 7:30am UTC` : 'All profiles off'}
        </span>
        {savedMsg && <span style={{ fontSize: '0.7rem', color: '#166534' }}>{savedMsg}</span>}
        {errorMsg && <span style={{ fontSize: '0.7rem', color: '#9b2d2d', fontWeight: 700 }}>{errorMsg}</span>}
        <button onClick={() => setCollapsed((c) => !c)}
          style={{ marginLeft: 'auto', padding: '0.25rem 0.6rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}>
          {collapsed ? 'Edit ▾' : 'Minimize ▴'}
        </button>
      </div>
      {!collapsed && (
        <div style={{ marginTop: '0.6rem' }}>
          {profiles.map((p) => (
            <div key={p.id} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.4rem' }}>
              <button onClick={() => save((prev) => prev.map((x) => (x.id === p.id ? { ...x, enabled: !x.enabled } : x)))}
                role="switch" aria-checked={p.enabled}
                style={{ padding: '0.35rem 0.8rem', borderRadius: 9999, border: 'none', background: p.enabled ? '#166534' : 'rgba(25,37,36,0.12)', color: p.enabled ? '#fff' : '#3C5759', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                {p.enabled ? 'On' : 'Off'}
              </button>
              <input aria-label="Search query" value={p.query} onChange={(e) => updateProfile(p.id, { query: e.target.value })}
                onBlur={() => save((prev) => prev)}
                placeholder='e.g. "boutique hotel Bali"' style={{ ...input, flex: 1, minWidth: 180 }} />
              <label style={{ fontSize: '0.72rem', color: '#3C5759', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                Per day
                <input aria-label="Hosts per day" type="number" min="5" max="100" value={p.perDay}
                  onChange={(e) => updateProfile(p.id, { perDay: Math.max(5, Math.min(100, parseInt(e.target.value, 10) || 50)) })}
                  onBlur={() => save((prev) => prev)}
                  style={{ ...input, width: 64, padding: '0.3rem 0.5rem' }} />
              </label>
              <button onClick={() => save((prev) => prev.filter((x) => x.id !== p.id))} title="Remove this profile"
                style={{ padding: '0.3rem 0.6rem', borderRadius: 9999, border: 'none', background: 'transparent', color: '#9b2d2d', fontSize: '0.8rem', cursor: 'pointer' }}>
                ×
              </button>
            </div>
          ))}
          <button onClick={() => save((prev) => [...prev, { id: rid(), enabled: false, query: nextSuggestedQuery(prev), perDay: 50 }])}
            style={{ padding: '0.35rem 0.8rem', borderRadius: 9999, border: '1.5px dashed rgba(25,37,36,0.25)', background: 'transparent', color: '#3C5759', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
            + Add profile
          </button>
          <p style={{ fontSize: '0.68rem', color: '#646B62', margin: '0.5rem 0 0' }}>
            Every profile toggled On runs every day — no more rotation, so more profiles means more Apify/HikerAPI credits used.
          </p>
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
      setMsg((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Import failed');
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
    <div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
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
        {msg && <span style={{ fontSize: '0.72rem', color: '#646B62' }}>{msg}</span>}
      </div>
    </div>
  );
}


function HostOutreachCampaign() {
  const pool = useQuery(api.prospects.getHostPool) || [];
  const confirmBatch = useAction(api.prospects.confirmHostBatch);
  const remove = useMutation(api.prospects.remove);

  const [filterText, setFilterText] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const filteredPool = pool.filter((p) => {
    if (!filterText.trim()) return true;
    const t = filterText.toLowerCase();
    return p.instagram_handle.toLowerCase().includes(t)
      || (p.display_name || '').toLowerCase().includes(t)
      || (p.location || '').toLowerCase().includes(t)
      || (p.niche || '').toLowerCase().includes(t)
      || (p.bio || '').toLowerCase().includes(t);
  });

  const allSelected = filteredPool.length > 0 && filteredPool.every((p) => selected.has(String(p._id)));
  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(filteredPool.map((p) => String(p._id))));
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
      setMsg(`Confirmed ${r.confirmed} — drafted with the NVIDIA model. Find them in Host CRM → Confirmed to copy + send.`);
      setSelected(new Set());
    } catch (e) {
      setErr((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Confirm failed');
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (selected.size === 0) return;
    setDeleting(true); setErr(''); setMsg('');
    try {
      const ids = [...selected];
      await Promise.all(ids.map((id) => remove({ id })));
      setMsg(`Removed ${ids.length} from the pool.`);
      setSelected(new Set());
    } catch (e) {
      setErr((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

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
          <button onClick={toggleSelectAll}
            style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: allSelected ? '#192524' : 'transparent', color: allSelected ? '#fff' : '#3C5759', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <button onClick={doConfirm} disabled={busy || selected.size === 0}
            style={{ padding: '0.4rem 1rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', opacity: (busy || selected.size === 0) ? 0.5 : 1 }}>
            {busy ? 'Confirming…' : `Confirm (${selected.size})`}
          </button>
          <button onClick={doDelete} disabled={deleting || selected.size === 0}
            style={{ padding: '0.4rem 1rem', borderRadius: 9999, border: '1.5px solid rgba(200,104,104,0.35)', background: 'transparent', color: '#9b2d2d', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', opacity: (deleting || selected.size === 0) ? 0.5 : 1 }}>
            {deleting ? 'Deleting…' : `Delete (${selected.size})`}
          </button>
        </div>
        {msg && <p style={{ fontSize: '0.74rem', color: '#166534', margin: '0 0 0.5rem' }}>{msg}</p>}
        {err && <p style={{ fontSize: '0.74rem', color: '#9b2d2d', margin: '0 0 0.5rem' }}>{err}</p>}

        {filteredPool.length === 0 ? (
          <p style={{ fontSize: '0.76rem', color: '#646B62' }}>No candidates yet — search above to import some.</p>
        ) : (
          <div style={{ maxHeight: '18rem', overflowY: 'auto', border: '1px solid rgba(25,37,36,0.08)', borderRadius: '0.75rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#646B62', fontSize: '0.64rem', textTransform: 'uppercase', position: 'sticky', top: 0, background: '#fdfdfb' }}>
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
                      {p.display_name && <span style={{ color: '#646B62' }}> · {p.display_name}</span>}
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

      <HostAutoDiscoveryCard />
    </div>
  );
}

// ─── Host CRM board — kanban across the full lifecycle ─────────────────────────
// "queued" is what Host Outreach's Confirm sets — displayed here as
// "Confirmed" since that's the lifecycle stage it actually represents.
// Plain "new" (unconfirmed pool candidates) live only in Host Outreach, not
// on this board.
const CRM_COLUMNS = [
  { id: 'queued', label: 'Confirmed' },
  { id: 'emailed', label: 'Emailed' },
  { id: 'contacted', label: 'DMed' },
  { id: 'replied', label: 'Responded' },
  { id: 'signed', label: 'Signed // Onboarding' },
  { id: 'declined', label: 'Declined' },
];

// Most recent outreach_log entry (or _creationTime if no log yet) — used to
// sort every column newest-activity-first, so a card that just moved into a
// column (or was just imported, for a column with no log entries) surfaces
// at the top instead of getting buried under older ones.
function lastActivityAt(p) {
  const log = p.outreach_log;
  return log?.length ? log[log.length - 1].at : p._creationTime;
}

function HostCrmBoard() {
  const [tier, setTier] = useState('');
  const [location, setLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [dragId, setDragId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [emailBulkBusy, setEmailBulkBusy] = useState(false);
  const [emailBulkMsg, setEmailBulkMsg] = useState('');

  const generateDrafts = useAction(api.prospects.generateDraftsForSelected);
  const scheduleBulkEmail = useAction(api.prospects.scheduleBulkEmail);
  const updateStatus = useMutation(api.prospects.updateStatus);

  const hosts = useQuery(api.prospects.getByKind, {
    kind: 'host',
    tier: tier || undefined,
    location: location || undefined,
  }) || [];

  const filtered = hosts.filter((p) => {
    if (p.status === 'new') return false; // pool candidates live in Host Outreach only
    if (!filterText.trim()) return true;
    const t = filterText.toLowerCase();
    return p.instagram_handle.toLowerCase().includes(t)
      || (p.display_name || '').toLowerCase().includes(t)
      || (p.location || '').toLowerCase().includes(t)
      || (p.niche || '').toLowerCase().includes(t);
  });

  const byColumn = {};
  for (const col of CRM_COLUMNS) byColumn[col.id] = [];
  for (const p of filtered) (byColumn[p.status] || byColumn.queued).push(p);
  for (const col of CRM_COLUMNS) byColumn[col.id].sort((a, b) => lastActivityAt(b) - lastActivityAt(a));

  // Per-column select-all — a global one selected across every stage at
  // once, which was rarely what you wanted (e.g. bulk-emailing the whole
  // board instead of just Confirmed). One small checkbox per column header
  // instead.
  function isColumnSelected(colId) {
    const items = byColumn[colId];
    return items.length > 0 && items.every((p) => selected.has(String(p._id)));
  }
  function toggleColumnSelectAll(colId) {
    const items = byColumn[colId];
    const allOn = isColumnSelected(colId);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of items) {
        const key = String(p._id);
        if (allOn) next.delete(key); else next.add(key);
      }
      return next;
    });
  }
  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function bulkGenerate() {
    if (selected.size === 0) return;
    setBulkBusy(true); setBulkMsg('');
    try {
      const r = await generateDrafts({ ids: [...selected] });
      setBulkMsg(`Drafted ${r.drafted} of ${selected.size} selected.`);
      setSelected(new Set());
    } catch (e) {
      setBulkMsg((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Bulk draft failed');
    } finally {
      setBulkBusy(false);
    }
  }

  // Drip-sends 1/minute instead of firing every selected host's email at
  // once — a burst of sends reads as a blast to receiving mail providers.
  // Returns immediately; the actual sends happen over the following minutes
  // via the Convex scheduler.
  async function bulkSendEmails() {
    if (selected.size === 0) return;
    setEmailBulkBusy(true); setEmailBulkMsg('');
    try {
      const ids = [...selected];
      const r = await scheduleBulkEmail({ ids, kind: 'host', intervalSeconds: 60 });
      setEmailBulkMsg(r.spanMinutes > 0 ? `Scheduled ${r.scheduled} — sending 1/minute over the next ${r.spanMinutes} min.` : `Sending ${r.scheduled} now.`);
      setSelected(new Set());
    } catch (e) {
      setEmailBulkMsg((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Bulk email failed');
    } finally {
      setEmailBulkBusy(false);
    }
  }

  function handleDrop(colId) {
    setDragOverCol(null);
    if (dragId) updateStatus({ id: dragId, status: colId }).catch(() => {});
    setDragId(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: showFilters ? '0.5rem' : '0.85rem' }}>
        <input aria-label="Search hosts" value={filterText} onChange={(e) => setFilterText(e.target.value)}
          placeholder="Search by name, location, niche…" style={{ ...input, width: 220, padding: '0.4rem 0.65rem', fontSize: '0.76rem' }} />
        <button onClick={() => setShowFilters((s) => !s)}
          style={{ padding: '0.35rem 0.8rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: showFilters ? 'rgba(25,37,36,0.06)' : 'transparent', color: '#3C5759', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}>
          Filters{(tier || location) ? ' •' : ''} {showFilters ? '▴' : '▾'}
        </button>
        <button onClick={bulkGenerate} disabled={bulkBusy || selected.size === 0}
          title="Drafts a message for each selected host, rotating through the 5 angle templates"
          style={{ padding: '0.35rem 0.8rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', opacity: (bulkBusy || selected.size === 0) ? 0.5 : 1 }}>
          {bulkBusy ? 'Drafting…' : `Draft DMs for selected (${selected.size})`}
        </button>
        <button onClick={bulkSendEmails} disabled={emailBulkBusy || selected.size === 0}
          title="Drip-sends the cold outreach email to every selected host, 1/minute, over the next several minutes"
          style={{ padding: '0.35rem 0.8rem', borderRadius: 9999, border: 'none', background: '#166534', color: '#fff', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', opacity: (emailBulkBusy || selected.size === 0) ? 0.5 : 1 }}>
          {emailBulkBusy ? 'Emailing…' : `Email selected (${selected.size})`}
        </button>
        <button onClick={() => downloadHostsCsv(filtered, `collabnb-hosts-${new Date().toISOString().slice(0, 10)}.csv`)}
          disabled={filtered.length === 0}
          style={{ padding: '0.35rem 0.9rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: 'transparent', color: '#192524', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', opacity: filtered.length === 0 ? 0.5 : 1 }}>
          Download CSV
        </button>
        {bulkMsg && <span style={{ fontSize: '0.72rem', color: '#166534' }}>{bulkMsg}</span>}
        {emailBulkMsg && <span style={{ fontSize: '0.72rem', color: '#166534' }}>{emailBulkMsg}</span>}
      </div>

      {showFilters && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.85rem', padding: '0.5rem 0.6rem', borderRadius: '0.6rem', background: 'rgba(25,37,36,0.04)' }}>
          <select aria-label="Filter by tier" value={tier} onChange={(e) => setTier(e.target.value)} style={{ ...input, padding: '0.4rem 0.6rem', fontSize: '0.76rem' }}>
            <option value="">All tiers</option>
            {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input aria-label="Filter by location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" style={{ ...input, width: 130, padding: '0.4rem 0.6rem', fontSize: '0.76rem' }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.25rem', overflowX: 'auto', paddingBottom: '0.5rem', alignItems: 'flex-start' }}>
        {CRM_COLUMNS.map((col) => (
          <div key={col.id}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
            onDragLeave={() => setDragOverCol((c) => (c === col.id ? null : c))}
            onDrop={(e) => { e.preventDefault(); handleDrop(col.id); }}
            style={{
              flex: '0 0 280px', width: 280, borderRadius: dragOverCol === col.id ? '0.875rem' : 0,
              background: dragOverCol === col.id ? 'rgba(123,104,200,0.06)' : 'transparent',
              outline: dragOverCol === col.id ? '1.5px dashed rgba(123,104,200,0.4)' : 'none',
              padding: dragOverCol === col.id ? '0.5rem' : 0,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', padding: '0 0.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input type="checkbox" aria-label={`Select all in ${col.label}`} disabled={byColumn[col.id].length === 0}
                  checked={isColumnSelected(col.id)} onChange={() => toggleColumnSelectAll(col.id)} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#192524' }}>{col.label}</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#646B62' }}>{byColumn[col.id].length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '75vh', overflowY: 'auto', minHeight: '2rem' }}>
              {byColumn[col.id].map((p) => (
                <div key={String(p._id)} draggable onDragStart={() => setDragId(p._id)} onDragEnd={() => setDragId(null)}
                  title="Drag to move to another column" style={{ cursor: 'grab' }}>
                  <ProspectCard prospect={p} selected={selected.has(String(p._id))} onToggleSelect={toggleOne} crm />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Creators don't have a separate search/select/confirm screen the way hosts
// do (Find creators / Auto-discovery / Import already feed the pool directly)
// — so unlike CRM_COLUMNS, a "New" column stays on this board and "Confirm
// selected" is the search->pipeline gate, mirroring what confirmHostBatch
// does for hosts (move to Confirmed, then best-effort auto-email).
const CREATOR_CRM_COLUMNS = [
  { id: 'new', label: 'New' },
  { id: 'queued', label: 'Confirmed' },
  { id: 'emailed', label: 'Emailed' },
  { id: 'contacted', label: 'DMed' },
  { id: 'replied', label: 'Responded' },
  { id: 'signed', label: 'Signed // Onboarding' },
  { id: 'declined', label: 'Declined' },
];

function CreatorCrmBoard() {
  const [tier, setTier] = useState('');
  const [location, setLocation] = useState('');
  const [filterText, setFilterText] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [dragId, setDragId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [emailBulkBusy, setEmailBulkBusy] = useState(false);
  const [emailBulkMsg, setEmailBulkMsg] = useState('');

  const generateDrafts = useAction(api.prospects.generateDraftsForSelected);
  const scheduleBulkEmail = useAction(api.prospects.scheduleBulkEmail);
  const updateStatus = useMutation(api.prospects.updateStatus);

  const creators = useQuery(api.prospects.getByKind, {
    kind: 'creator',
    tier: tier || undefined,
    location: location || undefined,
  }) || [];

  // getByKind sorts by fit score (best for hosts' pool, where quality
  // ranking matters) — creators need the newest arrivals surfaced instead,
  // so whatever just got confirmed/emailed/DMed or freshly imported is easy
  // to find without hunting. Same lastActivityAt used by HostCrmBoard.
  const filtered = creators.filter((p) => {
    if (!filterText.trim()) return true;
    const t = filterText.toLowerCase();
    return p.instagram_handle.toLowerCase().includes(t)
      || (p.display_name || '').toLowerCase().includes(t)
      || (p.location || '').toLowerCase().includes(t)
      || (p.niche || '').toLowerCase().includes(t);
  });

  const byColumn = {};
  for (const col of CREATOR_CRM_COLUMNS) byColumn[col.id] = [];
  for (const p of filtered) (byColumn[p.status] || byColumn.new).push(p);
  for (const col of CREATOR_CRM_COLUMNS) byColumn[col.id].sort((a, b) => lastActivityAt(b) - lastActivityAt(a));

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(String(p._id)));
  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map((p) => String(p._id))));
  }
  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // Select every card in one column without touching selections elsewhere —
  // the toolbar's "Select all" spans every column, which isn't what you want
  // when you're only working through, say, the New column right now.
  function toggleColumn(colId) {
    const ids = byColumn[colId].map((p) => String(p._id));
    const allIn = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allIn ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  const activeFilterCount = (tier ? 1 : 0) + (location ? 1 : 0);

  // Lightweight autocomplete off the pool already loaded client-side — not a
  // separate search index, just distinct values matching what's typed so far.
  const suggestions = (() => {
    if (!filterText.trim()) return [];
    const t = filterText.toLowerCase();
    const vals = new Set();
    for (const p of creators) {
      if (p.display_name?.toLowerCase().includes(t)) vals.add(p.display_name);
      if (p.instagram_handle.toLowerCase().includes(t)) vals.add(`@${p.instagram_handle}`);
      if (p.location?.toLowerCase().includes(t)) vals.add(p.location);
      if (p.niche?.toLowerCase().includes(t)) vals.add(p.niche);
      if (vals.size >= 8) break;
    }
    return [...vals].slice(0, 8);
  })();

  async function bulkGenerate() {
    if (selected.size === 0) return;
    setBulkBusy(true); setBulkMsg('');
    try {
      const r = await generateDrafts({ ids: [...selected] });
      setBulkMsg(`Drafted ${r.drafted} of ${selected.size} selected.`);
      setSelected(new Set());
    } catch (e) {
      setBulkMsg((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Bulk draft failed');
    } finally {
      setBulkBusy(false);
    }
  }

  // The search->pipeline gate: moves selected New/pool creators to Confirmed,
  // then fires the welcome email for each best-effort (a missing address on
  // one creator never blocks the rest) — same shape as confirmHostBatch's
  // confirm-then-kickoff-email flow for hosts.
  // Confirm only moves them into the pipeline — it does NOT email. Sending
  // is always a separate, deliberate click ("Email selected" below, or
  // "Email" on one card) so nothing reaches a real inbox without that.
  async function bulkConfirm() {
    if (selected.size === 0) return;
    setConfirmBusy(true); setConfirmMsg('');
    try {
      const ids = [...selected];
      await Promise.allSettled(ids.map((id) => updateStatus({ id, status: 'queued' })));
      setConfirmMsg(`Confirmed ${ids.length}.`);
      setSelected(new Set());
    } catch (e) {
      setConfirmMsg((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Confirm failed');
    } finally {
      setConfirmBusy(false);
    }
  }

  // Explicit, separate send — only fires for whichever selected creators
  // actually have an email on file; the rest are DM-only and just get
  // skipped (not reported as a failure).
  // Drip-sends 1/minute instead of firing every selected creator's email at
  // once — same reasoning as HostCrmBoard's bulkSendEmails. Only creators
  // with an address get scheduled; the rest are DM-only and just skipped.
  async function bulkEmail() {
    if (selected.size === 0) return;
    setEmailBulkBusy(true); setEmailBulkMsg('');
    try {
      const ids = [...selected];
      const byId = new Map(creators.map((p) => [String(p._id), p]));
      const withEmail = ids.filter((id) => byId.get(id)?.email);
      const skipped = ids.length - withEmail.length;
      if (withEmail.length === 0) {
        setEmailBulkMsg(`Nothing to send — all ${ids.length} skipped (no email on file).`);
      } else {
        const r = await scheduleBulkEmail({ ids: withEmail, kind: 'creator', intervalSeconds: 60 });
        setEmailBulkMsg(
          (r.spanMinutes > 0 ? `Scheduled ${r.scheduled} — sending 1/minute over the next ${r.spanMinutes} min` : `Sending ${r.scheduled} now`)
          + (skipped ? `, ${skipped} skipped (no email on file).` : '.')
        );
      }
      setSelected(new Set());
    } catch (e) {
      setEmailBulkMsg((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Bulk email failed');
    } finally {
      setEmailBulkBusy(false);
    }
  }

  function handleDrop(colId) {
    setDragOverCol(null);
    if (dragId) updateStatus({ id: dragId, status: colId }).catch(() => {});
    setDragId(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.85rem' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
          <input aria-label="Search creators" value={filterText}
            onChange={(e) => { setFilterText(e.target.value); setSuggestOpen(true); }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
            placeholder="Search by name, handle, location, niche…"
            style={{ ...input, width: '100%', padding: '0.4rem 2.2rem 0.4rem 0.65rem', fontSize: '0.76rem' }} />
          <button onClick={() => setFilterOpen((o) => !o)} aria-label="Tier and location filters" title="Filter by tier or location"
            style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: '50%', border: 'none', background: activeFilterCount ? 'rgba(123,104,200,0.15)' : 'transparent', color: activeFilterCount ? '#5b4aa8' : '#646B62', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16l-6.5 8.5v6L10.5 20v-7.5L4 4z"/></svg>
            {activeFilterCount > 0 && <span style={{ position: 'absolute', top: 1, right: 1, width: 7, height: 7, borderRadius: '50%', background: '#5b4aa8' }} />}
          </button>

          {suggestOpen && suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid rgba(25,37,36,0.12)', borderRadius: '0.6rem', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: 190, overflowY: 'auto', zIndex: 20 }}>
              {suggestions.map((s) => (
                <div key={s} onMouseDown={() => { setFilterText(s.replace(/^@/, '')); setSuggestOpen(false); }}
                  style={{ padding: '0.4rem 0.65rem', fontSize: '0.74rem', color: '#3C5759', cursor: 'pointer' }}>
                  {s}
                </div>
              ))}
            </div>
          )}

          {filterOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid rgba(25,37,36,0.12)', borderRadius: '0.6rem', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', padding: '0.6rem', zIndex: 21, display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 170 }}>
              <select aria-label="Filter by tier" value={tier} onChange={(e) => setTier(e.target.value)} style={{ ...input, fontSize: '0.76rem', padding: '0.35rem 0.5rem' }}>
                <option value="">All tiers</option>
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input aria-label="Filter by location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location"
                style={{ ...input, fontSize: '0.76rem', padding: '0.35rem 0.5rem' }} />
              {activeFilterCount > 0 && (
                <button onClick={() => { setTier(''); setLocation(''); }}
                  style={{ padding: 0, border: 'none', background: 'none', color: '#9b2d2d', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
        <button onClick={toggleSelectAll}
          style={{ padding: '0.35rem 0.8rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: allSelected ? '#192524' : 'transparent', color: allSelected ? '#fff' : '#3C5759', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}>
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
        <button onClick={bulkConfirm} disabled={confirmBusy || selected.size === 0}
          title="Moves selected creators to Confirmed — does not email or DM anyone"
          style={{ padding: '0.35rem 0.8rem', borderRadius: 9999, border: 'none', background: '#166534', color: '#fff', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', opacity: (confirmBusy || selected.size === 0) ? 0.5 : 1 }}>
          {confirmBusy ? 'Confirming…' : `Confirm selected (${selected.size})`}
        </button>
        <button onClick={bulkEmail} disabled={emailBulkBusy || selected.size === 0}
          title="Drip-sends the cold outreach email, 1/minute, to every selected creator with an email on file (skips the rest)"
          style={{ padding: '0.35rem 0.8rem', borderRadius: 9999, border: 'none', background: '#5b4aa8', color: '#fff', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', opacity: (emailBulkBusy || selected.size === 0) ? 0.5 : 1 }}>
          {emailBulkBusy ? 'Emailing…' : `Email selected (${selected.size})`}
        </button>
        <button onClick={bulkGenerate} disabled={bulkBusy || selected.size === 0}
          title="Drafts an Instagram DM for each selected creator"
          style={{ padding: '0.35rem 0.8rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', opacity: (bulkBusy || selected.size === 0) ? 0.5 : 1 }}>
          {bulkBusy ? 'Drafting…' : `Draft DMs for selected (${selected.size})`}
        </button>
        {bulkMsg && <span style={{ fontSize: '0.72rem', color: '#166534' }}>{bulkMsg}</span>}
        {confirmMsg && <span style={{ fontSize: '0.72rem', color: '#166534' }}>{confirmMsg}</span>}
        {emailBulkMsg && <span style={{ fontSize: '0.72rem', color: '#166534' }}>{emailBulkMsg}</span>}
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', overflowX: 'auto', paddingBottom: '0.5rem', alignItems: 'flex-start' }}>
        {CREATOR_CRM_COLUMNS.map((col) => (
          <div key={col.id}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
            onDragLeave={() => setDragOverCol((c) => (c === col.id ? null : c))}
            onDrop={(e) => { e.preventDefault(); handleDrop(col.id); }}
            style={{
              flex: '0 0 280px', width: 280, borderRadius: dragOverCol === col.id ? '0.875rem' : 0,
              background: dragOverCol === col.id ? 'rgba(123,104,200,0.06)' : 'transparent',
              outline: dragOverCol === col.id ? '1.5px dashed rgba(123,104,200,0.4)' : 'none',
              padding: dragOverCol === col.id ? '0.5rem' : 0,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', padding: '0 0.1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {byColumn[col.id].length > 0 && (
                  <input type="checkbox" aria-label={`Select all in ${col.label}`}
                    checked={byColumn[col.id].every((p) => selected.has(String(p._id)))}
                    onChange={() => toggleColumn(col.id)} />
                )}
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#192524' }}>{col.label}</span>
              </span>
              <span style={{ fontSize: '0.7rem', color: '#646B62' }}>{byColumn[col.id].length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '75vh', overflowY: 'auto', minHeight: '2rem' }}>
              {byColumn[col.id].map((p) => (
                <div key={String(p._id)} draggable onDragStart={() => setDragId(p._id)} onDragEnd={() => setDragId(null)}
                  title="Drag to move to another column" style={{ cursor: 'grab' }}>
                  <ProspectCard prospect={p} selected={selected.has(String(p._id))} onToggleSelect={toggleOne} crm />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Auto-discovery config — two tiers: free Agent-Reach (manual, search-only)
// and paid HikerAPI/Apify (automatic daily cron + on-demand "Run now") ────────
function AutoDiscoveryCard() {
  const settings = useQuery(api.admin.getSettings);
  const stats = useQuery(api.prospects.getStats);
  const setSetting = useMutation(api.admin.setSetting);
  const runNow = useAction(api.prospects.runDiscoveryProfileNow);
  const enrichPending = useAction(api.prospects.enrichPendingCreators);
  const saved = (() => {
    try { return JSON.parse(settings?.discovery_auto || 'null') || {}; } catch { return {}; }
  })();
  const [draft, setDraft] = useState(null); // null = mirror saved
  const profiles = draft ?? (saved.profiles?.length ? saved.profiles : [
    { id: 'default', enabled: false, niche: 'travel', location: '', perDay: 10 },
  ]);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [runState, setRunState] = useState({}); // profile id -> { busy, msg }
  const [enrichBusy, setEnrichBusy] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState('');

  // `updater` reads the previous array via React's functional setState form,
  // not the `profiles` closed over at render time — see the identical fix
  // (and its reasoning) in HostAutoDiscoveryCard above.
  async function save(updater) {
    let merged;
    setDraft(prev => {
      merged = updater(prev ?? profiles);
      return merged;
    });
    try {
      await setSetting({ key: 'discovery_auto', value: JSON.stringify({ profiles: merged }) });
      setErrorMsg('');
      setSavedMsg('Saved');
      setTimeout(() => setSavedMsg(''), 2000);
    } catch (e) {
      setErrorMsg((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Save failed');
    }
  }

  function updateProfile(id, patch) {
    setDraft(prev => (prev ?? profiles).map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function runProfileNow(p) {
    setRunState((s) => ({ ...s, [p.id]: { busy: true, msg: '' } }));
    try {
      const r = await runNow({ profileId: p.id, niche: p.niche, location: p.location || undefined, perDay: p.perDay });
      setRunState((s) => ({ ...s, [p.id]: { busy: false, msg: `Imported ${r.imported} of ${r.fetched} found.` } }));
    } catch (e) {
      const msg = (e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Run failed';
      setRunState((s) => ({ ...s, [p.id]: { busy: false, msg } }));
    }
  }

  // Live progress for an in-flight "Run now" — written by the action itself
  // (runDiscoveryProfileNow) into admin_settings mid-run, so it rides the
  // `settings` subscription already open here instead of needing its own
  // polling loop.
  function progressFor(id) {
    try { return JSON.parse(settings?.[`discovery_run:creator:${id}`] || 'null'); } catch { return null; }
  }

  async function runEnrich() {
    setEnrichBusy(true); setEnrichMsg('');
    try {
      const r = await enrichPending({});
      setEnrichMsg(`Enriched ${r.enriched}${r.remaining ? ` — ${r.remaining} still pending (run again)` : ''}.`);
    } catch (e) {
      setEnrichMsg((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Enrich failed');
    } finally {
      setEnrichBusy(false);
    }
  }

  const pendingCount = stats?.pendingAgentReachCreators ?? 0;

  return (
    <div>
      {profiles.map((p) => {
        const progress = progressFor(p.id);
        const running = progress?.status === 'running' || runState[p.id]?.busy;
        if (running) {
          const found = progress?.found ?? 0;
          const target = progress?.target ?? p.perDay;
          const pct = target > 0 ? Math.min(100, Math.round((found / target) * 100)) : 0;
          const tried = Math.min((progress?.attempts ?? 0) + 1, progress?.maxAttempts || 1);
          const maxTried = progress?.maxAttempts || 1;
          return (
            <div key={p.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.5rem', padding: '0.4rem 0' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#192524', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                {p.niche}{p.location ? ` · ${p.location}` : ''}
              </span>
              <div style={{ flex: 1, minWidth: 100, height: 8, borderRadius: 9999, background: 'rgba(25,37,36,0.1)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: '#166534', transition: 'width 0.4s ease' }} />
              </div>
              <span style={{ fontSize: '0.68rem', color: '#646B62', whiteSpace: 'nowrap' }}>
                {found}/{target} found · trying {tried}/{maxTried}
              </span>
            </div>
          );
        }
        return (
          <div key={p.id} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
            <button onClick={() => save((prev) => prev.map((x) => (x.id === p.id ? { ...x, enabled: !x.enabled } : x)))}
              role="switch" aria-checked={p.enabled}
              style={{ padding: '0.45rem 1rem', borderRadius: 9999, border: 'none', background: p.enabled ? '#166534' : 'rgba(25,37,36,0.12)', color: p.enabled ? '#fff' : '#3C5759', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>
              {p.enabled ? 'On' : 'Off'}
            </button>
            <select aria-label="Auto-discovery niche" value={p.niche}
              onChange={(e) => save((prev) => prev.map((x) => (x.id === p.id ? { ...x, niche: e.target.value } : x)))}
              style={{ ...input, width: 150, textTransform: 'capitalize' }}>
              {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <input aria-label="Auto-discovery location" value={p.location} onChange={(e) => updateProfile(p.id, { location: e.target.value })}
              onBlur={() => save((prev) => prev)}
              placeholder="Target location" style={{ ...input, width: 160 }} />
            <input aria-label="Creators per day" type="number" min="1" max="20" value={p.perDay}
              onChange={(e) => updateProfile(p.id, { perDay: Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 10)) })}
              onBlur={() => save((prev) => prev)}
              style={{ ...input, width: 70 }} />
            <span style={{ fontSize: '0.7rem', color: '#646B62' }}>per day</span>
            <button onClick={() => runProfileNow(p)}
              title="Runs this profile immediately via HikerAPI/Apify instead of waiting for the 7am UTC cron"
              style={{ padding: '0.4rem 0.8rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: 'transparent', color: '#192524', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
              Run now
            </button>
            {profiles.length > 1 && (
              <button onClick={() => save((prev) => prev.filter((x) => x.id !== p.id))} title="Remove this profile"
                style={{ padding: '0.3rem 0.6rem', borderRadius: 9999, border: 'none', background: 'transparent', color: '#9b2d2d', fontSize: '0.8rem', cursor: 'pointer' }}>
                ×
              </button>
            )}
            {runState[p.id]?.msg && <span style={{ fontSize: '0.7rem', color: '#646B62', flexBasis: '100%' }}>{runState[p.id].msg}</span>}
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => save((prev) => [...prev, { id: rid(), enabled: false, niche: 'travel', location: '', perDay: 10 }])}
          style={{ padding: '0.4rem 0.9rem', borderRadius: 9999, border: '1.5px dashed rgba(25,37,36,0.25)', background: 'transparent', color: '#3C5759', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
          + Add profile
        </button>
        {savedMsg && <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 700 }}>{savedMsg}</span>}
        {errorMsg && <span style={{ fontSize: '0.7rem', color: '#9b2d2d', fontWeight: 700 }}>{errorMsg}</span>}
      </div>
      <p style={{ fontSize: '0.7rem', color: '#646B62', margin: '0.5rem 0 0.75rem' }}>
        Every profile toggled On runs every morning at 7am UTC — searches Instagram for its niche/location, imports new creators, and scores the top N per day. Ready before the 8am outreach queue builds. Uses Apify/HikerAPI credits daily per profile while on; use "Run now" to fire one immediately instead of waiting.
      </p>
      <div style={{ padding: '0.7rem 0.9rem', borderRadius: '0.75rem', background: 'rgba(123,104,200,0.06)', border: '1px solid rgba(123,104,200,0.2)' }}>
        <p style={{ fontSize: '0.76rem', color: '#3C5759', margin: 0, lineHeight: 1.5 }}>
          <strong>Free tier — Agent-Reach:</strong> open a local Claude Code session on your Mac (Chrome open, logged into Instagram) and ask it to search Instagram via Agent-Reach for a niche/location — no Apify/HikerAPI credits spent. It pushes the handles it finds in with the <code>prospects:importCreatorsLocal</code> mutation (secret in Convex env as <code>LOCAL_IMPORT_SECRET</code>). Agent-Reach only finds handles — it can't reliably pull follower counts or bios — so imports land unscored until you run enrichment below.
        </p>
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={runEnrich} disabled={enrichBusy || pendingCount === 0}
            style={{ padding: '0.4rem 0.9rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', opacity: (enrichBusy || pendingCount === 0) ? 0.5 : 1 }}>
            {enrichBusy ? 'Enriching…' : `Enrich pending (${pendingCount})`}
          </button>
          {enrichMsg && <span style={{ fontSize: '0.7rem', color: '#646B62' }}>{enrichMsg}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
// Toggle-panel buttons, scoped per side so only relevant tools show — hosts
// have their own dedicated search inside Host outreach, so the older
// generic creator tools (Find/Auto/Import/Build queue) only apply to creators.
// ─── DM angle editor — edit the 5 host outreach templates in place ────────────
function DmAngleEditor() {
  const angles = useQuery(api.prospects.getHostDmAngles) || [];
  const setAngle = useMutation(api.prospects.setHostDmAngle);
  const resetAngle = useMutation(api.prospects.resetHostDmAngle);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState('');

  async function save(angle) {
    const text = drafts[angle.id] ?? angle.template;
    setSavingId(angle.id);
    try {
      await setAngle({ id: angle.id, template: text });
      setMsg(`Saved "${angle.name}".`);
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Save failed');
    } finally {
      setSavingId(null);
    }
  }

  async function reset(angle) {
    setSavingId(angle.id);
    try {
      await resetAngle({ id: angle.id });
      setDrafts((d) => { const next = { ...d }; delete next[angle.id]; return next; });
      setMsg(`Reset "${angle.name}" to default.`);
      setTimeout(() => setMsg(''), 2000);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <p style={{ fontSize: '0.76rem', color: '#3C5759', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
        These 5 templates rotate evenly across confirmed hosts. <code>[Hotel Name]</code> and <code>{'{STATS}'}</code> are placeholders the writer LLM fills in per host — keep them intact.
      </p>
      {msg && <p style={{ fontSize: '0.74rem', color: '#166534', margin: '0 0 0.75rem' }}>{msg}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {angles.map((angle) => (
          <div key={angle.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#192524' }}>{angle.name}</span>
              {angle.isCustom && <span style={{ fontSize: '0.64rem', padding: '0.1rem 0.4rem', borderRadius: 9999, background: 'rgba(123,104,200,0.12)', color: '#5b4aa8', fontWeight: 600 }}>Customized</span>}
            </div>
            <textarea value={drafts[angle.id] ?? angle.template}
              onChange={(e) => setDrafts((d) => ({ ...d, [angle.id]: e.target.value }))}
              rows={5} style={{ ...input, width: '100%', resize: 'vertical', fontSize: '0.76rem' }} />
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
              <button onClick={() => save(angle)} disabled={savingId === angle.id}
                style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', opacity: savingId === angle.id ? 0.5 : 1 }}>
                {savingId === angle.id ? 'Saving…' : 'Save'}
              </button>
              {angle.isCustom && (
                <button onClick={() => reset(angle)} disabled={savingId === angle.id}
                  style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
                  Reset to default
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Welcome email editor — raw HTML + photo upload, no field-by-field form ───
// Ben wanted to drop in a full replacement exported from an email builder,
// not edit paragraphs individually — so this is a textarea for the whole
// HTML plus an image uploader that hands back URLs to paste into it.
// Shared by both sides — same build-out, same button, only the underlying
// Convex functions/token/copy differ per kind (see the isHost branches below).
function WelcomeEmailEditor({ kind }) {
  const isHost = kind === 'host';
  const token = isHost ? '{{HOTEL_NAME}}' : '{{CREATOR_NAME}}';
  const sampleName = isHost ? 'Sample Hotel Name' : 'Sample Creator';
  const current = useQuery(isHost ? api.prospects.getHostWelcomeEmailHtml : api.prospects.getCreatorWelcomeEmailHtml);
  const setHtml = useMutation(isHost ? api.prospects.setHostWelcomeEmailHtml : api.prospects.setCreatorWelcomeEmailHtml);
  const resetHtml = useMutation(isHost ? api.prospects.resetHostWelcomeEmailHtml : api.prospects.resetCreatorWelcomeEmailHtml);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const finalizeUpload = useMutation(api.uploads.finalizeUpload);
  const sendTest = useAction(api.prospects.sendTestWelcomeEmail);

  const [draft, setDraft] = useState(null); // null = mirror `current` until touched
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState([]);
  const [testEmail, setTestEmail] = useState('benventuring@gmail.com');
  const [testBusy, setTestBusy] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const html = draft ?? current?.template ?? '';
  const previewHtml = html.split(token).join(sampleName);

  function loadHtmlFile(file) {
    const reader = new FileReader();
    reader.onload = () => setDraft(String(reader.result || ''));
    reader.readAsText(file);
  }

  async function save() {
    setSaving(true); setMsg('');
    try {
      await setHtml({ html });
      setMsg('Saved — this is now what sends.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSaving(true); setMsg('');
    try {
      await resetHtml({});
      setDraft(null);
      setMsg('Reset to the built-in default.');
      setTimeout(() => setMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file) {
    setUploading(true); setMsg('');
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      const { storageId } = await res.json();
      const url = await finalizeUpload({ storageId });
      setUploadedUrls((u) => [{ name: file.name, url }, ...u]);
    } catch (e) {
      setMsg((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function sendTestNow() {
    if (!testEmail.trim() || !html) return;
    setTestBusy(true); setTestMsg('');
    try {
      await sendTest({ kind, toEmail: testEmail.trim(), html, sampleName });
      setTestMsg(`Sent to ${testEmail.trim()} — whatever's in the box above, saved or not.`);
      setTimeout(() => setTestMsg(''), 5000);
    } catch (e) {
      setTestMsg((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Test send failed');
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <div>
      <p style={{ fontSize: '0.76rem', color: '#3C5759', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
        This is the exact HTML that sends as the cold outreach email (step 1) the moment a {isHost ? 'host' : 'creator'} is confirmed. Upload a full replacement exported from an email builder, or edit the HTML directly — it must keep a <code>{token}</code> token somewhere so each send gets personalized. Upload photos below to get hosted URLs first, then reference them in the HTML.
      </p>
      {current?.isCustom && (
        <p style={{ fontSize: '0.7rem', color: '#5b4aa8', margin: '0 0 0.75rem' }}>Currently using a customized version, not the built-in default.</p>
      )}
      {msg && <p style={{ fontSize: '0.74rem', color: '#166534', margin: '0 0 0.75rem' }}>{msg}</p>}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px', minWidth: 280 }}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <button onClick={() => fileInputRef.current?.click()}
              style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
              Upload HTML file
            </button>
            <input ref={fileInputRef} type="file" accept=".html,text/html" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadHtmlFile(f); e.target.value = ''; }} />
            <button onClick={() => photoInputRef.current?.click()} disabled={uploading}
              style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', opacity: uploading ? 0.5 : 1 }}>
              {uploading ? 'Uploading…' : 'Upload photo'}
            </button>
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ''; }} />
          </div>
          <textarea value={html} onChange={(e) => setDraft(e.target.value)}
            rows={16} style={{ ...input, width: '100%', resize: 'vertical', fontSize: '0.68rem', fontFamily: 'monospace' }} />
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
            <button onClick={save} disabled={saving || !html}
              style={{ padding: '0.35rem 0.9rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', opacity: (saving || !html) ? 0.5 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {current?.isCustom && (
              <button onClick={reset} disabled={saving}
                style={{ padding: '0.35rem 0.9rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                Reset to default
              </button>
            )}
          </div>
          {uploadedUrls.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <span style={{ ...label, display: 'inline' }}>Uploaded photo URLs (click to copy)</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {uploadedUrls.map((u, i) => (
                  <button key={i} onClick={() => navigator.clipboard?.writeText(u.url)}
                    title="Copy URL" style={{ textAlign: 'left', padding: '0.3rem 0.5rem', borderRadius: 6, border: '1px solid rgba(25,37,36,0.1)', background: 'rgba(255,255,255,0.6)', fontSize: '0.66rem', color: '#3C5759', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.name}: {u.url}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginTop: '0.9rem', padding: '0.7rem 0.8rem', borderRadius: '0.6rem', background: 'rgba(123,104,200,0.06)', border: '1px solid rgba(123,104,200,0.2)' }}>
            <span style={{ ...label, display: 'inline' }}>Send a test copy</span>
            <p style={{ fontSize: '0.7rem', color: '#3C5759', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
              Sends the exact HTML above (saved or not) to a real inbox right now, so you can check rendering before committing it.
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
                aria-label="Test send address" placeholder="you@example.com"
                style={{ ...input, flex: '1 1 200px', fontSize: '0.74rem' }} />
              <button onClick={sendTestNow} disabled={testBusy || !testEmail.trim() || !html}
                style={{ padding: '0.35rem 0.9rem', borderRadius: 9999, border: 'none', background: '#5b4aa8', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', opacity: (testBusy || !testEmail.trim() || !html) ? 0.5 : 1 }}>
                {testBusy ? 'Sending…' : 'Send test'}
              </button>
            </div>
            {testMsg && <p style={{ fontSize: '0.7rem', color: testMsg.includes('failed') ? '#9b2d2d' : '#166534', margin: '0.4rem 0 0' }}>{testMsg}</p>}
          </div>
        </div>
        <div style={{ flex: '1 1 380px', minWidth: 320 }}>
          <span style={{ ...label, display: 'inline' }}>Preview (sample name filled in)</span>
          <iframe title="Welcome email preview" srcDoc={previewHtml}
            style={{ width: '100%', height: '70vh', border: '1px solid rgba(25,37,36,0.1)', borderRadius: '0.5rem', background: '#fff' }} />
        </div>
      </div>
    </div>
  );
}

// Steps 2-3 — plain-text, LLM-adapted at send time, so this edits the source
// template (same [Hotel Name]/[Creator Name] bracket token used in code) not
// a literal substitution. Same build-out on both sides: view, edit, save,
// reset, and a test send of the adapted copy against a sample profile.
function FollowupTemplatesEditor({ kind }) {
  const isHost = kind === 'host';
  const nameToken = isHost ? '[Hotel Name]' : '[Creator Name]';
  const templates = useQuery(api.prospects.getFollowupTemplates, { kind });
  const setTemplate = useMutation(api.prospects.setFollowupTemplate);
  const resetTemplate = useMutation(api.prospects.resetFollowupTemplate);

  if (!templates) return <p style={{ fontSize: '0.76rem', color: '#646B62' }}>Loading…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <p style={{ fontSize: '0.76rem', color: '#3C5759', margin: 0, lineHeight: 1.5 }}>
        The two follow-ups sent after the cold outreach email, if a {isHost ? 'host' : 'creator'} hasn't replied. An LLM adapts this source text per recipient (swaps in their real name, keeps structure/tone) rather than sending it verbatim — edit the template itself here, keeping a <code>{nameToken}</code> token somewhere.
      </p>
      {templates.map((t) => (
        <FollowupTemplateRow key={t.step} kind={kind} nameToken={nameToken} template={t}
          onSave={(value) => setTemplate({ kind, step: t.step, template: value })}
          onReset={() => resetTemplate({ kind, step: t.step })} />
      ))}
    </div>
  );
}

function FollowupTemplateRow({ kind, nameToken, template, onSave, onReset }) {
  const [draft, setDraft] = useState(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const value = draft ?? template.template;

  async function save() {
    setSaving(true); setMsg('');
    try {
      await onSave(value);
      setMsg('Saved.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSaving(true); setMsg('');
    try {
      await onReset();
      setDraft(null);
      setMsg('Reset to the built-in default.');
      setTimeout(() => setMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#192524' }}>Step {template.step} — {template.name}</span>
        <span style={{ fontSize: '0.7rem', color: '#646B62' }}>Subject: {template.subject.replace(nameToken, 'their name')}</span>
        {template.isCustom && <span style={{ fontSize: '0.66rem', color: '#5b4aa8', fontWeight: 600 }}>Customized</span>}
      </div>
      <textarea value={value} onChange={(e) => setDraft(e.target.value)}
        rows={7} style={{ ...input, width: '100%', resize: 'vertical', fontSize: '0.74rem' }} />
      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', alignItems: 'center' }}>
        <button onClick={save} disabled={saving || !value.trim()}
          style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', opacity: (saving || !value.trim()) ? 0.5 : 1 }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {template.isCustom && (
          <button onClick={reset} disabled={saving}
            style={{ padding: '0.3rem 0.8rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
            Reset to default
          </button>
        )}
        {msg && <span style={{ fontSize: '0.7rem', color: '#166534' }}>{msg}</span>}
      </div>
    </div>
  );
}

const CREATOR_TOOLS = [
  { id: 'find', label: 'Find creators', title: 'Search Instagram by niche/location, auto-imports and scores the top 10 creators.' },
  { id: 'auto', label: 'Auto-discovery', title: 'Runs that same creator search automatically every morning at 7am.' },
  { id: 'add', label: 'Add manually', title: 'Add one specific creator you already know the handle for.' },
  { id: 'import', label: 'Import', title: 'Bulk-import creators or hosts from a CSV file (or pasted CSV text).' },
  { id: 'welcome_email', label: 'Cold outreach email', title: 'Preview the branded cold outreach email, or upload a replacement HTML/photos.' },
  { id: 'followups', label: 'Follow-up emails', title: 'View or edit the two follow-up email templates.' },
];

export default function Discovery({ sidebarCollapsed, setSidebarCollapsed }) {
  const stats = useQuery(api.prospects.getStats);
  const buildFreshQueue = useAction(api.prospects.buildFreshQueue);
  const [side, setSide] = useState('hosts'); // 'hosts' | 'creators'
  const [hostView, setHostView] = useState('outreach'); // 'outreach' | 'crm'
  const [openPanel, setOpenPanel] = useState(null);
  const [queueMsg, setQueueMsg] = useState('');
  const [queueBusy, setQueueBusy] = useState(false);
  const togglePanel = (p) => setOpenPanel(cur => (cur === p ? null : p));

  const contactedCreators = stats?.contactedToday?.creators ?? 0;
  const contactedHosts = stats?.contactedToday?.hosts ?? 0;

  function switchSide(next) {
    setSide(next);
    setOpenPanel(null);
  }

  // "Build fresh 50" — confirms both sides at once (drafted DM for hosts,
  // queued status for creators), topping up with a live search first if the
  // pool's short. Does NOT email anyone — that's always a separate,
  // deliberate click. Actual DM volume stays capped separately at the safe
  // ~20/day rate; this only grows the ready-to-confirm bench.
  async function handleBuildQueue() {
    setQueueBusy(true); setQueueMsg('');
    try {
      const r = await buildFreshQueue({ perKind: 50 });
      const { creators = 0, hosts = 0 } = r.promoted || {};
      setQueueMsg(
        (creators + hosts) > 0
          ? `Confirmed ${creators} creators, ${hosts} hosts — ready in each Confirmed column.`
          : 'Both queues are already full for today.'
      );
    } catch (e) {
      setQueueMsg((e.data || e.message)?.replace(/^.*Error:\s*/, '') || 'Could not build the queue');
    } finally {
      setQueueBusy(false);
      setTimeout(() => setQueueMsg(''), 6000);
    }
  }

  return (
    <div style={{ padding: '1.75rem 2rem 2rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: '#192524', margin: '0 0 0.2rem' }}>Discovery</h2>
          <p style={{ fontSize: '0.78rem', color: '#646B62', margin: 0 }}>
            {side === 'hosts'
              ? (hostView === 'outreach'
                ? 'Search, select ~20, and draft your daily host outreach batch. Instagram DMs stay manual.'
                : 'Every host across its lifecycle — drag a card to a new column, or use Mark ... to advance it.')
              : `Today's outreach: ${contactedCreators}/20 creators contacted. Instagram DMs stay manual (20/day is the safe limit); this board preps and tracks everything else.`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={handleBuildQueue} disabled={queueBusy}
            title="Confirms up to 50 new creators and 50 new hosts each — drafts DMs, tops up with a live search first if the pool's short. Emailing is a separate step you trigger yourself; Instagram DM volume stays capped separately."
            style={{ padding: '0.5rem 1rem', borderRadius: 9999, border: '1.5px solid rgba(22,101,52,0.3)', background: 'rgba(209,235,219,0.5)', color: '#166534', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', opacity: queueBusy ? 0.6 : 1 }}>
            {queueBusy ? 'Building…' : 'Build fresh 50'}
          </button>
          {typeof setSidebarCollapsed === 'function' && (
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Exit focus mode — show the sidebar again' : 'Focus mode — collapse the sidebar for more room'}
              style={{ padding: '0.5rem 0.9rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.15)', background: sidebarCollapsed ? '#192524' : 'transparent', color: sidebarCollapsed ? '#fff' : '#3C5759', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
              {sidebarCollapsed ? 'Exit focus mode' : 'Focus mode ⤢'}
            </button>
          )}
          <div style={{ display: 'flex', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.15)', overflow: 'hidden' }}>
            {[{ id: 'hosts', label: 'Hosts' }, { id: 'creators', label: 'Creators' }].map(({ id, label: l }) => (
              <button key={id} onClick={() => switchSide(id)}
                style={{ padding: '0.5rem 1.2rem', border: 'none', background: side === id ? '#192524' : 'transparent', color: side === id ? '#fff' : '#3C5759', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {side === 'hosts' ? (
          <>
            <button onClick={() => setHostView(v => (v === 'outreach' ? 'crm' : 'outreach'))}
              title={hostView === 'outreach' ? 'Switch to the full host CRM board' : 'Switch back to the search/select/confirm workflow'}
              style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
              {hostView === 'outreach' ? 'Host CRM' : 'Host outreach'}
            </button>
            {hostView === 'outreach' && (
              <button onClick={() => togglePanel('add')} title="Add one specific host you already know the handle for, without running a search"
                style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: openPanel === 'add' ? 'rgba(25,37,36,0.06)' : 'transparent', color: '#192524', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                Add manually
              </button>
            )}
            <button onClick={() => togglePanel('dm_angles')} title="Edit the text of the 5 DM angle templates"
              style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: openPanel === 'dm_angles' ? 'rgba(25,37,36,0.06)' : 'transparent', color: '#192524', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              DM angles
            </button>
            <button onClick={() => togglePanel('welcome_email')} title="Preview the branded cold outreach email, or upload a replacement HTML/photos"
              style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: openPanel === 'welcome_email' ? 'rgba(25,37,36,0.06)' : 'transparent', color: '#192524', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              Cold outreach email
            </button>
            <button onClick={() => togglePanel('followups')} title="View or edit the two follow-up email templates"
              style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: openPanel === 'followups' ? 'rgba(25,37,36,0.06)' : 'transparent', color: '#192524', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              Follow-up emails
            </button>
          </>
        ) : (
          CREATOR_TOOLS.map(({ id, label: l, title: t }) => (
            <button key={id} onClick={() => togglePanel(id)} title={t}
              style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: openPanel === id ? 'rgba(25,37,36,0.06)' : 'transparent', color: '#192524', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              {l}
            </button>
          ))
        )}
      </div>

      {queueMsg && (
        <div style={{ marginBottom: '1rem', padding: '0.6rem 1rem', borderRadius: '0.75rem', background: 'rgba(209,235,219,0.4)', border: '1px solid rgba(209,235,219,0.8)', fontSize: '0.78rem', color: '#166534' }}>
          {queueMsg}
        </div>
      )}

      {openPanel === 'add' && (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(25,37,36,0.08)' }}>
          <AddProspectForm onDone={() => setOpenPanel(null)} defaultKind={side === 'hosts' ? 'host' : 'creator'} />
        </div>
      )}
      {openPanel === 'dm_angles' && (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(25,37,36,0.08)' }}>
          <DmAngleEditor />
        </div>
      )}
      {openPanel === 'welcome_email' && (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(25,37,36,0.08)' }}>
          <WelcomeEmailEditor kind={side === 'hosts' ? 'host' : 'creator'} />
        </div>
      )}
      {openPanel === 'followups' && (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(25,37,36,0.08)' }}>
          <FollowupTemplatesEditor kind={side === 'hosts' ? 'host' : 'creator'} />
        </div>
      )}
      {side === 'creators' && openPanel && openPanel !== 'add' && (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(25,37,36,0.08)' }}>
          {openPanel === 'find' && <FindCreators />}
          {openPanel === 'auto' && <AutoDiscoveryCard />}
          {openPanel === 'import' && <CsvImport />}
        </div>
      )}

      {side === 'hosts'
        ? (hostView === 'outreach' ? <HostOutreachCampaign /> : <HostCrmBoard />)
        : <CreatorCrmBoard />}
    </div>
  );
}
