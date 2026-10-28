import { useState } from 'react';
import { useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

// Bottom-sheet role-switch signup (creator → host or host → creator).
// Mirrors a brand-new signup for the target role: pre-filled with the existing
// account, optional different contact email, and the same verification review —
// the user keeps their current role until an admin approves the request.
export default function RoleSwitchSheet({ open, targetRole = 'host', onClose }) {
  const { t } = useTranslation('roleSwitchSheet');
  const { profile, updateProfile } = useAuth();
  const requestRoleSwitch = useMutation(api.profiles.requestRoleSwitch);

  const [business, setBusiness] = useState(() => profile?.business_name || '');
  const [city, setCity] = useState(() => profile?.city || '');
  const [country, setCountry] = useState(() => profile?.country || '');
  const [propertyType, setPropertyType] = useState(() => profile?.property_type || '');
  const [website, setWebsite] = useState(() => profile?.website_url || '');
  const [instagram, setInstagram] = useState(() => profile?.instagram_handle || '');
  const [tiktok, setTiktok] = useState(() => profile?.tiktok_handle || '');
  const [portfolio, setPortfolio] = useState(() => profile?.portfolio || '');
  const [useOtherEmail, setUseOtherEmail] = useState(false);
  const [contactEmail, setContactEmail] = useState(() => profile?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const isHostSignup = targetRole === 'host';
  const roleLabel = isHostSignup ? t('roleLabels.host') : t('roleLabels.creator');

  function startFresh() {
    setBusiness(''); setCity(''); setCountry(''); setPropertyType(''); setWebsite('');
    setInstagram(''); setTiktok(''); setPortfolio('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!profile?._id) {
      setError(t('errors.accountNotLoaded'));
      return;
    }
    if (!isHostSignup && !instagram.trim()) {
      setError(t('errors.instagramRequired'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await requestRoleSwitch({
        profileId: String(profile._id),
        targetRole,
        contact_email: useOtherEmail ? contactEmail.trim() || undefined : undefined,
        ...(isHostSignup ? {
          business_name: business.trim() || undefined,
          city: city.trim() || undefined,
          country: country.trim() || undefined,
          property_type: propertyType.trim() || undefined,
          website_url: website.trim() || undefined,
        } : {
          instagram_handle: instagram.trim().replace(/^@/, '') || undefined,
          tiktok_handle: tiktok.trim().replace(/^@/, '') || undefined,
          portfolio: portfolio.trim() || undefined,
        }),
      });
      // Mirror the pending flag locally so the nav reflects it immediately
      await updateProfile({ pending_role: targetRole });
      setDone(true);
    } catch (err) {
      console.warn('requestRoleSwitch failed:', err);
      setError(t('errors.generic'));
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', background: 'rgba(25,37,36,0.4)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
    >
      <div
        className="glass"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '460px', borderRadius: '1.5rem', padding: '1.75rem', maxHeight: '90dvh', overflowY: 'auto' }}
      >
        {!done ? (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
              {profile?.avatar_url && (
                <img src={profile.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.8)' }} />
              )}
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: 0, fontWeight: 500 }}>{t('signingUpAs')}</p>
                <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--ink)', margin: 0 }}>{roleLabel}</h4>
              </div>
            </div>

            {/* Account card */}
            <div style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(208,213,206,0.7)', borderRadius: '1rem', padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0 0 0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('yourAccount')}</p>
              <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0, fontSize: '0.9375rem' }}>{profile?.full_name}</p>
              {!useOtherEmail ? (
                <p style={{ color: 'var(--slate)', fontSize: '0.8125rem', margin: '0.125rem 0 0' }}>
                  {profile?.email}
                  {' · '}
                  <button
                    type="button"
                    onClick={() => setUseOtherEmail(true)}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--sage)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', fontFamily: 'var(--font-body)' }}
                  >
                    {t('useDifferentEmail')}
                  </button>
                </p>
              ) : (
                <div style={{ marginTop: '0.5rem' }}>
                  <input
                    className="form-input"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => { setUseOtherEmail(false); setContactEmail(profile?.email || ''); }}
                    style={{ background: 'none', border: 'none', padding: '0.25rem 0 0', color: 'var(--sage)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', fontFamily: 'var(--font-body)' }}
                  >
                    {t('keepMyEmail')}
                  </button>
                </div>
              )}
            </div>

            <p style={{ color: 'var(--slate)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {isHostSignup ? t('description.host') : t('description.creator')}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isHostSignup ? (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="rs-business">{t('form.businessName')}</label>
                    <input id="rs-business" className="form-input" type="text" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder={t('form.businessNamePlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="rs-city">{t('form.city')}</label>
                    <input id="rs-city" className="form-input" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('form.cityPlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="rs-country">{t('form.country')} <span style={{ color: 'var(--sage)', fontWeight: 400 }}>{t('form.optional')}</span></label>
                    <input id="rs-country" className="form-input" type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder={t('form.countryPlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="rs-website">{t('form.website')} <span style={{ color: 'var(--sage)', fontWeight: 400 }}>{t('form.optional')}</span></label>
                    <input id="rs-website" className="form-input" type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder={t('form.websitePlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="rs-instagram">{t('form.instagram')}</label>
                    <input id="rs-instagram" className="form-input" type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder={t('form.handlePlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="rs-tiktok">{t('form.tiktok')} <span style={{ color: 'var(--sage)', fontWeight: 400 }}>{t('form.optional')}</span></label>
                    <input id="rs-tiktok" className="form-input" type="text" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder={t('form.handlePlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="rs-portfolio">{t('form.portfolio')} <span style={{ color: 'var(--sage)', fontWeight: 400 }}>{t('form.optional')}</span></label>
                    <input id="rs-portfolio" className="form-input" type="text" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder={t('form.portfolioPlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                </>
              )}

              {error && <p style={{ color: '#dc2626', fontSize: '0.8125rem', textAlign: 'center', margin: 0 }}>{error}</p>}

              <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', cursor: submitting ? 'default' : 'pointer' }}>
                {submitting ? t('submitting') : t('signUpAs', { role: roleLabel })}
              </button>

              <button
                type="button"
                onClick={startFresh}
                style={{ background: 'none', border: 'none', color: 'var(--sage)', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.25rem 0', textDecoration: 'underline', textUnderlineOffset: '2px', fontFamily: 'var(--font-body)' }}
              >
                {t('startFresh')}
              </button>
            </form>
          </>
        ) : (
          /* ── Submitted — pending review ── */
          <div style={{ textAlign: 'center', padding: '0.5rem 0 0.5rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" style={{ width: 28, height: 28 }}><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--ink)', margin: '0 0 0.5rem' }}>
              {t('requestReceived')}
            </h4>
            <p style={{ color: 'var(--slate)', fontSize: '0.875rem', lineHeight: 1.55, margin: '0 0 1.5rem' }}>
              {t('reviewNotice', { role: roleLabel.toLowerCase() })}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--sage)', margin: '0 0 1.25rem' }}>
              {t('emailNoticePrefix')}<strong style={{ color: 'var(--ink)' }}>{useOtherEmail ? contactEmail : profile?.email}</strong>{t('emailNoticeSuffix')}
            </p>
            <button onClick={onClose} className="btn-primary" style={{ width: '100%' }}>
              {t('done')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
