import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useEditor, EditorContent } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import ImageSwapField from '../../components/admin/ImageSwapField';
import BlogArticle from '../../components/BlogArticle';
import Confetti from '../../components/Confetti';

// ─── Shared meta store ─────────────────────────────────────────────────────────
// TipTap node views are plain DOM (not React), so image/pull-quote data flows
// to them through this tiny store instead of props.
const editorMeta = { images: {}, pullQuote: '', listeners: new Set() };
function publishMeta(patch) {
  Object.assign(editorMeta, patch);
  editorMeta.listeners.forEach(fn => fn());
}

// ─── Marker ↔ editor HTML conversion ──────────────────────────────────────────
function markersToEditorHtml(content) {
  return (content || '')
    .replace(/<p>\s*(%%(?:INLINE_IMAGE_[123]|PULL_QUOTE)%%)\s*<\/p>/gi, '$1')
    .replace(/%%INLINE_IMAGE_([123])%%/g, '<blog-image data-slot="$1"></blog-image>')
    .replace(/%%PULL_QUOTE%%/g, '<blog-pullquote></blog-pullquote>');
}
function editorHtmlToMarkers(html) {
  return (html || '')
    .replace(/<blog-image[^>]*data-slot="([123])"[^>]*>\s*(?:<\/blog-image>)?/g, '\n%%INLINE_IMAGE_$1%%\n')
    .replace(/<blog-pullquote[^>]*>\s*(?:<\/blog-pullquote>)?/g, '\n%%PULL_QUOTE%%\n')
    .trim();
}

// ─── Custom nodes: draggable image + pull-quote blocks ────────────────────────
const BlogImageNode = Node.create({
  name: 'blogImage',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      slot: {
        default: 1,
        parseHTML: el => Number(el.getAttribute('data-slot')) || 1,
        renderHTML: attrs => ({ 'data-slot': attrs.slot }),
      },
    };
  },
  parseHTML() { return [{ tag: 'blog-image' }]; },
  renderHTML({ HTMLAttributes }) { return ['blog-image', mergeAttributes(HTMLAttributes)]; },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('figure');
      dom.className = 'blog-editor-block blog-editor-image';
      dom.setAttribute('data-drag-handle', '');
      const img = document.createElement('img');
      img.draggable = false;
      const empty = document.createElement('div');
      empty.className = 'blog-editor-image-empty';
      const cap = document.createElement('figcaption');
      const render = () => {
        const im = editorMeta.images[`inline${node.attrs.slot}`];
        dom.innerHTML = '';
        if (im?.url) {
          img.src = im.url;
          img.alt = im.alt || '';
          cap.textContent = `Image ${node.attrs.slot}${im.credit ? ` · ${im.credit} / Unsplash` : ''} — drag to move`;
          dom.append(img, cap);
        } else {
          empty.textContent = `Image ${node.attrs.slot} — no photo yet (add one in the Photos panel) · drag to move`;
          dom.append(empty);
        }
      };
      editorMeta.listeners.add(render);
      render();
      return { dom, destroy() { editorMeta.listeners.delete(render); } };
    };
  },
});

const BlogPullQuoteNode = Node.create({
  name: 'blogPullQuote',
  group: 'block',
  atom: true,
  draggable: true,
  parseHTML() { return [{ tag: 'blog-pullquote' }]; },
  renderHTML({ HTMLAttributes }) { return ['blog-pullquote', mergeAttributes(HTMLAttributes)]; },
  addNodeView() {
    return () => {
      const dom = document.createElement('div');
      dom.className = 'blog-editor-block blog-editor-pullquote';
      dom.setAttribute('data-drag-handle', '');
      const render = () => {
        dom.textContent = editorMeta.pullQuote
          ? `“${editorMeta.pullQuote}”`
          : 'Pull quote — set the text in the sidebar · drag to move';
      };
      editorMeta.listeners.add(render);
      render();
      return { dom, destroy() { editorMeta.listeners.delete(render); } };
    };
  },
});

// ─── Small UI bits ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  draft:     { label: 'Draft',     bg: 'rgba(212,168,67,0.15)', color: '#b45309' },
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

function SidebarSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid rgba(25,37,36,0.08)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.1rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {title}
        <span style={{ color: 'var(--sage)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 150ms', fontSize: '0.7rem' }}>›</span>
      </button>
      {open && <div style={{ padding: '0 1.1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>{children}</div>}
    </div>
  );
}

const fieldLabel = { fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem' };
const fieldInput = {
  width: '100%', padding: '0.55rem 0.7rem', boxSizing: 'border-box',
  border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: '0.5rem',
  fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink)',
  background: '#fafafa', outline: 'none',
};

function ToolbarBtn({ active, onClick, title, children }) {
  return (
    <button
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      title={title}
      style={{
        minWidth: 30, height: 30, padding: '0 0.45rem', borderRadius: 7, border: 'none', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.8rem', fontWeight: 600,
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? '#fff' : 'var(--slate)',
        transition: 'background 120ms',
      }}
    >
      {children}
    </button>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────
export default function BlogEditor({ post, onClose, onReopen }) {
  const updatePost     = useMutation(api.blog.updatePost);
  const updateStatus   = useMutation(api.blog.updateStatus);
  const deletePost     = useMutation(api.blog.deletePost);
  const regeneratePost = useAction(api.blog.regeneratePost);

  const [title,     setTitle]     = useState(post.title === 'Untitled post' ? '' : post.title);
  const [excerpt,   setExcerpt]   = useState(post.excerpt || '');
  const [category,  setCategory]  = useState(post.category || 'industry');
  const [tags,      setTags]      = useState((post.tags || []).join(', '));
  const [seoDesc,   setSeoDesc]   = useState(post.seo_description || '');
  const [pullQuote, setPullQuote] = useState(post.pull_quote || '');
  const [igEmbed,   setIgEmbed]   = useState(post.instagram_embed_url || '');
  const [images,    setImages]    = useState({
    hero:    { url: post.hero_image_url || '',     alt: post.hero_image_alt || '',     credit: post.hero_image_credit || '',     creditUrl: post.hero_image_credit_url || '' },
    inline1: { url: post.inline_image_1_url || '', alt: post.inline_image_1_alt || '', credit: post.inline_image_1_credit || '', creditUrl: '' },
    inline2: { url: post.inline_image_2_url || '', alt: post.inline_image_2_alt || '', credit: post.inline_image_2_credit || '', creditUrl: '' },
    inline3: { url: post.inline_image_3_url || '', alt: post.inline_image_3_alt || '', credit: post.inline_image_3_credit || '', creditUrl: '' },
  });

  const [preview,  setPreview]  = useState(false);
  const [saveState, setSaveState] = useState('clean'); // 'clean' | 'dirty' | 'saving' | 'saved'
  const [confirm,  setConfirm]  = useState(null); // 'publish' | 'reject' | 'delete' | 'unpublish'
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenDirection, setRegenDirection] = useState('');
  const [regenBusy, setRegenBusy] = useState(false);
  const [regenErr, setRegenErr] = useState('');
  const [justPublished, setJustPublished] = useState(false);

  const contentRef  = useRef(post.content || '');
  const saveTimer   = useRef(null);
  const stateRef    = useRef(null);
  const scrollRef   = useRef(null);
  const isDraft     = post.status !== 'published';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } }),
      Placeholder.configure({ placeholder: 'Tell the story…' }),
      BlogImageNode,
      BlogPullQuoteNode,
    ],
    content: markersToEditorHtml(post.content),
    onUpdate: ({ editor }) => {
      contentRef.current = editorHtmlToMarkers(editor.getHTML());
      markDirty();
    },
  });

  // Keep node views in sync with sidebar state.
  useEffect(() => { publishMeta({ images, pullQuote }); }, [images, pullQuote]);

  // Latest field values for the debounced save (avoids stale closures).
  stateRef.current = { title, excerpt, category, tags, seoDesc, pullQuote, igEmbed, images };

  const doSave = useCallback(async () => {
    const s = stateRef.current;
    setSaveState('saving');
    try {
      await updatePost({
        id: post._id,
        title: s.title || 'Untitled post',
        excerpt: s.excerpt,
        content: contentRef.current,
        tags: s.tags.split(',').map(t => t.trim()).filter(Boolean),
        category: s.category,
        pull_quote: s.pullQuote,
        seo_description: s.seoDesc,
        instagram_embed_url: s.igEmbed || undefined,
        hero_image_url:        s.images.hero.url,
        hero_image_alt:        s.images.hero.alt,
        hero_image_credit:     s.images.hero.credit,
        hero_image_credit_url: s.images.hero.creditUrl || '',
        inline_image_1_url:    s.images.inline1.url,
        inline_image_1_alt:    s.images.inline1.alt,
        inline_image_1_credit: s.images.inline1.credit,
        inline_image_2_url:    s.images.inline2.url,
        inline_image_2_alt:    s.images.inline2.alt,
        inline_image_2_credit: s.images.inline2.credit,
        inline_image_3_url:    s.images.inline3.url,
        inline_image_3_alt:    s.images.inline3.alt,
        inline_image_3_credit: s.images.inline3.credit,
      });
      setSaveState('saved');
      setTimeout(() => setSaveState(prev => prev === 'saved' ? 'clean' : prev), 2000);
    } catch {
      setSaveState('dirty');
    }
  }, [post._id, updatePost]);

  // Autosave drafts; published posts save only via the explicit button.
  const markDirty = useCallback(() => {
    setSaveState('dirty');
    if (!isDraft) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 2000);
  }, [isDraft, doSave]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    const fn = (e) => { if (saveState === 'dirty' || saveState === 'saving') { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, [saveState]);

  const handleClose = async () => {
    clearTimeout(saveTimer.current);
    if (saveState === 'dirty' && isDraft) await doSave();
    if (saveState === 'dirty' && !isDraft && !window.confirm('Discard unsaved changes to this published post?')) return;
    onClose();
  };

  const field = (key, next) => { markDirty(); return next; };
  const setImage = (slot, v) => { setImages(prev => ({ ...prev, [slot]: v })); markDirty(); };

  // Drag one photo cell onto another to swap the two photos.
  const dragSlot = useRef(null);
  const dragProps = (slot) => ({
    draggable: true,
    onDragStart: (e) => { dragSlot.current = slot; e.dataTransfer.effectAllowed = 'move'; },
    onDragOver:  (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; },
    onDrop: (e) => {
      e.preventDefault();
      const from = dragSlot.current;
      if (!from || from === slot) return;
      setImages(prev => ({ ...prev, [from]: prev[slot], [slot]: prev[from] }));
      markDirty();
      dragSlot.current = null;
    },
  });

  async function handleStatus(status) {
    if (saveState !== 'clean') await doSave();
    await updateStatus({ id: post._id, status });
    onClose();
  }

  // Opened synchronously (before the awaits below) so popup blockers don't
  // swallow it — it's still a direct result of the confirm-button click.
  async function handlePublishConfirm(liveTab) {
    if (saveState !== 'clean') await doSave();
    await updateStatus({ id: post._id, status: 'published' });
    if (liveTab) liveTab.location.href = `/blog/${post.slug}`;
    setJustPublished(true);
    setTimeout(() => { setJustPublished(false); onClose(); }, 3200);
  }

  async function handleDelete() {
    await deletePost({ id: post._id });
    onClose();
  }

  async function handleRegenerate() {
    setRegenBusy(true);
    setRegenErr('');
    clearTimeout(saveTimer.current);
    const started = Date.now();
    try {
      await regeneratePost({ id: post._id, direction: regenDirection.trim() || undefined });
      // Reopen with the fresh version (photos are kept; text is rewritten).
      onReopen?.(post._id, started);
    } catch (e) {
      setRegenErr(e.message || 'Regeneration failed — try again.');
      setRegenBusy(false);
    }
  }

  const previewPost = {
    ...post,
    title: title || 'Untitled post',
    excerpt,
    category,
    content: contentRef.current,
    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
  };

  const saveLabel = { clean: 'Saved', dirty: isDraft ? 'Saving soon…' : 'Unsaved changes', saving: 'Saving…', saved: 'Saved ✓' }[saveState];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#F7F5F0', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1.25rem', background: '#fff', borderBottom: '1px solid rgba(25,37,36,0.08)', flexShrink: 0 }}>
        <button onClick={handleClose} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.14)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate)' }}>
          ← Posts
        </button>
        <Badge status={post.status} />
        <span aria-live="polite" style={{ fontSize: '0.72rem', color: saveState === 'dirty' && !isDraft ? '#b45309' : 'var(--sage)', fontWeight: 500 }}>{saveLabel}</span>

        <div style={{ flex: 1 }} />

        {isDraft && (
          <button onClick={() => setRegenOpen(true)} disabled={regenBusy} title="Rewrite this post — keeps your photos, you steer the angle" style={{ padding: '0.45rem 0.9rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.14)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate)', opacity: regenBusy ? 0.5 : 1 }}>
            {regenBusy ? 'Regenerating…' : '⟳ Regenerate'}
          </button>
        )}
        <button onClick={() => setConfirm('delete')} title="Delete this post entirely" style={{ padding: '0.45rem 0.9rem', borderRadius: 9999, border: '1px solid rgba(200,104,104,0.35)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#c0392b' }}>
          Delete
        </button>
        <button onClick={() => setPreview(p => !p)} style={{ padding: '0.45rem 0.9rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.14)', background: preview ? 'var(--ink)' : 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: preview ? '#fff' : 'var(--slate)' }}>
          {preview ? 'Edit' : 'Preview'}
        </button>
        {!isDraft && (
          <button onClick={doSave} disabled={saveState === 'clean' || saveState === 'saving'} style={{ padding: '0.45rem 1rem', borderRadius: 9999, border: 'none', background: saveState === 'dirty' ? '#192524' : 'rgba(25,37,36,0.25)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
            Save & update live post
          </button>
        )}
        {post.status === 'published' && (
          <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate)', textDecoration: 'none', padding: '0.45rem 0.9rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.14)' }}>
            View live ↗
          </a>
        )}
        {isDraft
          ? <button onClick={() => { scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); setConfirm('publish'); }} style={{ padding: '0.45rem 1.1rem', borderRadius: 9999, border: 'none', background: '#192524', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>Publish</button>
          : <button onClick={() => setConfirm('unpublish')} style={{ padding: '0.45rem 0.9rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.2)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate)' }}>Unpublish</button>
        }
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Center column — document or preview */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          {preview ? (
            <div data-blog-theme="light" style={{ background: 'var(--blog-bg)', minHeight: '100%' }}>
              <div style={{ maxWidth: 680, margin: '0 auto', padding: '3rem clamp(1.25rem, 4vw, 2rem) 5rem' }}>
                <BlogArticle post={previewPost} images={images} pullQuote={pullQuote} />
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem clamp(1.25rem, 4vw, 2.5rem) 6rem' }}>

              {/* Title + deck */}
              <input
                value={title}
                onChange={e => setTitle(field('title', e.target.value))}
                placeholder="Post title"
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-blog-display)', fontWeight: 500, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 1.15, letterSpacing: '-0.02em', color: 'var(--ink)', padding: 0, marginBottom: '0.6rem', boxSizing: 'border-box' }}
              />
              <textarea
                value={excerpt}
                onChange={e => setExcerpt(field('excerpt', e.target.value))}
                placeholder="Deck — one conversational sentence shown under the title"
                rows={2}
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontFamily: 'var(--font-blog-body, var(--font-body))', fontSize: '1.05rem', lineHeight: 1.55, color: 'var(--slate)', padding: 0, marginBottom: '1.5rem', boxSizing: 'border-box' }}
              />

              {/* Toolbar */}
              {editor && (
                <div style={{ position: 'sticky', top: '0.5rem', zIndex: 10, display: 'inline-flex', gap: '0.15rem', padding: '0.3rem', borderRadius: 10, background: '#fff', border: '1px solid rgba(25,37,36,0.1)', boxShadow: '0 2px 12px rgba(25,37,36,0.07)', marginBottom: '1.25rem' }}>
                  <ToolbarBtn title="Section heading" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarBtn>
                  <ToolbarBtn title="Sub-heading" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarBtn>
                  <ToolbarBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></ToolbarBtn>
                  <ToolbarBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolbarBtn>
                  <ToolbarBtn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>••</ToolbarBtn>
                  <ToolbarBtn title="Link" active={editor.isActive('link')} onClick={() => {
                    if (editor.isActive('link')) { editor.chain().focus().unsetLink().run(); return; }
                    const url = window.prompt('Link URL');
                    if (url) editor.chain().focus().setLink({ href: url }).run();
                  }}>⌁</ToolbarBtn>
                  <span style={{ width: 1, background: 'rgba(25,37,36,0.1)', margin: '0.2rem 0.25rem' }} />
                  <ToolbarBtn title="Insert pull quote block" active={false} onClick={() => editor.chain().focus().insertContent('<blog-pullquote></blog-pullquote>').run()}>❝</ToolbarBtn>
                </div>
              )}

              {/* Document */}
              <div className="blog-content blog-editor-surface">
                <EditorContent editor={editor} />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {!preview && (
          <div style={{ width: 330, flexShrink: 0, background: '#fff', borderLeft: '1px solid rgba(25,37,36,0.08)', overflowY: 'auto' }}>

            <SidebarSection title="Photos">
              <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '-0.25rem 0 0', lineHeight: 1.5 }}>
                Drag one thumbnail onto another to swap photos. Drag the image blocks in the document to move them.
              </p>
              <ImageSwapField label="Hero"    value={images.hero}    onChange={v => setImage('hero', v)}    dragProps={dragProps('hero')} />
              <ImageSwapField label="Image 1" value={images.inline1} onChange={v => setImage('inline1', v)} dragProps={dragProps('inline1')} />
              <ImageSwapField label="Image 2" value={images.inline2} onChange={v => setImage('inline2', v)} dragProps={dragProps('inline2')} />
              <ImageSwapField label="Image 3" value={images.inline3} onChange={v => setImage('inline3', v)} dragProps={dragProps('inline3')} />
            </SidebarSection>

            <SidebarSection title="Details">
              <div>
                <label style={fieldLabel}>Category</label>
                <select value={category} onChange={e => setCategory(field('category', e.target.value))} style={fieldInput}>
                  <option value="creators">Creators</option>
                  <option value="hosts">Hosts</option>
                  <option value="industry">Industry</option>
                  <option value="stats">Stats</option>
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Pull quote</label>
                <textarea value={pullQuote} onChange={e => setPullQuote(field('pullQuote', e.target.value))} rows={3} style={{ ...fieldInput, resize: 'vertical' }} placeholder="The single most resonant sentence" />
              </div>
              <div>
                <label style={fieldLabel}>Tags (comma-separated)</label>
                <input value={tags} onChange={e => setTags(field('tags', e.target.value))} style={fieldInput} placeholder="usage rights, shoulder season" />
              </div>
              <div>
                <label style={fieldLabel}>SEO description ({seoDesc.length}/155)</label>
                <textarea value={seoDesc} onChange={e => setSeoDesc(field('seoDesc', e.target.value))} maxLength={155} rows={3} style={{ ...fieldInput, resize: 'vertical' }} placeholder="Search result snippet" />
              </div>
              <div>
                <label style={fieldLabel}>Instagram embed URL</label>
                <input value={igEmbed} onChange={e => setIgEmbed(field('igEmbed', e.target.value))} style={fieldInput} placeholder="https://www.instagram.com/p/…" />
              </div>
              <div>
                <label style={fieldLabel}>Slug {post.status === 'published' && '(locked while published)'}</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: 0, wordBreak: 'break-all', fontFamily: 'monospace' }}>/blog/{post.slug}</p>
              </div>
            </SidebarSection>

            {(post.review_notes || post.review_score) && (
              <SidebarSection title={`Review${post.review_score ? ` · ${post.review_score}/10` : ''}`} defaultOpen={isDraft}>
                <p style={{ fontSize: '0.75rem', color: 'var(--slate)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {post.review_notes || 'No notes.'}
                </p>
              </SidebarSection>
            )}

            {(post.sources || []).length > 0 && (
              <SidebarSection title={`Sources (${post.sources.length})`} defaultOpen={false}>
                {post.sources.map((s, i) => (
                  <a key={i} href={s} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: '#7B68C8', wordBreak: 'break-all', textDecoration: 'none' }}>{s}</a>
                ))}
              </SidebarSection>
            )}

            <SidebarSection title="Danger zone" defaultOpen={false}>
              {isDraft && post.status !== 'rejected' && (
                <button onClick={() => setConfirm('reject')} style={{ padding: '0.5rem 1rem', borderRadius: 9999, border: '1.5px solid rgba(200,104,104,0.35)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#9b2d2d', alignSelf: 'flex-start' }}>
                  Reject draft
                </button>
              )}
              <button onClick={() => setConfirm('delete')} style={{ padding: '0.5rem 1rem', borderRadius: 9999, border: '1.5px solid rgba(200,104,104,0.25)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#c0392b', alignSelf: 'flex-start' }}>
                Delete post
              </button>
            </SidebarSection>
          </div>
        )}
      </div>

      {/* Regenerate dialog */}
      {regenOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(25,37,36,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget && !regenBusy) setRegenOpen(false); }}>
          <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', maxWidth: 460, width: '92%', boxShadow: '0 16px 40px rgba(25,37,36,0.2)' }}>
            {regenBusy ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(25,37,36,0.15)', borderTopColor: '#3C5759', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginBottom: '0.75rem' }} />
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', margin: '0 0 0.35rem' }}>Rewriting this post…</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--sage)', margin: 0 }}>Researching the journals, writing, and running the editorial review — about a minute. Your photos stay.</p>
              </div>
            ) : (
              <>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', margin: '0 0 0.35rem' }}>Regenerate this post</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--sage)', margin: '0 0 0.9rem', lineHeight: 1.5 }}>
                  Rewrites the article with fresh research while keeping your current photos and the Journal's flow. Optionally tell it what to change — a new angle, a shifted topic, a different emphasis.
                </p>
                <textarea
                  value={regenDirection}
                  onChange={e => setRegenDirection(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder={'e.g. "same idea, but focus on small Airbnb hosts instead of hotels" or "make it about pricing the collab"'}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: '0.6rem', fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink)', background: '#fafafa', outline: 'none', resize: 'vertical', marginBottom: '0.9rem' }}
                />
                {regenErr && <p style={{ fontSize: '0.75rem', color: '#9b2d2d', margin: '0 0 0.75rem' }}>{regenErr}</p>}
                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => setRegenOpen(false)} style={{ padding: '0.55rem 1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.15)', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate)', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleRegenerate} style={{ padding: '0.55rem 1.2rem', borderRadius: 9999, border: 'none', background: '#192524', fontSize: '0.8rem', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                    {regenDirection.trim() ? 'Regenerate with direction' : 'Regenerate'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirm dialog + publish success — portaled straight to <body> so they're
          always fixed to the real viewport, never to some ancestor's scroll box. */}
      {confirm && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(25,37,36,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', maxWidth: 380, width: '90%', textAlign: 'center', boxShadow: '0 16px 40px rgba(25,37,36,0.2)' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
              {{ publish: 'Publish this post?', unpublish: 'Unpublish this post?', reject: 'Reject this draft?', delete: 'Delete this post?' }[confirm]}
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginBottom: '1.25rem' }}>
              {{ publish: 'It will appear on the public Collabnb Journal immediately.', unpublish: 'It will disappear from the public Journal and return to drafts.', reject: 'It moves to the Rejected tab — you can restore it later.', delete: 'This cannot be undone.' }[confirm]}
            </p>
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center' }}>
              <button onClick={() => setConfirm(null)} style={{ padding: '0.6rem 1.1rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.15)', background: 'transparent', fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={() => {
                  const c = confirm; setConfirm(null);
                  if (c === 'publish') {
                    const liveTab = window.open('', '_blank', 'noopener,noreferrer');
                    handlePublishConfirm(liveTab);
                  }
                  else if (c === 'unpublish') handleStatus('draft');
                  else if (c === 'reject') handleStatus('rejected');
                  else handleDelete();
                }}
                style={{ padding: '0.6rem 1.25rem', borderRadius: 9999, border: 'none', background: confirm === 'publish' ? '#192524' : '#c0392b', fontSize: '0.82rem', fontWeight: 700, color: '#fff', cursor: 'pointer' }}
              >
                {{ publish: 'Publish', unpublish: 'Unpublish', reject: 'Reject', delete: 'Delete' }[confirm]}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {justPublished && createPortal(
        <>
          <Confetti show={justPublished} />
          <div style={{ position: 'fixed', top: '18%', left: '50%', transform: 'translateX(-50%)', zIndex: 998, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 1.75rem', borderRadius: 9999, background: '#192524', color: '#fff', fontWeight: 700, fontSize: '0.92rem', boxShadow: '0 16px 40px rgba(25,37,36,0.28)' }}>
            ✓ Published — opened on the Journal in a new tab
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
