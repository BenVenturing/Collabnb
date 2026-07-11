import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

// Bottom-sheet host signup for an already-logged-in creator.
// Mirrors the marketing waitlist wizard's host step: pre-populated with the
// current account, a "start fresh" option, and the regular host signup process
// (role flip + admin notification + welcome email). Keeps the same Clerk login.
export default function HostSignupSheet({ open, onClose }) {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAuth();
  const switchToHost = useMutation(api.profiles.switchToHost);

  const [business, setBusiness] = useState(() => profile?.business_name || '');
  const [city, setCity] = useState(() => profile?.city || '');
  const [country, setCountry] = useState(() => profile?.country || '');
  const [propertyType, setPropertyType] = useState(() => profile?.property_type || '');
  const [website, setWebsite] = useState(() => profile?.website_url || '');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  function startFresh() {
    setBusiness('');
    setCity('');
    setCountry('');
    setPropertyType('');
    setWebsite('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!profile?._id) {
      setError('Account not loaded yet — please try again.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await switchToHost({
        profileId: String(profile._id),
        business_name: business.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        property_type: propertyType.trim() || undefined,
        website_url: website.trim() || undefined,
      });
      // Optimistically mirror role locally so the nav/host route render correctly
      await updateProfile({ role: 'host', business_name: business.trim() || undefined, city: city.trim() || undefined, country: country.trim() || undefined });
      setDone(true);
    } catch (err) {
      console.warn('switchToHost failed:', err);
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  function goToDashboard() {
    onClose?.();
    navigate('/host');
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
                <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: 0, fontWeight: 500 }}>Signing up as</p>
                <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--ink)', margin: 0 }}>Host</h4>
              </div>
            </div>

            {/* Account card */}
            <div style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(208,213,206,0.7)', borderRadius: '1rem', padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0 0 0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your account</p>
              <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0, fontSize: '0.9375rem' }}>{profile?.full_name}</p>
              <p style={{ color: 'var(--slate)', fontSize: '0.8125rem', margin: '0.125rem 0 0' }}>{profile?.email}</p>
            </div>

            <p style={{ color: 'var(--slate)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              You'll join as a host using the same account — create listings and connect with creators. We've pre-filled your details; adjust or start fresh below.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="host-business">Property or business name</label>
                <input
                  id="host-business"
                  className="form-input"
                  type="text"
                  value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                  placeholder="Moss & Pine Cabin"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="host-city">City</label>
                <input
                  id="host-city"
                  className="form-input"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Asheville"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="host-country">Home country <span style={{ color: 'var(--sage)', fontWeight: 400 }}>(optional)</span></label>
                <input
                  id="host-country"
                  className="form-input"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="United States"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="host-website">Website <span style={{ color: 'var(--sage)', fontWeight: 400 }}>(optional)</span></label>
                <input
                  id="host-website"
                  className="form-input"
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourproperty.com"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {error && <p style={{ color: '#dc2626', fontSize: '0.8125rem', textAlign: 'center', margin: 0 }}>{error}</p>}

              <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', cursor: submitting ? 'default' : 'pointer' }}>
                {submitting ? 'Signing up…' : 'Sign up as Host →'}
              </button>

              <button
                type="button"
                onClick={startFresh}
                style={{ background: 'none', border: 'none', color: 'var(--sage)', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.25rem 0', textDecoration: 'underline', textUnderlineOffset: '2px', fontFamily: 'var(--font-body)' }}
              >
                Start fresh →
              </button>
            </form>
          </>
        ) : (
          /* ── Success / celebration ── */
          <div style={{ textAlign: 'center', padding: '0.5rem 0 0.5rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" style={{ width: 28, height: 28 }}><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--ink)', margin: '0 0 0.5rem' }}>
              Welcome aboard, host!
            </h4>
            <p style={{ color: 'var(--slate)', fontSize: '0.875rem', lineHeight: 1.55, margin: '0 0 1.5rem' }}>
              Your account is now set up as a host. Sample listings are waiting on your dashboard to show you how it works — you can edit, duplicate, or remove them anytime.
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--sage)', margin: '0 0 1.25rem' }}>
              We'll email you at <strong style={{ color: 'var(--ink)' }}>{profile?.email}</strong> once your account is fully verified.
            </p>
            <button onClick={goToDashboard} className="btn-primary" style={{ width: '100%' }}>
              Go to host dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
