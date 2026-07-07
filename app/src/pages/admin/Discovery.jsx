import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

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

// ─── Single prospect card ─────────────────────────────────────────────────────
function ProspectCard({ prospect }) {
  const updateStatus = useMutation(api.prospects.updateStatus);
  const update = useMutation(api.prospects.update);
  const remove = useMutation(api.prospects.remove);
  const generateDm = useAction(api.prospects.generateDmDraft);
  const [open, setOpen] = useState(false);
  const [dmDraft, setDmDraft] = useState(prospect.dm_draft || '');
  const [notes, setNotes] = useState(prospect.notes || '');
  const [copied, setCopied] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState('');

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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Discovery() {
  const stats = useQuery(api.prospects.getStats);
  const buildQueue = useMutation(api.prospects.buildTodayQueue);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [queueMsg, setQueueMsg] = useState('');

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
          <button onClick={() => { setShowAdd(a => !a); setShowImport(false); }}
            style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: showAdd ? 'rgba(25,37,36,0.06)' : 'transparent', color: '#192524', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
            Add manually
          </button>
          <button onClick={() => { setShowImport(i => !i); setShowAdd(false); }}
            style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: showImport ? 'rgba(25,37,36,0.06)' : 'transparent', color: '#192524', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
            Import
          </button>
        </div>
      </div>

      {queueMsg && (
        <div style={{ marginBottom: '1rem', padding: '0.6rem 1rem', borderRadius: '0.75rem', background: 'rgba(209,235,219,0.4)', border: '1px solid rgba(209,235,219,0.8)', fontSize: '0.78rem', color: '#166534' }}>
          {queueMsg}
        </div>
      )}

      {(showAdd || showImport) && (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(25,37,36,0.08)' }}>
          {showAdd && <AddProspectForm onDone={() => setShowAdd(false)} />}
          {showImport && <ApifyImport />}
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
