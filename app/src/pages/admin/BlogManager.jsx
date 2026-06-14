import { useState, useRef } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const STATUS_CFG = {
  draft:     { label: 'Draft',     bg: 'rgba(212,168,67,0.15)',  color: '#b45309' },
  published: { label: 'Published', bg: 'rgba(74,155,127,0.15)', color: '#2d7d5e' },
  rejected:  { label: 'Rejected',  bg: 'rgba(200,104,104,0.1)', color: '#9b2d2d' },
};

const CAT_COLORS = {
  creators: '#7B68C8',
  hosts:    '#4A9B7F',
  industry: '#3C5759',
  stats:    '#D4A843',
};

function Badge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: 9999, background: cfg.bg, color: cfg.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {cfg.label}
    </span>
  );
}

// ─── Post editor / preview modal ──────────────────────────────────────────────
function PostEditor({ post, onClose }) {
  const updatePost   = useMutation(api.blog.updatePost);
  const updateStatus = useMutation(api.blog.updateStatus);
  const deletePost   = useMutation(api.blog.deletePost);

  const [tab,      setTab]      = useState('preview');
  const [title,    setTitle]    = useState(post.title);
  const [excerpt,  setExcerpt]  = useState(post.excerpt);
  const [content,  setContent]  = useState(post.content);
  const [tags,     setTags]     = useState((post.tags || []).join(', '));
  const [igEmbed,  setIgEmbed]  = useState(post.instagram_embed_url || '');
  const [saving,   setSaving]   = useState(false);
  const [confirm,  setConfirm]  = useState(null); // 'approve' | 'reject' | 'delete'

  async function handleSave() {
    setSaving(true);
    try {
      await updatePost({
        id: post._id,
        title,
        excerpt,
        content,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        instagram_embed_url: igEmbed || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    await updateStatus({ id: post._id, status: 'published' });
    onClose();
  }

  async function handleReject() {
    await updateStatus({ id: post._id, status: 'rejected' });
    onClose();
  }

  async function handleDelete() {
    await deletePost({ id: post._id });
    onClose();
  }

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.75rem',
    border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: '0.6rem',
    fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink)',
    background: '#fafafa', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(25,37,36,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 860, background: '#fff', borderRadius: '1.5rem', boxShadow: '0 24px 64px rgba(25,37,36,0.2)', overflow: 'hidden', marginBottom: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(25,37,36,0.08)' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', margin: 0 }}>
              {post.status === 'draft' ? 'Review Draft' : 'Edit Post'}
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>
              Generated {new Date(post.generated_at).toLocaleDateString()} · {post.reading_time || 1} min read
              {post.is_stats_post && ' · Monthly Stats'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Badge status={post.status} />
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(25,37,36,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)', fontSize: '0.875rem' }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(25,37,36,0.08)', padding: '0 1.5rem' }}>
          {['preview', 'edit'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '0.75rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: tab === t ? 700 : 400, color: tab === t ? 'var(--ink)' : 'var(--sage)', borderBottom: tab === t ? '2px solid var(--ink)' : '2px solid transparent', marginBottom: -1, textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ padding: '1.5rem', maxHeight: '65vh', overflowY: 'auto' }}>

          {tab === 'preview' ? (
            <div>
              {/* Hero image */}
              {post.hero_image_url && (
                <div style={{ marginBottom: '1.5rem', borderRadius: '0.875rem', overflow: 'hidden', position: 'relative' }}>
                  <img src={post.hero_image_url} alt={post.hero_image_alt || ''} style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }} />
                  {post.hero_image_credit && (
                    <a href={post.hero_image_credit_url || '#'} target="_blank" rel="noopener noreferrer" style={{ position: 'absolute', bottom: '0.5rem', right: '0.75rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.35)', padding: '0.2rem 0.5rem', borderRadius: 4, textDecoration: 'none' }}>
                      Photo: {post.hero_image_credit} / Unsplash
                    </a>
                  )}
                </div>
              )}
              {/* Meta */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: 9999, background: `${CAT_COLORS[post.category] || '#3C5759'}20`, color: CAT_COLORS[post.category] || '#3C5759', textTransform: 'capitalize' }}>{post.category}</span>
                {(post.tags || []).map(tag => (
                  <span key={tag} style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: 9999, background: 'rgba(25,37,36,0.06)', color: 'var(--sage)' }}>#{tag}</span>
                ))}
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--ink)', margin: '0 0 0.5rem', lineHeight: 1.25 }}>{title}</h1>
              <p style={{ fontSize: '0.9rem', color: 'var(--sage)', margin: '0 0 1.5rem', lineHeight: 1.6 }}>{excerpt}</p>
              <div style={{ fontSize: '0.9rem', lineHeight: 1.75, color: 'var(--ink)' }} dangerouslySetInnerHTML={{ __html: content }} />
              {igEmbed && (
                <div style={{ margin: '1.5rem 0', padding: '1rem', background: 'rgba(25,37,36,0.04)', borderRadius: '0.75rem', fontSize: '0.8rem', color: 'var(--slate)' }}>
                  Instagram embed: <a href={igEmbed} target="_blank" rel="noopener noreferrer" style={{ color: '#7B68C8' }}>{igEmbed}</a>
                </div>
              )}
              {/* Sources */}
              {(post.sources || []).length > 0 && (
                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(25,37,36,0.08)' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Sources</p>
                  {(post.sources || []).map((s, i) => (
                    <a key={i} href={s} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '0.75rem', color: '#7B68C8', marginBottom: '0.25rem', wordBreak: 'break-all' }}>{s}</a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>Excerpt</label>
                <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>Content (HTML)</label>
                <textarea value={content} onChange={e => setContent(e.target.value)} rows={16} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>Tags (comma-separated)</label>
                <input value={tags} onChange={e => setTags(e.target.value)} style={inputStyle} placeholder="creator travel, UGC, boutique hotels" />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>Instagram Embed URL (optional)</label>
                <input value={igEmbed} onChange={e => setIgEmbed(e.target.value)} style={inputStyle} placeholder="https://www.instagram.com/p/..." />
              </div>
              <button onClick={handleSave} disabled={saving} style={{ alignSelf: 'flex-start', padding: '0.6rem 1.25rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.5 : 1 }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          )}
        </div>

        {/* Action footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(25,37,36,0.08)', display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', background: '#fafafa' }}>
          {post.status !== 'published' && (
            <>
              <button onClick={() => setConfirm('reject')} style={{ padding: '0.6rem 1.1rem', borderRadius: 9999, border: '1.5px solid rgba(200,104,104,0.35)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600, color: '#9b2d2d', cursor: 'pointer' }}>
                Reject
              </button>
              <button onClick={() => setConfirm('approve')} style={{ padding: '0.6rem 1.25rem', borderRadius: 9999, border: 'none', background: '#192524', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                Approve & Publish
              </button>
            </>
          )}
          {post.status === 'published' && (
            <button onClick={() => setConfirm('reject')} style={{ padding: '0.6rem 1.1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.2)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)', cursor: 'pointer' }}>
              Unpublish
            </button>
          )}
          <button onClick={() => setConfirm('delete')} style={{ padding: '0.6rem 1rem', borderRadius: 9999, border: '1.5px solid rgba(200,104,104,0.25)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600, color: '#c0392b', cursor: 'pointer' }}>
            Delete
          </button>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(25,37,36,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', maxWidth: 360, width: '90%', textAlign: 'center', boxShadow: '0 16px 40px rgba(25,37,36,0.2)' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
              {confirm === 'approve' ? 'Publish this post?' : confirm === 'reject' ? 'Reject this post?' : 'Delete this post?'}
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginBottom: '1.25rem' }}>
              {confirm === 'approve' ? 'It will appear on the public Collabnb blog immediately.' : confirm === 'reject' ? 'It will be moved to rejected status.' : 'This cannot be undone.'}
            </p>
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center' }}>
              <button onClick={() => setConfirm(null)} style={{ padding: '0.6rem 1.1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.15)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={() => { setConfirm(null); if (confirm === 'approve') handleApprove(); else if (confirm === 'reject') handleReject(); else handleDelete(); }}
                style={{ padding: '0.6rem 1.25rem', borderRadius: 9999, border: 'none', background: confirm === 'approve' ? '#192524' : '#c0392b', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 700, color: '#fff', cursor: 'pointer' }}
              >
                {confirm === 'approve' ? 'Publish' : confirm === 'reject' ? 'Reject' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Post row card ────────────────────────────────────────────────────────────
function PostCard({ post, onOpen }) {
  return (
    <div
      onClick={() => onOpen(post)}
      style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(25,37,36,0.08)', cursor: 'pointer', transition: 'box-shadow 150ms, transform 150ms' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(25,37,36,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
    >
      {post.hero_image_url && (
        <img src={post.hero_image_url} alt="" style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: '0.5rem', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}>
          <Badge status={post.status} />
          {post.is_stats_post && <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem', borderRadius: 9999, background: 'rgba(212,168,67,0.12)', color: '#b45309', fontWeight: 600 }}>Stats</span>}
          <span style={{ fontSize: '0.65rem', color: 'var(--stone)' }}>{new Date(post.generated_at).toLocaleDateString()}</span>
        </div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', margin: '0 0 0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.excerpt}</p>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--stone)', flexShrink: 0, paddingTop: '0.25rem' }}>
        {post.reading_time || 1} min
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BlogManager() {
  const allPosts    = useQuery(api.blog.getAll) || [];
  const generatePost = useAction(api.blog.generatePost);

  const [tab,        setTab]        = useState('drafts');
  const [editing,    setEditing]    = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState(null);
  const [topic,      setTopic]      = useState('');

  const drafts    = allPosts.filter(p => p.status === 'draft');
  const published = allPosts.filter(p => p.status === 'published');
  const rejected  = allPosts.filter(p => p.status === 'rejected');

  const tabPosts = { drafts, published, rejected }[tab] || [];

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      await generatePost({ isStatsPost: false, topicHint: topic.trim() || undefined });
      setTab('drafts');
    } catch (e) {
      setGenError(e.message || 'Generation failed. Check that NVIDIA_API_KEY and UNSPLASH_ACCESS_KEY are set in Convex.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)', margin: 0 }}>Blog</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--sage)', margin: '0.2rem 0 0' }}>
              {drafts.length} draft{drafts.length !== 1 ? 's' : ''} · {published.length} published
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !generating) handleGenerate(); }}
            placeholder="Topic (optional) — e.g. &quot;how UGC creators pick their collab stays&quot;"
            style={{ flex: 1, padding: '0.6rem 0.875rem', border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: 9999, fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink)', background: '#fafafa', outline: 'none', minWidth: 0 }}
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: 9999, border: 'none', background: generating ? 'rgba(25,37,36,0.4)' : '#192524', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 700, color: '#fff', cursor: generating ? 'default' : 'pointer', transition: 'background 150ms', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {generating ? (
              <>
                <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Generating…
              </>
            ) : '✦ Generate'}
          </button>
        </div>
      </div>

      {genError && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'rgba(200,104,104,0.1)', border: '1px solid rgba(200,104,104,0.3)', fontSize: '0.82rem', color: '#9b2d2d' }}>
          {genError}
        </div>
      )}

      {/* API key setup notice */}
      {allPosts.length === 0 && !generating && (
        <div style={{ marginBottom: '1.25rem', padding: '0.875rem 1rem', borderRadius: '0.875rem', background: 'rgba(74,155,127,0.08)', border: '1px solid rgba(74,155,127,0.25)' }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2d7d5e', margin: '0 0 0.25rem' }}>Powered by NVIDIA + Unsplash</p>
          <p style={{ fontSize: '0.78rem', color: '#2d7d5e', margin: 0, opacity: 0.85 }}>
            Enter a topic above and hit Generate — NVIDIA researches and writes, Unsplash adds the hero photo. Post lands in Drafts for your review.
          </p>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', background: 'rgba(25,37,36,0.05)', borderRadius: '0.875rem', padding: '0.25rem' }}>
        {[
          { key: 'drafts',    label: `Drafts (${drafts.length})`    },
          { key: 'published', label: `Published (${published.length})` },
          { key: 'rejected',  label: `Rejected (${rejected.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{ flex: 1, padding: '0.5rem', borderRadius: '0.625rem', border: 'none', background: tab === key ? '#fff' : 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: tab === key ? 700 : 400, color: tab === key ? 'var(--ink)' : 'var(--sage)', cursor: 'pointer', boxShadow: tab === key ? '0 1px 4px rgba(25,37,36,0.1)' : 'none', transition: 'all 150ms' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Post list */}
      {tabPosts.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.5)', borderRadius: '1rem', border: '1px solid rgba(25,37,36,0.07)' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', margin: '0 0 0.35rem' }}>
            No {tab} posts
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: 0 }}>
            {tab === 'drafts' ? 'Hit "Generate Now" or wait for the 9am daily auto-run.' : `Posts you ${tab === 'published' ? 'approve' : 'reject'} will appear here.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {tabPosts.map(post => (
            <PostCard key={post._id} post={post} onOpen={setEditing} />
          ))}
        </div>
      )}

      {editing && <PostEditor post={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
