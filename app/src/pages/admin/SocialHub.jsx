import { useState, useEffect } from 'react';
import { useQuery, useAction, useMutation, useConvex } from 'convex/react';
import { api } from '../../../convex/_generated/api';

async function uploadRawFile(file, generateUploadUrl, getStorageUrl) {
  const uploadUrl = await generateUploadUrl();
  const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
  const { storageId } = await res.json();
  const url = await getStorageUrl({ storageId });
  return url;
}

function fmt(n) {
  if (n === undefined || n === null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

const SETUP = {
  instagram: {
    name: 'Instagram',
    color: '#7B68C8',
    steps: [
      'Switch the Collabnb IG account to Business/Creator and link a Facebook Page.',
      'Create a Meta app at developers.facebook.com and add the Instagram Graph API product.',
      'In Graph API Explorer, generate a token with: instagram_basic, instagram_manage_insights, instagram_content_publish, instagram_manage_messages, instagram_manage_comments, pages_show_list, pages_read_engagement.',
      'Own-account use only — no App Review or Business Verification needed; Development Mode covers the app Admin.',
      'Find the IG business account id via the Graph Explorer (me/accounts, then ?fields=instagram_business_account).',
    ],
    envCmds: [
      'npx convex env set META_ACCESS_TOKEN EAAG...',
      'npx convex env set IG_BUSINESS_ACCOUNT_ID 1784...',
    ],
  },
  tiktok: {
    name: 'TikTok',
    color: '#4A9B7F',
    steps: [
      'Create an app at developers.tiktok.com with the Display API (user.info.basic + video.list scopes).',
      'Complete the OAuth flow once to get an access token for the Collabnb account.',
    ],
    envCmds: ['npx convex env set TIKTOK_ACCESS_TOKEN act....'],
  },
};

function ConnectorCard({ platform, account, configured, onSync, syncing, syncMsg }) {
  const cfg = SETUP[platform];
  const [showSetup, setShowSetup] = useState(false);
  const connected = account?.connected;

  return (
    <div style={{ flex: 1, minWidth: 280, padding: '1.25rem', borderRadius: '1.25rem', background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(25,37,36,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {account?.profile_pic_url
            ? <img src={account.profile_pic_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${cfg.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: cfg.color, fontFamily: 'Cabinet Grotesk, sans-serif' }}>{cfg.name[0]}</div>}
          <div>
            <p style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#192524', margin: 0 }}>{cfg.name}</p>
            <p style={{ fontSize: '0.72rem', color: '#959D90', margin: 0 }}>
              {connected ? `@${account.handle}` : configured ? 'Key set, not synced yet' : 'Not connected'}
            </p>
          </div>
        </div>
        <span style={{
          fontSize: '0.62rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: 9999,
          background: connected ? 'rgba(209,235,219,0.8)' : 'rgba(25,37,36,0.06)',
          color: connected ? '#166534' : '#959D90',
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          {connected ? 'Connected' : 'Offline'}
        </span>
      </div>

      {connected && (
        <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem' }}>
          <div><span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '1.15rem', color: '#192524' }}>{fmt(account.follower_count)}</span><span style={{ fontSize: '0.68rem', color: '#959D90', display: 'block' }}>Followers</span></div>
          <div><span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '1.15rem', color: '#192524' }}>{fmt(account.media_count)}</span><span style={{ fontSize: '0.68rem', color: '#959D90', display: 'block' }}>Posts</span></div>
          {account.last_synced_at && <div style={{ alignSelf: 'flex-end' }}><span style={{ fontSize: '0.68rem', color: '#959D90' }}>Synced {new Date(account.last_synced_at).toLocaleString()}</span></div>}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={onSync} disabled={syncing}
          style={{ padding: '0.45rem 1rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', opacity: syncing ? 0.5 : 1 }}>
          {syncing ? 'Syncing' : connected ? 'Sync now' : 'Connect / Sync'}
        </button>
        <button onClick={() => setShowSetup(s => !s)}
          style={{ padding: '0.45rem 1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
          Setup guide
        </button>
      </div>

      {syncMsg && (
        <p aria-live="polite" style={{ fontSize: '0.72rem', color: syncMsg.startsWith('Synced') ? '#2d7d5e' : '#9b2d2d', margin: '0.6rem 0 0', lineHeight: 1.4 }}>{syncMsg}</p>
      )}

      {showSetup && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(25,37,36,0.03)', border: '1px solid rgba(25,37,36,0.07)' }}>
          <ol style={{ margin: '0 0 0.6rem', paddingLeft: '1.1rem', fontSize: '0.74rem', color: '#3C5759', lineHeight: 1.6 }}>
            {cfg.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#959D90', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.3rem' }}>Then run</p>
          {cfg.envCmds.map((c, i) => (
            <code key={i} style={{ display: 'block', fontSize: '0.7rem', background: '#192524', color: '#D1EBDB', padding: '0.4rem 0.6rem', borderRadius: 6, marginBottom: '0.3rem', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'nowrap' }}>{c}</code>
          ))}
        </div>
      )}
    </div>
  );
}

function Composer({ configured }) {
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const convex = useConvex();
  const getStorageUrl = (args) => convex.query(api.uploads.getStorageUrl, args);
  const publishPost = useAction(api.social.publishPost);
  const finishPublish = useAction(api.social.finishPublish);

  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [mediaType, setMediaType] = useState('IMAGE');
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);

  async function handlePublish() {
    if (!file) { setResult({ message: 'Choose a photo or video first.' }); return; }
    setPublishing(true);
    setResult(null);
    try {
      const mediaUrl = await uploadRawFile(file, generateUploadUrl, getStorageUrl);
      const r = await publishPost({ caption, mediaUrl, mediaType });
      setResult(r);
      if (r.published) { setCaption(''); setFile(null); }
    } catch (e) {
      setResult({ message: e.message?.replace(/^.*Error:\s*/, '') || 'Publish failed' });
    } finally {
      setPublishing(false);
    }
  }

  async function handleFinish() {
    if (!result?.creationId) return;
    setPublishing(true);
    try {
      const r = await finishPublish({ creationId: result.creationId });
      setResult(r);
      if (r.published) { setCaption(''); setFile(null); }
    } catch (e) {
      setResult({ message: e.message?.replace(/^.*Error:\s*/, '') || 'Publish failed' });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div style={{ padding: '1.25rem', borderRadius: '1.25rem', background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.8)', marginBottom: '1.5rem' }}>
      <p style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#192524', margin: '0 0 0.75rem' }}>New Instagram post</p>
      {!configured && (
        <p style={{ fontSize: '0.78rem', color: '#959D90', margin: '0 0 0.75rem' }}>Connect Instagram above first (needs the instagram_content_publish permission).</p>
      )}
      <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write a caption..."
        rows={3} disabled={!configured}
        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.6rem', border: '1.5px solid rgba(25,37,36,0.12)', fontSize: '0.82rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: '0.6rem', boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <select value={mediaType} onChange={(e) => setMediaType(e.target.value)} disabled={!configured}
          style={{ padding: '0.4rem 0.6rem', border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: '0.6rem', fontSize: '0.78rem', color: '#192524', background: '#fafafa' }}>
          <option value="IMAGE">Photo</option>
          <option value="REEL">Reel (video)</option>
        </select>
        <input type="file" accept={mediaType === 'REEL' ? 'video/*' : 'image/*'} disabled={!configured}
          onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: '0.78rem' }} />
        <button onClick={handlePublish} disabled={!configured || publishing || !file}
          style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', opacity: (!configured || publishing || !file) ? 0.5 : 1 }}>
          {publishing ? 'Publishing...' : 'Publish'}
        </button>
      </div>
      {result && (
        <div style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
          {result.published ? (
            <p style={{ color: '#166534', margin: 0 }}>
              Posted!{' '}
              {result.permalink && <a href={result.permalink} target="_blank" rel="noopener noreferrer" style={{ color: '#166534' }}>View on Instagram</a>}
            </p>
          ) : result.creationId ? (
            <p style={{ color: '#92400E', margin: 0, display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {result.message}
              <button onClick={handleFinish} disabled={publishing}
                style={{ padding: '0.3rem 0.75rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}>
                Finish publishing
              </button>
            </p>
          ) : (
            <p style={{ color: '#9b2d2d', margin: 0 }}>{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
}

function InboxPanel({ configured }) {
  const [onlyUnreplied, setOnlyUnreplied] = useState(true);
  const items = useQuery(api.social.getInboxItems, { onlyUnreplied }) || [];
  const syncInbox = useAction(api.social.syncInbox);
  const sendReply = useAction(api.social.sendReply);

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [drafts, setDrafts] = useState({});
  const [sending, setSending] = useState({});

  async function handleSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const r = await syncInbox({});
      setSyncMsg(`${r.synced} new message${r.synced === 1 ? '' : 's'}.`);
    } catch (e) {
      setSyncMsg(e.message?.replace(/^.*Error:\s*/, '') || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function handleReply(id) {
    const text = (drafts[id] || '').trim();
    if (!text) return;
    setSending((s) => ({ ...s, [id]: true }));
    try {
      await sendReply({ id, replyText: text });
      setDrafts((d) => ({ ...d, [id]: '' }));
    } catch (e) {
      alert(e.message?.replace(/^.*Error:\s*/, '') || 'Reply failed');
    } finally {
      setSending((s) => ({ ...s, [id]: false }));
    }
  }

  return (
    <div style={{ padding: '1.25rem', borderRadius: '1.25rem', background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.8)', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.75rem' }}>
        <p style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#192524', margin: 0 }}>Instagram inbox</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <label style={{ fontSize: '0.74rem', color: '#3C5759', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <input type="checkbox" checked={onlyUnreplied} onChange={(e) => setOnlyUnreplied(e.target.checked)} />
            Unreplied only
          </label>
          <button onClick={handleSync} disabled={!configured || syncing}
            style={{ padding: '0.4rem 0.9rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', opacity: (!configured || syncing) ? 0.5 : 1 }}>
            {syncing ? 'Syncing...' : 'Sync inbox'}
          </button>
        </div>
      </div>
      {!configured && <p style={{ fontSize: '0.78rem', color: '#959D90', margin: '0 0 0.5rem' }}>Connect Instagram above first.</p>}
      {syncMsg && <p style={{ fontSize: '0.74rem', color: '#3C5759', margin: '0 0 0.5rem' }}>{syncMsg}</p>}

      {items.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: '#959D90', margin: 0 }}>Nothing here — hit Sync inbox to pull in DMs and comments.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {items.map((item) => (
            <div key={item._id} style={{ padding: '0.75rem 0.9rem', borderRadius: '0.85rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(25,37,36,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 9999, background: item.kind === 'dm' ? 'rgba(123,104,200,0.15)' : 'rgba(74,155,127,0.15)', color: item.kind === 'dm' ? '#7B68C8' : '#4A9B7F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {item.kind === 'dm' ? 'DM' : 'Comment'}
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#192524' }}>@{item.from_username || 'unknown'}</span>
                {item.post_permalink && (
                  <a href={item.post_permalink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.68rem', color: '#959D90' }}>view post</a>
                )}
                {item.replied && <span style={{ fontSize: '0.68rem', color: '#166534' }}>Replied</span>}
              </div>
              <p style={{ fontSize: '0.82rem', color: '#3C5759', margin: '0 0 0.5rem', lineHeight: 1.5 }}>{item.text}</p>
              {item.replied ? (
                <p style={{ fontSize: '0.76rem', color: '#959D90', margin: 0, fontStyle: 'italic' }}>You replied: "{item.reply_text}"</p>
              ) : (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input value={drafts[item._id] || ''} onChange={(e) => setDrafts((d) => ({ ...d, [item._id]: e.target.value }))}
                    placeholder="Write a reply..." style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '0.5rem', border: '1.5px solid rgba(25,37,36,0.12)', fontSize: '0.78rem' }} />
                  <button onClick={() => handleReply(item._id)} disabled={sending[item._id] || !(drafts[item._id] || '').trim()}
                    style={{ padding: '0.4rem 0.9rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', opacity: sending[item._id] ? 0.5 : 1 }}>
                    {sending[item._id] ? '...' : 'Reply'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SocialHub() {
  const accounts = useQuery(api.social.getAccounts) || [];
  const summary = useQuery(api.social.getSummary);
  const posts = useQuery(api.social.getPosts, { limit: 30 }) || [];
  const syncInstagram = useAction(api.social.syncInstagram);
  const syncTikTok = useAction(api.social.syncTikTok);
  const getIntegrationStatus = useAction(api.social.getIntegrationStatus);

  const [integrations, setIntegrations] = useState(null);
  const [syncing, setSyncing] = useState({});
  const [syncMsg, setSyncMsg] = useState({});
  const [platformFilter, setPlatformFilter] = useState('');

  useEffect(() => {
    getIntegrationStatus({}).then(setIntegrations).catch(() => {});
  }, [getIntegrationStatus]);

  const igAccount = accounts.find(a => a.platform === 'instagram');
  const ttAccount = accounts.find(a => a.platform === 'tiktok');

  async function handleSync(platform) {
    const fn = platform === 'instagram' ? syncInstagram : syncTikTok;
    setSyncing(s => ({ ...s, [platform]: true }));
    setSyncMsg(m => ({ ...m, [platform]: '' }));
    try {
      const r = await fn({});
      setSyncMsg(m => ({ ...m, [platform]: `Synced ${r.synced} posts.` }));
    } catch (e) {
      setSyncMsg(m => ({ ...m, [platform]: e.message?.replace(/^.*Error:\s*/, '') || 'Sync failed' }));
    } finally {
      setSyncing(s => ({ ...s, [platform]: false }));
    }
  }

  const visiblePosts = platformFilter ? posts.filter(p => p.platform === platformFilter) : posts;

  return (
    <div style={{ padding: '1.75rem 2rem 2rem' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: '#192524', margin: '0 0 0.2rem' }}>Social</h2>
        <p style={{ fontSize: '0.78rem', color: '#959D90', margin: 0 }}>
          Collabnb's own Instagram and TikTok performance in one place. Connect each platform with the setup guide, then sync.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <ConnectorCard platform="instagram" account={igAccount} configured={integrations?.instagram}
          onSync={() => handleSync('instagram')} syncing={!!syncing.instagram} syncMsg={syncMsg.instagram} />
        <ConnectorCard platform="tiktok" account={ttAccount} configured={integrations?.tiktok}
          onSync={() => handleSync('tiktok')} syncing={!!syncing.tiktok} syncMsg={syncMsg.tiktok} />
      </div>

      <Composer configured={!!integrations?.instagram} />
      <InboxPanel configured={!!integrations?.instagram} />

      {/* Totals */}
      {summary && (posts.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'IG likes', value: fmt(summary.instagram.likes) },
            { label: 'IG comments', value: fmt(summary.instagram.comments) },
            { label: 'TikTok views', value: fmt(summary.tiktok.views) },
            { label: 'TikTok likes', value: fmt(summary.tiktok.likes) },
          ].map(s => (
            <div key={s.label} style={{ padding: '0.9rem 1rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(25,37,36,0.07)' }}>
              <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '1.3rem', color: '#192524' }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#959D90', marginTop: '0.2rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recent posts */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <p style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#192524', margin: 0 }}>Recent posts</p>
        <select aria-label="Filter posts by platform" value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
          style={{ padding: '0.4rem 0.6rem', border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: '0.6rem', fontSize: '0.75rem', color: '#192524', background: '#fafafa' }}>
          <option value="">Both platforms</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
        </select>
      </div>

      {visiblePosts.length === 0 ? (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', borderRadius: '1rem', background: 'rgba(255,255,255,0.5)', border: '1px dashed rgba(25,37,36,0.12)' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#192524', margin: '0 0 0.3rem', fontFamily: 'Cabinet Grotesk, sans-serif' }}>No posts synced yet</p>
          <p style={{ fontSize: '0.78rem', color: '#959D90', margin: 0 }}>Connect a platform above and hit Sync to pull in your posts and their metrics.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {visiblePosts.map(p => (
            <a key={p._id} href={p.permalink} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', borderRadius: '0.875rem', overflow: 'hidden', background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(25,37,36,0.07)', textDecoration: 'none', pointerEvents: p.permalink ? 'auto' : 'none' }}>
              {(p.thumbnail_url || p.media_url) && (
                <img src={p.thumbnail_url || p.media_url} alt="" style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} loading="lazy" />
              )}
              <div style={{ padding: '0.6rem 0.75rem' }}>
                <p style={{ fontSize: '0.72rem', color: '#3C5759', margin: '0 0 0.4rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>
                  {p.caption || '(no caption)'}
                </p>
                <div style={{ display: 'flex', gap: '0.7rem', fontSize: '0.68rem', color: '#959D90' }}>
                  <span style={{ textTransform: 'capitalize' }}>{p.platform}</span>
                  {p.likes !== undefined && <span>{fmt(p.likes)} likes</span>}
                  {p.comments !== undefined && <span>{fmt(p.comments)} comments</span>}
                  {p.views !== undefined && <span>{fmt(p.views)} views</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
