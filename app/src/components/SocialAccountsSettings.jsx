import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

const LABEL = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube' };
const REFRESH_COOLDOWN_MS = 60 * 60 * 1000;
const ERROR_KEYS = {
  refresh_cooldown: 'errRefreshCooldown',
  refresh_daily_limit: 'errRefreshDaily',
  link_add_daily_limit: 'errRefreshDaily',
  invalid_url: 'errInvalidUrl',
  portfolio_full: 'errPortfolioFull',
  not_connected: 'errNotConnected',
};

const row = { padding: '1.1rem 0', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' };
const title = { fontSize: '0.92rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 0.2rem' };
const sub = { fontSize: '0.8rem', color: 'var(--sage)', margin: 0, lineHeight: 1.5 };
const linkBtn = { fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)', background: 'none', border: 'none', textDecoration: 'underline', textUnderlineOffset: '3px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' };

// Creator-only Settings block: link Instagram/TikTok (verified stats + live
// portfolio) and manage which posts show on the public profile. The OAuth
// buttons stay blurred "coming soon" until the backend reports enabled.
export default function SocialAccountsSettings() {
  const { t, i18n } = useTranslation('settings');
  const status = useQuery(api.creatorSocial.getStatus);
  const connections = useQuery(api.creatorSocial.getMyConnections) ?? [];
  const portfolio = useQuery(api.creatorSocial.getMyPortfolio) ?? [];
  const startConnect = useAction(api.creatorSocial.startConnect);
  const syncMine = useAction(api.creatorSocial.syncMine);
  const linkYouTube = useAction(api.creatorSocial.linkYouTube);
  const addUrl = useAction(api.creatorSocial.addPortfolioUrl);
  const disconnect = useMutation(api.creatorSocial.disconnect);
  const removeItem = useMutation(api.creatorSocial.removePortfolioItem);

  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const run = async (key, fn) => {
    setBusy(key);
    setMsg(null);
    try { await fn(); } catch (e) { setMsg(t(`social.${ERROR_KEYS[e?.data] ?? 'errGeneric'}`)); }
    setBusy(null);
  };

  const byPlatform = Object.fromEntries(connections.map((c) => [c.platform, c]));
  const live = status?.enabled;
  const atLimit = portfolio.length >= (status?.maxPortfolioItems ?? 12);

  const fmtDate = (ms) => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(ms);
  const cooldownMin = (c) => {
    const left = (c.last_synced_at ?? 0) + REFRESH_COOLDOWN_MS - Date.now();
    return left > 0 && !c.sync_error ? Math.ceil(left / 60000) : 0;
  };

  const returned = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('social') : null;

  return (
    <div>
      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '1.75rem 0 0.5rem' }}>
        {t('social.title')}
      </p>

      {returned?.endsWith('_connected') && <p style={{ ...sub, color: '#4A9B7F', marginBottom: '0.5rem' }}>{t('social.connectedOk', { platform: LABEL[returned.split('_')[0]] })}</p>}
      {returned && /_(error|denied)$/.test(returned) && <p style={{ ...sub, color: '#dc2626', marginBottom: '0.5rem' }}>{t('social.connectFailed', { platform: LABEL[returned.split('_')[0]] })}</p>}

      {['instagram', 'tiktok'].map((p) => {
        const c = byPlatform[p];
        return (
          <div key={p} style={{ ...row, position: 'relative' }}>
            <div style={{ minWidth: 0, filter: live ? 'none' : 'blur(3px)', opacity: live ? 1 : 0.55, pointerEvents: live ? 'auto' : 'none' }} aria-hidden={!live}>
              <p style={title}>{LABEL[p]}</p>
              <p style={sub}>
                {c
                  ? c.needs_reconnect
                    ? t('social.expired')
                    : t('social.connectedLine', { handle: c.handle ?? '', count: c.follower_count ?? 0 })
                  : t(p === 'instagram' ? 'social.igDesc' : 'social.ttDesc')}
              </p>
              {c && !c.needs_reconnect && (
                <p style={{ ...sub, fontSize: '0.74rem', marginTop: '0.15rem' }}>
                  {c.last_synced_at ? t('social.lastRefreshed', { date: fmtDate(c.last_synced_at) }) : t('social.neverRefreshed')}
                  {cooldownMin(c) > 0 ? ` · ${t('social.refreshIn', { minutes: cooldownMin(c) })}` : ''}
                </p>
              )}
            </div>
            {live && status[p] ? (
              <div style={{ display: 'flex', gap: '0.9rem' }}>
                {c && !c.needs_reconnect && (
                  <>
                    <button style={{ ...linkBtn, opacity: cooldownMin(c) > 0 ? 0.45 : 1 }} disabled={busy === `sync-${p}` || cooldownMin(c) > 0} onClick={() => run(`sync-${p}`, () => syncMine({ platform: p }))}>{busy === `sync-${p}` ? t('social.refreshing') : t('social.refresh')}</button>
                    <button style={{ ...linkBtn, color: '#dc2626' }} onClick={() => run(`dc-${p}`, () => disconnect({ platform: p }))}>{t('social.disconnect')}</button>
                  </>
                )}
                {(!c || c.needs_reconnect) && (
                  <button
                    className="btn-primary"
                    style={{ fontSize: '0.82rem', padding: '0.5rem 1.1rem' }}
                    disabled={busy === `go-${p}`}
                    onClick={() => run(`go-${p}`, async () => { const { url: to } = await startConnect({ platform: p }); window.location.href = to; })}
                  >
                    {c ? t('social.reconnect') : t('social.connect')}
                  </button>
                )}
              </div>
            ) : (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#A87820', background: 'rgba(212,168,67,0.16)', borderRadius: 999, padding: '0.28rem 0.65rem', whiteSpace: 'nowrap', flexShrink: 0 }}>{t('comingSoon')}</span>
            )}
          </div>
        );
      })}

      {status?.youtube && (
        <div style={row}>
          <div style={{ minWidth: 0 }}>
            <p style={title}>YouTube</p>
            <p style={sub}>
              {byPlatform.youtube
                ? t('social.ytLine', { handle: byPlatform.youtube.handle, count: byPlatform.youtube.follower_count ?? 0 })
                : t('social.ytDesc')}
            </p>
          </div>
          {byPlatform.youtube ? (
            <button style={{ ...linkBtn, color: '#dc2626' }} onClick={() => run('dc-youtube', () => disconnect({ platform: 'youtube' }))}>{t('social.unlink')}</button>
          ) : (
            <button style={linkBtn} disabled={busy === 'yt'} onClick={() => run('yt', () => linkYouTube({}))}>{t('social.link')}</button>
          )}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '1.75rem 0 0.5rem' }}>
            {t('social.portfolioTitle')}{live ? ` · ${portfolio.length}/${status?.maxPortfolioItems ?? 10}` : ''}
          </p>
          {!live && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#A87820', background: 'rgba(212,168,67,0.16)', borderRadius: 999, padding: '0.28rem 0.65rem', whiteSpace: 'nowrap', marginTop: '1.25rem' }}>{t('comingSoon')}</span>}
        </div>
        <div style={{ filter: live ? 'none' : 'blur(3px)', opacity: live ? 1 : 0.55, pointerEvents: live ? 'auto' : 'none', userSelect: live ? 'auto' : 'none' }} aria-hidden={!live} inert={live ? undefined : ''}>
      <p style={{ ...sub, marginBottom: '0.75rem' }}>
        {t('social.portfolioDesc')}
      </p>
      <form
        onSubmit={(e) => { e.preventDefault(); if (url.trim()) run('add', async () => { await addUrl({ url }); setUrl(''); }); }}
        style={{ display: 'flex', gap: '0.5rem' }}
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('social.urlPlaceholder')}
          disabled={atLimit}
          style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', padding: '0.6rem 0.8rem', borderRadius: 10, border: '1px solid var(--hairline)', fontFamily: 'var(--font-body)' }}
        />
        <button className="btn-primary" type="submit" disabled={busy === 'add' || atLimit || !url.trim()} style={{ fontSize: '0.82rem', padding: '0.5rem 1.1rem' }}>
          {busy === 'add' ? t('social.adding') : t('social.add')}
        </button>
      </form>
      {atLimit && <p style={{ ...sub, marginTop: '0.4rem' }}>{t('social.limitReached')}</p>}
      {msg && <p style={{ ...sub, color: '#dc2626', marginTop: '0.4rem' }}>{msg}</p>}

      {portfolio.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          {portfolio.map((item) => (
            <div key={item._id} style={{ ...row, padding: '0.7rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                {item.thumbnail_url
                  ? <img src={item.thumbnail_url} alt="" style={{ width: 36, height: 56, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                  : <div style={{ width: 36, height: 56, borderRadius: 6, background: 'var(--ink)', flexShrink: 0 }} />}
                <div style={{ minWidth: 0 }}>
                  <p style={{ ...title, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.caption || item.permalink}</p>
                  <p style={sub}>{LABEL[item.platform]}</p>
                </div>
              </div>
              <button style={{ ...linkBtn, color: '#dc2626' }} onClick={() => removeItem({ itemId: item._id })}>{t('social.remove')}</button>
            </div>
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
