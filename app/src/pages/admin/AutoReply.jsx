import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const input = {
  padding: '0.5rem 0.75rem', border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: '0.6rem',
  fontFamily: 'Satoshi, sans-serif', fontSize: '0.8rem', color: '#192524',
  background: '#fafafa', outline: 'none', boxSizing: 'border-box',
};
const label = { fontSize: '0.68rem', fontWeight: 700, color: '#646B62', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem', fontFamily: 'Satoshi, sans-serif' };

const STATUS_CFG = {
  sent:     { label: 'Sent',      bg: 'rgba(209,235,219,0.8)', color: '#166534' },
  failed:   { label: 'Failed',    bg: 'rgba(200,104,104,0.12)', color: '#9b2d2d' },
  no_match: { label: 'No match',  bg: 'rgba(25,37,36,0.06)',   color: '#646B62' },
};

// ─── Connection status ──────────────────────────────────────────────────────
function ConnectionBanner() {
  const status = useQuery(api.autoreply.getConnectionStatus);
  if (!status) return null;

  if (status.graphApi && status.webhook) {
    return (
      <div style={{ marginBottom: '1.25rem', padding: '0.7rem 1rem', borderRadius: '0.75rem', background: 'rgba(209,235,219,0.4)', border: '1px solid rgba(209,235,219,0.8)', fontSize: '0.78rem', color: '#166534' }}>
        ✓ Connected — Instagram Graph API and the comment webhook are both configured.
      </div>
    );
  }
  return (
    <div style={{ marginBottom: '1.25rem', padding: '0.9rem 1.1rem', borderRadius: '0.875rem', background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.25)' }}>
      <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#192524', margin: '0 0 0.4rem' }}>Setup needed before rules can fire</p>
      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.76rem', color: '#3C5759', lineHeight: 1.6 }}>
        {!status.graphApi && <li>Instagram Graph API — should already be set from the Social tab (META_ACCESS_TOKEN, IG_BUSINESS_ACCOUNT_ID). {!status.graphApi && "Not detected yet."}</li>}
        {!status.webhook && (
          <li>
            Comment webhook — run <code>npx convex env set META_APP_SECRET &lt;your app's App Secret&gt;</code> and <code>npx convex env set META_WEBHOOK_VERIFY_TOKEN &lt;any random string&gt;</code>, then in your Meta App dashboard go to Webhooks → Instagram → subscribe to <strong>comments</strong>, callback URL <code>https://&lt;your-deployment&gt;.convex.site/meta-webhook</code>, verify token = the same string you set.
          </li>
        )}
      </ul>
    </div>
  );
}

// ─── Rule form (add or edit) ────────────────────────────────────────────────
function RuleForm({ existing, onDone }) {
  const addRule = useMutation(api.autoreply.addRule);
  const updateRule = useMutation(api.autoreply.updateRule);
  const [postId, setPostId] = useState(existing?.post_id || '');
  const [keywords, setKeywords] = useState((existing?.keywords || []).join(', '));
  const [matchMode, setMatchMode] = useState(existing?.match_mode || 'contains');
  const [dmMessage, setDmMessage] = useState(existing?.dm_message || '');
  const [publicReply, setPublicReply] = useState(existing?.public_reply || '');
  const [signupUrl, setSignupUrl] = useState(existing?.signup_url || '');
  const [tier2Message, setTier2Message] = useState(existing?.tier2_message || '');
  const [tier3Message, setTier3Message] = useState(existing?.tier3_message || '');
  const [tier4Message, setTier4Message] = useState(existing?.tier4_message || '');
  const [showFollowUps, setShowFollowUps] = useState(!!(existing?.tier2_message || existing?.tier3_message || existing?.tier4_message));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    setBusy(true); setErr('');
    const keywordList = keywords.split(',').map((k) => k.trim()).filter(Boolean);
    const followUps = { signupUrl: signupUrl || undefined, tier2Message: tier2Message || undefined, tier3Message: tier3Message || undefined, tier4Message: tier4Message || undefined };
    try {
      if (existing) {
        await updateRule({ id: existing._id, postId: postId || undefined, keywords: keywordList, matchMode, dmMessage, publicReply: publicReply || undefined, ...followUps });
      } else {
        await addRule({ postId: postId || undefined, keywords: keywordList, matchMode, dmMessage, publicReply: publicReply || undefined, ...followUps });
        setPostId(''); setKeywords(''); setDmMessage(''); setPublicReply(''); setSignupUrl(''); setTier2Message(''); setTier3Message(''); setTier4Message('');
      }
      onDone?.();
    } catch (e) {
      setErr(e.message?.replace(/^.*Error:\s*/, '') || 'Could not save this rule');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}>
          <span style={label}>Keywords (comma-separated)</span>
          <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="link, price, info"
            style={{ ...input, width: '100%' }} />
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <span style={label}>Match</span>
          <select value={matchMode} onChange={(e) => setMatchMode(e.target.value)} style={{ ...input, width: '100%' }}>
            <option value="contains">Contains (partial)</option>
            <option value="word">Whole word only</option>
          </select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <span style={label}>Post ID (blank = every post)</span>
          <input value={postId} onChange={(e) => setPostId(e.target.value)} placeholder="Instagram media id, optional"
            style={{ ...input, width: '100%' }} />
        </div>
      </div>
      <div>
        <span style={label}>Private DM to send</span>
        <textarea value={dmMessage} onChange={(e) => setDmMessage(e.target.value)} rows={3}
          placeholder="Hey! Here's the link you asked about: {{link}}"
          style={{ ...input, width: '100%', resize: 'vertical' }} />
        <span style={{ fontSize: '0.66rem', color: '#646B62', marginTop: '0.25rem', display: 'block' }}>
          Use <code>{'{{link}}'}</code> for a tracked link — works in any tier's message below. Clicks and signups on it drive the sequence.
        </span>
      </div>
      <div>
        <span style={label}>Public reply under the comment (optional)</span>
        <input value={publicReply} onChange={(e) => setPublicReply(e.target.value)} placeholder="Sent you a DM! 📩"
          style={{ ...input, width: '100%' }} />
      </div>

      <button onClick={() => setShowFollowUps((s) => !s)} type="button"
        style={{ alignSelf: 'flex-start', padding: 0, border: 'none', background: 'none', color: '#5b4aa8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
        {showFollowUps ? '− Hide' : '+ Add'} follow-up sequence (tiers 2-4)
      </button>

      {showFollowUps && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(123,104,200,0.05)', border: '1px solid rgba(123,104,200,0.15)' }}>
          <div>
            <span style={label}>Signup page the tracked link redirects to (blank = default join page)</span>
            <input value={signupUrl} onChange={(e) => setSignupUrl(e.target.value)} placeholder="https://www.collabnb.com/join.html"
              style={{ ...input, width: '100%' }} />
          </div>
          <div>
            <span style={label}>Tier 2 — no click, ~24h later</span>
            <textarea value={tier2Message} onChange={(e) => setTier2Message(e.target.value)} rows={2}
              placeholder="Hey! Just checking you saw this 👋 — here's the link again in case it got buried: {{link}}"
              style={{ ...input, width: '100%', resize: 'vertical' }} />
          </div>
          <div>
            <span style={label}>Tier 3 — clicked but didn't sign up, ~48-72h later</span>
            <textarea value={tier3Message} onChange={(e) => setTier3Message(e.target.value)} rows={2}
              placeholder="Founding member spots are going fast — still time to grab yours: {{link}}"
              style={{ ...input, width: '100%', resize: 'vertical' }} />
          </div>
          <div>
            <span style={label}>Tier 4 — welcome + follow-ask, sent right after signup</span>
            <textarea value={tier4Message} onChange={(e) => setTier4Message(e.target.value)} rows={2}
              placeholder="You're in! 🎉 One more thing — follow @collabnb so you don't miss it when new stays open up in your area."
              style={{ ...input, width: '100%', resize: 'vertical' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button onClick={submit} disabled={busy || !keywords.trim() || !dmMessage.trim()}
          style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', opacity: (busy || !keywords.trim() || !dmMessage.trim()) ? 0.5 : 1 }}>
          {busy ? 'Saving…' : existing ? 'Save changes' : 'Add rule'}
        </button>
        {existing && (
          <button onClick={onDone} style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
        )}
        {err && <span style={{ fontSize: '0.72rem', color: '#9b2d2d' }}>{err}</span>}
      </div>
    </div>
  );
}

// ─── One rule card ───────────────────────────────────────────────────────────
function RuleCard({ rule }) {
  const updateRule = useMutation(api.autoreply.updateRule);
  const removeRule = useMutation(api.autoreply.removeRule);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div style={{ padding: '0.9rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(25,37,36,0.07)' }}>
        <RuleForm existing={rule} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div style={{ padding: '0.9rem 1rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(25,37,36,0.07)', opacity: rule.active ? 1 : 0.55 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
        {rule.keywords.map((k) => (
          <span key={k} style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: 9999, background: 'rgba(123,104,200,0.12)', color: '#5b4aa8', fontWeight: 700 }}>{k}</span>
        ))}
        <span style={{ fontSize: '0.66rem', color: '#646B62' }}>{rule.match_mode === 'word' ? 'whole word' : 'contains'}</span>
        <span style={{ fontSize: '0.66rem', color: '#646B62' }}>· {rule.post_id ? `post ${rule.post_id}` : 'every post'}</span>
        <span style={{ fontSize: '0.66rem', color: '#646B62' }}>· fired {rule.trigger_count}×</span>
      </div>
      <p style={{ fontSize: '0.76rem', color: '#3C5759', margin: '0 0 0.3rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{rule.dm_message}</p>
      {rule.public_reply && <p style={{ fontSize: '0.7rem', color: '#646B62', margin: '0 0 0.5rem' }}>Public reply: "{rule.public_reply}"</p>}
      {(rule.tier2_message || rule.tier3_message || rule.tier4_message) && (
        <p style={{ fontSize: '0.66rem', color: '#5b4aa8', margin: '0 0 0.5rem' }}>
          Follow-ups: {[rule.tier2_message && 'tier 2', rule.tier3_message && 'tier 3', rule.tier4_message && 'tier 4'].filter(Boolean).join(', ')}
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button onClick={() => updateRule({ id: rule._id, active: !rule.active })}
          style={{ padding: '0.28rem 0.7rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
          {rule.active ? 'Pause' : 'Activate'}
        </button>
        <button onClick={() => setEditing(true)}
          style={{ padding: '0.28rem 0.7rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
          Edit
        </button>
        <button onClick={() => { if (window.confirm('Delete this rule?')) removeRule({ id: rule._id }); }}
          style={{ padding: '0.28rem 0.7rem', borderRadius: 9999, border: 'none', background: 'transparent', color: '#9b2d2d', fontSize: '0.7rem', cursor: 'pointer' }}>
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Activity log ────────────────────────────────────────────────────────────
function LogRow({ entry }) {
  const retrySend = useAction(api.autoreply.retrySend);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const cfg = STATUS_CFG[entry.status] || STATUS_CFG.no_match;

  async function retry() {
    setBusy(true); setErr('');
    try { await retrySend({ logId: entry._id }); }
    catch (e) { setErr(e.message?.replace(/^.*Error:\s*/, '') || 'Retry failed'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.6rem 0', borderTop: '1px solid rgba(25,37,36,0.06)' }}>
      <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem', borderRadius: 9999, background: cfg.bg, color: cfg.color, fontWeight: 700, flexShrink: 0, marginTop: '0.1rem' }}>{cfg.label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.76rem', color: '#192524' }}>
          {entry.commenter_username ? <strong>@{entry.commenter_username}</strong> : 'Someone'}: "{entry.comment_text.slice(0, 140)}"
        </div>
        <div style={{ fontSize: '0.66rem', color: '#646B62', marginTop: '0.1rem' }}>{new Date(entry.created_at).toLocaleString()}</div>
        {entry.ref_token && (
          <div style={{ fontSize: '0.66rem', color: '#5b4aa8', marginTop: '0.2rem' }}>
            {entry.signed_up_at ? '✓ Signed up' : entry.link_clicked_at ? 'Clicked link, no signup yet' : 'Link not clicked yet'}
            {entry.tier2_sent_at && ' · tier 2 sent'}
            {entry.tier3_sent_at && ' · tier 3 sent'}
            {entry.tier4_sent_at && ' · tier 4 sent'}
          </div>
        )}
        {entry.error && <div style={{ fontSize: '0.68rem', color: '#9b2d2d', marginTop: '0.2rem' }}>{entry.error}</div>}
        {err && <div style={{ fontSize: '0.68rem', color: '#9b2d2d', marginTop: '0.2rem' }}>{err}</div>}
      </div>
      {entry.status === 'failed' && (
        <button onClick={retry} disabled={busy}
          style={{ padding: '0.25rem 0.7rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, opacity: busy ? 0.5 : 1 }}>
          {busy ? 'Retrying…' : 'Retry'}
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AutoReply() {
  const rules = useQuery(api.autoreply.getRules) || [];
  const log = useQuery(api.autoreply.getLog) || [];
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div style={{ padding: '1.75rem 2rem 2rem' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: '#192524', margin: '0 0 0.2rem' }}>Auto-Reply</h2>
        <p style={{ fontSize: '0.78rem', color: '#646B62', margin: 0 }}>
          When someone comments a keyword on your Instagram posts, automatically DM them a reply — via Meta's official private-replies API, the same one ManyChat uses. Runs on your existing Instagram connection from the Social tab. Optionally add a follow-up sequence: a nudge if they don't click the link, another if they click but don't sign up, and a welcome + follow-ask once they do.
        </p>
      </div>

      <ConnectionBanner />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
        <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#192524' }}>
          Rules ({rules.length})
        </span>
        <button onClick={() => setShowAdd((s) => !s)}
          style={{ padding: '0.35rem 0.9rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: showAdd ? 'rgba(25,37,36,0.06)' : 'transparent', color: '#192524', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>
          {showAdd ? 'Close' : '+ New rule'}
        </button>
      </div>

      {showAdd && (
        <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(25,37,36,0.08)' }}>
          <RuleForm onDone={() => setShowAdd(false)} />
        </div>
      )}

      {rules.length === 0 ? (
        <div style={{ padding: '1.75rem 1rem', textAlign: 'center', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.5)', border: '1px dashed rgba(25,37,36,0.12)', marginBottom: '1.75rem' }}>
          <p style={{ fontSize: '0.8rem', color: '#646B62', margin: 0 }}>No rules yet — add one above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.75rem' }}>
          {rules.map((r) => <RuleCard key={r._id} rule={r} />)}
        </div>
      )}

      <p style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#192524', margin: '0 0 0.5rem' }}>
        Activity ({log.length})
      </p>
      {log.length === 0 ? (
        <p style={{ fontSize: '0.78rem', color: '#646B62' }}>Nothing's come in yet.</p>
      ) : (
        <div style={{ maxHeight: '40vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {log.map((entry) => <LogRow key={entry._id} entry={entry} />)}
        </div>
      )}
    </div>
  );
}
