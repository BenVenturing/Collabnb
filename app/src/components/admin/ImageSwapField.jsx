import { useState, useRef } from 'react';
import { useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// Swappable image field: Unsplash search · upload · paste URL.
// `value`/`onChange` carry { url, alt, credit, creditUrl }.
export default function ImageSwapField({ label, value, onChange, dragProps }) {
  const searchUnsplash    = useAction(api.blog.searchUnsplash);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const finalizeUpload    = useMutation(api.uploads.finalizeUpload);

  const [open,    setOpen]    = useState(false);
  const [mode,    setMode]    = useState('unsplash'); // 'unsplash' | 'upload' | 'url'
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState('');
  const [urlInput, setUrlInput] = useState('');
  const fileRef = useRef(null);

  async function runSearch() {
    setBusy(true); setErr('');
    try { setResults(await searchUnsplash({ query })); }
    catch (e) { setErr(e.message || 'Search failed'); }
    finally { setBusy(false); }
  }

  async function handleUpload(file) {
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      const { storageId } = await res.json();
      const url = await finalizeUpload({ storageId });
      if (!url) throw new Error('Upload failed');
      onChange({ url, alt: file.name.replace(/\.[^.]+$/, ''), credit: '', creditUrl: '' });
      setOpen(false);
    } catch (e) { setErr(e.message || 'Upload failed'); }
    finally { setBusy(false); }
  }

  const labelStyle = { fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' };
  const modeBtn = (m, txt) => (
    <button key={m} onClick={() => setMode(m)} style={{ padding: '0.35rem 0.7rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: mode === m ? 700 : 500, background: mode === m ? 'var(--ink)' : 'rgba(25,37,36,0.06)', color: mode === m ? '#fff' : 'var(--slate)' }}>{txt}</button>
  );

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <div
          {...(dragProps || {})}
          title={dragProps ? 'Drag onto another photo to swap' : undefined}
          style={{ width: 96, height: 64, borderRadius: '0.5rem', overflow: 'hidden', background: 'rgba(25,37,36,0.06)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: dragProps ? 'grab' : 'default' }}
        >
          {value.url
            ? <img src={value.url} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
            : <span style={{ fontSize: '0.65rem', color: 'var(--sage)' }}>No image</span>}
        </div>
        <button onClick={() => { setOpen(o => !o); setMode('unsplash'); }} style={{ padding: '0.45rem 0.9rem', borderRadius: 8, border: '1.5px solid rgba(25,37,36,0.2)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink)' }}>
          {open ? 'Close' : (value.url ? 'Replace' : 'Add image')}
        </button>
        {value.url && (
          <button onClick={() => onChange({ url: '', alt: '', credit: '', creditUrl: '' })} style={{ padding: '0.45rem 0.7rem', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: '#9b2d2d' }}>Remove</button>
        )}
      </div>

      {open && (
        <div style={{ marginTop: '0.6rem', padding: '0.75rem', border: '1px solid rgba(25,37,36,0.1)', borderRadius: '0.6rem', background: '#fafafa' }}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
            {modeBtn('unsplash', 'Search Unsplash')}
            {modeBtn('upload', 'Upload')}
            {modeBtn('url', 'Paste URL')}
          </div>

          {mode === 'unsplash' && (
            <div>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} placeholder="e.g. boutique hotel pool" style={{ flex: 1, padding: '0.5rem 0.7rem', border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: 8, fontSize: '0.8rem', outline: 'none', minWidth: 0 }} />
                <button onClick={runSearch} disabled={busy} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: 'var(--ink)', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>{busy ? '…' : 'Search'}</button>
              </div>
              {results.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', maxHeight: 220, overflowY: 'auto' }}>
                  {results.map((r, i) => (
                    <button key={i} onClick={() => { onChange({ url: r.url, alt: r.alt, credit: r.credit, creditUrl: r.creditUrl }); setOpen(false); }} style={{ padding: 0, border: 'none', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', aspectRatio: '4/3', background: '#eee' }} title={`Photo: ${r.credit}`}>
                      <img src={r.thumb} alt={r.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === 'upload' && (
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={e => handleUpload(e.target.files?.[0])} style={{ fontSize: '0.8rem' }} />
              {busy && <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: '0.5rem 0 0' }}>Uploading…</p>}
            </div>
          )}

          {mode === 'url' && (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://images.unsplash.com/..." style={{ flex: 1, padding: '0.5rem 0.7rem', border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: 8, fontSize: '0.8rem', outline: 'none', minWidth: 0 }} />
              <button onClick={() => { if (urlInput.trim()) { onChange({ url: urlInput.trim(), alt: '', credit: '', creditUrl: '' }); setUrlInput(''); setOpen(false); } }} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: 'var(--ink)', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Use</button>
            </div>
          )}

          {err && <p style={{ fontSize: '0.75rem', color: '#9b2d2d', margin: '0.5rem 0 0' }}>{err}</p>}
        </div>
      )}
    </div>
  );
}
