import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

export const TERMS_VERSION = '2026-11-15';

export default function TermsGate() {
  const { profile } = useAuth();
  const acceptTerms = useMutation(api.profiles.acceptTerms);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!profile?._id || profile.terms_accepted_at) return null;

  async function accept() {
    setBusy(true);
    try { await acceptTerms({ profileId: String(profile._id), version: TERMS_VERSION }); } catch {}
    setBusy(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 20000, background: 'rgba(25,37,36,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.75rem', width: '100%', maxWidth: 440, fontFamily: 'var(--font-body)' }}>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#192524' }}>Before you continue</h2>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#3C5759', lineHeight: 1.6 }}>
          Collabnb has zero tolerance for objectionable content or abusive users. This includes nudity or sexual content, hate speech, harassment, threats, scams and illegal content. You can report or block anyone, and we review reports within 24 hours and remove offending content and accounts.
        </p>
        <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.82rem', color: '#192524', margin: '0 0 1rem', lineHeight: 1.5 }}>
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} style={{ marginTop: 3 }} />
          <span>I agree to the <a href="/terms.html" target="_blank" rel="noreferrer" style={{ color: '#192524', fontWeight: 600 }}>Terms of Service</a> and <a href="/privacy-policy.html" target="_blank" rel="noreferrer" style={{ color: '#192524', fontWeight: 600 }}>Privacy Policy</a>, including the rules against objectionable content.</span>
        </label>
        <button onClick={accept} disabled={!checked || busy} style={{ width: '100%', padding: '0.7rem', borderRadius: '999px', border: 'none', background: checked ? '#192524' : '#C9CFCB', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: checked ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
          {busy ? 'Saving…' : 'Agree and continue'}
        </button>
      </div>
    </div>
  );
}
