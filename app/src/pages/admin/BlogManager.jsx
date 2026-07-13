import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import BlogEditor from './BlogEditor';

// A post is "legacy format" if it predates the structured template (no hero
// image or no inline image markers in the content).
function isLegacyFormat(post) {
  const hasMarkers = /%%INLINE_IMAGE_\d%%/.test(post.content || '') || post.inline_image_1_url;
  return !post.hero_image_url || !hasMarkers || !post.pull_quote;
}

const STATUS_CFG = {
  draft:     { label: 'Draft',     bg: 'rgba(212,168,67,0.15)',  color: '#b45309' },
  published: { label: 'Published', bg: 'rgba(74,155,127,0.15)', color: '#2d7d5e' },
  rejected:  { label: 'Rejected',  bg: 'rgba(200,104,104,0.1)', color: '#9b2d2d' },
};

function Badge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: 9999, background: cfg.bg, color: cfg.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {cfg.label}
    </span>
  );
}

// ─── Post row card ────────────────────────────────────────────────────────────
function PostCard({ post, onOpen }) {
  const score = post.review_score;
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
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
          <Badge status={post.status} />
          {typeof score === 'number' && (
            <span title="DeepSeek editorial review score" style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem', borderRadius: 9999, background: score >= 7 ? 'rgba(74,155,127,0.12)' : 'rgba(212,168,67,0.15)', color: score >= 7 ? '#2d7d5e' : '#b45309', fontWeight: 700 }}>
              ✓ {score}/10
            </span>
          )}
          {(post.sources || []).length > 0 && (
            <span title="Cited sources from live research" style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem', borderRadius: 9999, background: 'rgba(123,104,200,0.1)', color: '#7B68C8', fontWeight: 600 }}>
              {post.sources.length} sources
            </span>
          )}
          {post.is_stats_post && <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem', borderRadius: 9999, background: 'rgba(212,168,67,0.12)', color: '#b45309', fontWeight: 600 }}>Stats</span>}
          {isLegacyFormat(post) && <span title="Missing hero image, inline images, or pull quote. Open to update, or regenerate." style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem', borderRadius: 9999, background: 'rgba(200,104,104,0.1)', color: '#9b2d2d', fontWeight: 600 }}>Legacy format</span>}
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
const PROGRESS_STAGES = [
  { to: 22, label: 'Reading industry journals…', ms: 8000  },
  { to: 45, label: 'Researching topic…',         ms: 10000 },
  { to: 72, label: 'Writing article…',           ms: 16000 },
  { to: 86, label: 'Editorial review…',          ms: 9000  },
  { to: 94, label: 'Finding photos…',            ms: 3000  },
  { to: 98, label: 'Saving draft…',              ms: 1500  },
];

export default function BlogManager() {
  const allPosts       = useQuery(api.blog.getAll) || [];
  const generatePost   = useAction(api.blog.generatePost);
  const suggestTopics  = useAction(api.blog.suggestTopics);
  const createBlank    = useMutation(api.blog.createBlankPost);
  const getIntegrationStatus = useAction(api.social.getIntegrationStatus);
  const [integrations, setIntegrations] = useState(null);

  useEffect(() => {
    getIntegrationStatus({}).then(setIntegrations).catch(() => {});
  }, [getIntegrationStatus]);

  const writer = integrations?.nvidia ? 'NVIDIA' : integrations?.deepseek ? 'DeepSeek' : integrations?.openrouter ? 'OpenRouter' : null;
  const reviewer = integrations?.deepseek ? 'DeepSeek' : null;
  const research = integrations?.scrapegraph ? 'Journals + ScrapeGraphAI' : 'Journals (RSS + Jina)';

  const [tab,          setTab]          = useState('drafts');
  const [editing,      setEditing]      = useState(null);
  const [pendingOpen,  setPendingOpen]  = useState(null); // { id, minGen? }
  const [generating,   setGenerating]   = useState(false);
  const [genError,     setGenError]     = useState(null);
  const [topic,        setTopic]        = useState('');
  const [genProgress,  setGenProgress]  = useState(0);
  const [genStage,     setGenStage]     = useState('');
  const [suggestions,  setSuggestions]  = useState([]);
  const [suggIdx,      setSuggIdx]      = useState(0);
  const [loadingSugg,  setLoadingSugg]  = useState(false);
  const timerRef = useRef(null);

  const drafts    = allPosts.filter(p => p.status === 'draft');
  const published = allPosts.filter(p => p.status === 'published');
  const rejected  = allPosts.filter(p => p.status === 'rejected');
  const tabPosts  = { drafts, published, rejected }[tab] || [];

  // Open a just-created or just-regenerated post as soon as the live query
  // returns the fresh version (minGen guards against a stale copy).
  useEffect(() => {
    if (!pendingOpen) return;
    const post = allPosts.find(p => p._id === pendingOpen.id);
    if (post && (!pendingOpen.minGen || post.generated_at >= pendingOpen.minGen)) {
      setEditing(post);
      setPendingOpen(null);
    }
  }, [pendingOpen, allPosts]);

  function startProgress() {
    let stageIdx = 0;
    let current  = 0;
    setGenProgress(0);
    setGenStage(PROGRESS_STAGES[0].label);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const stage = PROGRESS_STAGES[stageIdx];
      if (!stage) return;
      const steps = stage.ms / 400;
      const inc   = (stage.to - current) / steps;
      current = Math.min(current + inc, stage.to);
      setGenProgress(Math.round(current));
      if (current >= stage.to - 0.5) {
        stageIdx++;
        if (PROGRESS_STAGES[stageIdx]) setGenStage(PROGRESS_STAGES[stageIdx].label);
      }
    }, 400);
  }

  function stopProgress(ok) {
    clearInterval(timerRef.current);
    if (ok) {
      setGenProgress(100);
      setGenStage('Saved to drafts ✓');
    }
    setTimeout(() => { setGenProgress(0); setGenStage(''); }, 1400);
  }

  async function handleShuffle() {
    if (loadingSugg || generating) return;
    if (suggestions.length > 0) {
      const next = (suggIdx + 1) % suggestions.length;
      setSuggIdx(next);
      setTopic(suggestions[next]);
      return;
    }
    setLoadingSugg(true);
    try {
      const topics = await suggestTopics({});
      if (topics.length > 0) {
        setSuggestions(topics);
        setSuggIdx(0);
        setTopic(topics[0]);
      }
    } finally {
      setLoadingSugg(false);
    }
  }

  async function handleGenerate(topicOverride) {
    setGenerating(true);
    setGenError(null);
    startProgress();
    const hint = topicOverride || topic.trim() || (suggestions.length > 0 ? suggestions[suggIdx] : undefined);
    try {
      await generatePost({ isStatsPost: false, topicHint: hint || undefined });
      stopProgress(true);
      setTab('drafts');
    } catch (e) {
      stopProgress(false);
      setGenError(e.message || 'Generation failed. Check that NVIDIA_API_KEY and UNSPLASH_ACCESS_KEY are set in Convex.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleNewPost() {
    const id = await createBlank({});
    setTab('drafts');
    setPendingOpen({ id });
  }

  return (
    <div style={{ padding: '2rem 2rem 1.75rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)', margin: '0 0 0.2rem' }}>Blog</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--sage)', margin: 0 }}>
              {drafts.length} draft{drafts.length !== 1 ? 's' : ''} · {published.length} published
            </p>
          </div>
          <button
            onClick={handleNewPost}
            style={{ padding: '0.55rem 1.1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.15)', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}
          >
            + New post
          </button>
        </div>

        {/* Topic row */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Shuffle button */}
          <button
            onClick={handleShuffle}
            disabled={generating}
            title={suggestions.length > 0 ? `${suggIdx + 1} / ${suggestions.length} — click to cycle` : 'Get topic ideas from this week’s industry news'}
            style={{
              flexShrink: 0, width: 38, height: 38,
              borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.14)',
              background: loadingSugg ? 'rgba(25,37,36,0.06)' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: generating ? 'default' : 'pointer',
              transition: 'border-color 120ms, background 120ms',
              opacity: generating ? 0.45 : 1,
            }}
          >
            {loadingSugg
              ? <span style={{ width: 12, height: 12, border: '1.5px solid rgba(25,37,36,0.2)', borderTopColor: '#3C5759', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3C5759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                  <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                </svg>
            }
          </button>

          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !generating) handleGenerate(); }}
            placeholder="Topic — leave blank to react to this week's industry news, or ⇄ for ideas"
            style={{
              flex: 1, padding: '0.65rem 1rem',
              border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: 9999,
              fontFamily: 'var(--font-body)', fontSize: '0.82rem',
              color: 'var(--ink)', background: '#fafafa', outline: 'none', minWidth: 0,
            }}
          />

          <button
            onClick={() => handleGenerate()}
            disabled={generating}
            style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.65rem 1.5rem',
              borderRadius: 9999, border: 'none',
              background: generating ? 'rgba(25,37,36,0.35)' : '#192524',
              fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 700,
              color: '#fff', cursor: generating ? 'default' : 'pointer',
              transition: 'background 150ms', whiteSpace: 'nowrap',
            }}
          >
            ✦ Generate
          </button>
        </div>

        {/* Progress bar */}
        {generating && (
          <div style={{ marginTop: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--sage)', fontWeight: 500 }}>{genStage}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--stone)', fontWeight: 600 }}>{genProgress}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 9999, background: 'rgba(25,37,36,0.08)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 9999,
                background: 'linear-gradient(90deg, #4A9B7F, #7B68C8)',
                width: `${genProgress}%`,
                transition: 'width 380ms ease-out',
              }} />
            </div>
          </div>
        )}
        {!generating && genProgress === 100 && (
          <div style={{ marginTop: '0.875rem' }}>
            <div style={{ height: 5, borderRadius: 9999, background: 'rgba(74,155,127,0.2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 9999, background: '#4A9B7F', width: '100%' }} />
            </div>
          </div>
        )}
      </div>

      {genError && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'rgba(200,104,104,0.1)', border: '1px solid rgba(200,104,104,0.3)', fontSize: '0.82rem', color: '#9b2d2d' }}>
          {genError}
        </div>
      )}

      {/* Pipeline status */}
      {integrations && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {[
            { label: writer ? `Writer: ${writer}` : 'Writer: none', ok: !!writer, hint: !writer && 'Set NVIDIA_API_KEY in Convex env' },
            { label: `Research: ${research}`, ok: true, hint: !integrations.scrapegraph && 'Add SGAI_API_KEY in Convex env for deeper stats scraping' },
            { label: reviewer ? `Reviewer: ${reviewer}` : 'Reviewer: lint only', ok: !!reviewer, hint: !reviewer && 'Set DEEPSEEK_API_KEY in Convex env for the editorial review pass' },
            { label: integrations.unsplash ? 'Photos: Unsplash' : 'Photos: missing key', ok: !!integrations.unsplash, hint: !integrations.unsplash && 'Set UNSPLASH_ACCESS_KEY in Convex env' },
          ].map((chip, i) => (
            <span key={i} title={chip.hint || ''} style={{
              fontSize: '0.7rem', fontWeight: 600, padding: '0.3rem 0.7rem', borderRadius: 9999,
              background: chip.ok ? 'rgba(209,235,219,0.5)' : 'rgba(212,168,67,0.15)',
              color: chip.ok ? '#166534' : '#b45309',
            }}>
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', background: 'rgba(25,37,36,0.05)', borderRadius: '0.875rem', padding: '0.25rem' }}>
        {[
          { key: 'drafts',    label: `Drafts (${drafts.length})`       },
          { key: 'published', label: `Published (${published.length})` },
          { key: 'rejected',  label: `Rejected (${rejected.length})`   },
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
            {tab === 'drafts' ? 'Click Generate above to create your first post.' : `Posts you ${tab === 'published' ? 'approve' : 'reject'} will appear here.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {tabPosts.map(post => (
            <PostCard key={post._id} post={post} onOpen={setEditing} />
          ))}
        </div>
      )}

      {editing && (
        <BlogEditor
          key={`${editing._id}-${editing.generated_at}`}
          post={editing}
          onClose={() => setEditing(null)}
          onReopen={(id, minGen) => { setEditing(null); setPendingOpen({ id, minGen }); }}
        />
      )}
    </div>
  );
}
