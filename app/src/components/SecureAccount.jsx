import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useAuth } from '../contexts/AuthContext';

// Hosts who arrive from a claim/listing email are signed in with a one-time
// ticket: no password, no Google. This nudges them to secure the account.
const SEEN_KEY = 'cb_secure_needed';
const LATER_KEY = 'cb_secure_later';
export const OPEN_SECURE_EVENT = 'cb:open-secure-account';

export function useSecureAccount() {
  const { user, isLoaded } = useUser();
  const { profile } = useAuth();
  const linkAccount = !!(isLoaded && user && profile?.role === 'host' && user.passwordEnabled === false && !(user.externalAccounts || []).length);
  useEffect(() => { if (linkAccount && user) try { localStorage.setItem(`${SEEN_KEY}_${user.id}`, '1'); } catch {} }, [linkAccount, user]);
  let seen = false;
  try { seen = !!user && localStorage.getItem(`${SEEN_KEY}_${user.id}`) === '1'; } catch {}
  const emailVerified = user?.primaryEmailAddress?.verification?.status === 'verified';
  return { show: linkAccount || seen, needed: linkAccount || (seen && !emailVerified), done: !!user?.passwordEnabled && emailVerified };
}

const ink = '#192524', slate = '#3C5759', sage = '#7D8F87', green = '#2F5D4A', line = 'rgba(25,37,36,0.12)';
const input = { width: '100%', padding: '0.7rem 0.9rem', borderRadius: 12, border: `1.5px solid ${line}`, fontSize: '0.95rem', color: ink, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' };
const btn = { background: ink, color: '#fff', border: 'none', borderRadius: 999, padding: '0.7rem 1.3rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit' };
const clerkError = (e) => e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || e?.message || 'Something went wrong. Please try again.';

function SecureModal({ onClose }) {
  const { user } = useUser();
  const email = user?.primaryEmailAddress;
  const verified = email?.verification?.status === 'verified';
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);

  async function sendCode() {
    setBusy('code'); setErr('');
    try { await email.prepareVerification({ strategy: 'email_code' }); setCodeSent(true); } catch (e) { setErr(clerkError(e)); }
    setBusy('');
  }
  async function verify() {
    setBusy('verify'); setErr('');
    try { await email.attemptVerification({ code: code.trim() }); await user.reload(); } catch (e) { setErr(clerkError(e)); }
    setBusy('');
  }
  async function savePassword() {
    if (pw.length < 8) { setErr('Use at least 8 characters.'); return; }
    if (pw !== pw2) { setErr("Those passwords don't match."); return; }
    setBusy('pw'); setErr('');
    try { await user.updatePassword({ newPassword: pw, signOutOfOtherSessions: false }); await user.reload(); setSaved(true); } catch (e) { setErr(clerkError(e)); }
    setBusy('');
  }

  const hasPw = !!user?.passwordEnabled || saved;
  const step = (n, doneFlag, title) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, background: doneFlag ? green : 'rgba(25,37,36,0.06)', color: doneFlag ? '#fff' : slate }}>{doneFlag ? '✓' : n}</span>
      <strong style={{ color: ink, fontSize: '0.95rem' }}>{title}</strong>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10050, background: 'rgba(25,37,36,0.45)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: '#FBFCFA', borderRadius: 22, padding: '1.6rem 1.5rem', boxShadow: '0 30px 60px -20px rgba(25,37,36,0.4)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', color: ink, margin: '0 0 0.3rem', letterSpacing: '-0.01em' }}>Secure your account</h2>
        <p style={{ color: slate, fontSize: '0.88rem', margin: '0 0 1.3rem', lineHeight: 1.5 }}>We signed you in from your listing email. Set a password so you can sign in from any device.</p>

        {step(1, verified, 'Confirm your email')}
        <div style={{ marginLeft: 34, marginBottom: '1.2rem' }}>
          <div style={{ color: slate, fontSize: '0.88rem', marginBottom: verified ? 0 : 8 }}>{email?.emailAddress}{verified && <span style={{ color: green, fontWeight: 600 }}> · confirmed</span>}</div>
          {!verified && (codeSent ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" inputMode="numeric" style={{ ...input, flex: 1 }} />
              <button onClick={verify} disabled={busy === 'verify' || code.trim().length < 6} style={{ ...btn, opacity: busy === 'verify' || code.trim().length < 6 ? 0.5 : 1 }}>{busy === 'verify' ? 'Checking…' : 'Confirm'}</button>
            </div>
          ) : (
            <button onClick={sendCode} disabled={busy === 'code'} style={{ ...btn, background: 'transparent', color: ink, border: `1.5px solid ${line}` }}>{busy === 'code' ? 'Sending…' : 'Email me a code'}</button>
          ))}
        </div>

        {step(2, hasPw, 'Set a password')}
        <div style={{ marginLeft: 34 }}>
          {hasPw ? <div style={{ color: green, fontSize: '0.88rem', fontWeight: 600 }}>Password set.</div> : (
            <>
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" autoComplete="new-password" style={{ ...input, marginBottom: 8 }} />
              <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm password" autoComplete="new-password" style={{ ...input, marginBottom: 10 }} />
              <button onClick={savePassword} disabled={busy === 'pw' || !pw} style={{ ...btn, opacity: busy === 'pw' || !pw ? 0.5 : 1 }}>{busy === 'pw' ? 'Saving…' : 'Save password'}</button>
            </>
          )}
        </div>

        {err && <p style={{ color: '#B42318', fontSize: '0.84rem', margin: '1rem 0 0' }}>{err}</p>}
        <div style={{ textAlign: 'right', marginTop: '1.4rem' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: sage, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' }}>{hasPw && verified ? 'Done' : 'Later'}</button>
        </div>
      </div>
    </div>
  );
}

export default function SecureAccountBanner({ topOffset = 0 }) {
  const { needed } = useSecureAccount();
  const [open, setOpen] = useState(false);
  const [later, setLater] = useState(() => { try { return sessionStorage.getItem(LATER_KEY) === '1'; } catch { return false; } });

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_SECURE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SECURE_EVENT, onOpen);
  }, []);

  const dismiss = () => { setLater(true); try { sessionStorage.setItem(LATER_KEY, '1'); } catch {} };

  return (
    <>
      {needed && !later && (
        <div style={{ position: 'fixed', top: topOffset, left: 0, right: 0, zIndex: 9998, background: 'linear-gradient(90deg,#E6F2EA 0%,#D1EBDB 50%,#E6F2EA 100%)', borderBottom: '1px solid rgba(47,93,74,0.25)', padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem', color: ink, textAlign: 'center' }}>
          <span><strong>Secure your account:</strong> set a password and confirm your email so you can sign in anytime.</span>
          <button onClick={() => setOpen(true)} style={{ background: ink, color: '#fff', border: 'none', borderRadius: 999, padding: '0.28rem 0.9rem', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Set password</button>
          <button onClick={dismiss} aria-label="Later" style={{ background: 'none', border: 'none', color: slate, cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
        </div>
      )}
      {open && <SecureModal onClose={() => setOpen(false)} />}
    </>
  );
}
