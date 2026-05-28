import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
const FOUNDER_LIMIT = 100;

const CREATOR_COUNT_KEY = '@collabnb_founder_creator_count_v1';
const HOST_COUNT_KEY    = '@collabnb_founder_host_count_v1';

function getCount(key) {
  try { return parseInt(localStorage.getItem(key) || '0', 10); } catch { return 0; }
}
function setCount(key, n) {
  try { localStorage.setItem(key, String(n)); } catch {}
}

// ─── Shared field styles ──────────────────────────────────────────────────────
const INPUT = {
  width: '100%', padding: '0.55rem 0.75rem',
  background: '#fff', border: '1px solid rgba(25,37,36,0.12)',
  borderRadius: '0.5rem', fontSize: '0.85rem',
  fontFamily: 'inherit', color: '#192524', outline: 'none',
};
const LABEL = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  color: '#3C5759', marginBottom: '0.35rem',
};
const CARD = {
  background: '#fff', border: '1px solid rgba(25,37,36,0.07)',
  borderRadius: '0.875rem', padding: '1.5rem',
  boxShadow: '0 1px 3px rgba(25,37,36,0.04)', marginBottom: '1rem',
};

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#959D90', marginBottom: '0.75rem', marginTop: '1.75rem' }}>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.625rem 0', borderBottom: '1px solid rgba(25,37,36,0.05)' }}>
      <span style={{ fontSize: '0.85rem', color: '#3C5759' }}>{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer',
          background: checked ? '#3C5759' : '#D0D5CE',
          position: 'relative', flexShrink: 0, transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(25,37,36,0.2)',
        }} />
      </button>
    </label>
  );
}

function SaveBtn({ onClick, saved, label = 'Save' }) {
  return (
    <button
      onClick={onClick}
      style={{
        marginTop: '1rem', padding: '0.5rem 1.25rem', borderRadius: '0.5rem',
        background: saved ? '#D1EBDB' : '#192524',
        color: saved ? '#166534' : '#fff',
        fontSize: '0.82rem', fontWeight: 600, border: 'none',
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
      }}
    >
      {saved ? '✓ Saved' : label}
    </button>
  );
}

// ─── Founder Override ─────────────────────────────────────────────────────────
function FounderOverride() {
  const [handle, setHandle]     = useState('');
  const [found, setFound]       = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy]         = useState(false);
  const [msg, setMsg]           = useState('');

  const setFounderStatus = useMutation(api.profiles.setFounderStatus);

  // Use Convex reactive query for username lookup
  const lookupResult = useQuery(
    api.profiles.getByUsername,
    handle.trim().length > 0 ? { username: handle.trim().replace(/^@/, '') } : 'skip'
  );

  function handleSearch(e) {
    e.preventDefault();
    if (lookupResult === undefined) return; // still loading
    if (lookupResult) {
      setFound(lookupResult);
      setNotFound(false);
    } else {
      setFound(null);
      setNotFound(true);
    }
    setMsg('');
  }

  async function applyOverride(grant) {
    if (!found) return;
    setBusy(true);
    try {
      await setFounderStatus({ profileId: found._id, isFounder: grant });

      // Sync local founder counts
      const countKey = found.role === 'creator' ? CREATOR_COUNT_KEY : HOST_COUNT_KEY;
      const current  = getCount(countKey);
      if (grant && current < FOUNDER_LIMIT) {
        setCount(countKey, current + 1);
      } else if (!grant && current > 0) {
        setCount(countKey, current - 1);
      }

      setMsg(grant ? `✓ @${found.username} granted Founder status.` : `✓ @${found.username} Founder status revoked.`);
      setFound(null);
      setHandle('');
    } catch {
      setMsg('Something went wrong. Try again.');
    }
    setBusy(false);
  }

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          value={handle}
          onChange={(e) => { setHandle(e.target.value); setFound(null); setNotFound(false); setMsg(''); }}
          placeholder="@username"
          style={{ ...INPUT, flex: 1 }}
        />
        <button
          type="submit"
          style={{ padding: '0.55rem 1rem', borderRadius: '0.5rem', background: '#192524', color: '#fff', fontSize: '0.82rem', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
        >
          Look up
        </button>
      </form>

      {notFound && <p style={{ fontSize: '0.8rem', color: '#991B1B', margin: 0 }}>No profile found for that username.</p>}

      {found && (
        <div style={{ background: '#F7F5F2', borderRadius: '0.625rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#192524' }}>{found.full_name}</div>
            <div style={{ fontSize: '0.78rem', color: '#959D90' }}>@{found.username} · {found.role} · {found.is_founder ? '🌟 Founder' : 'Not a founder'}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!found.is_founder && (
              <button
                disabled={busy}
                onClick={() => applyOverride(true)}
                style={{ padding: '0.4rem 0.75rem', borderRadius: '0.4rem', background: '#D1EBDB', color: '#166534', fontSize: '0.78rem', fontWeight: 600, border: '1px solid rgba(22,101,52,0.15)', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
              >
                Grant Founder
              </button>
            )}
            {found.is_founder && (
              <button
                disabled={busy}
                onClick={() => applyOverride(false)}
                style={{ padding: '0.4rem 0.75rem', borderRadius: '0.4rem', background: '#FEE2E2', color: '#991B1B', fontSize: '0.78rem', fontWeight: 600, border: '1px solid rgba(153,27,27,0.15)', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
              >
                Revoke Founder
              </button>
            )}
          </div>
        </div>
      )}

      {msg && <p style={{ fontSize: '0.8rem', color: '#166534', marginTop: '0.5rem', margin: '0.5rem 0 0' }}>{msg}</p>}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function AdminSettings() {
  const settings    = useQuery(api.admin.getSettings);
  const setSetting  = useMutation(api.admin.setSetting);

  // Platform settings
  const [platformName, setPlatformName] = useState('Collabnb');
  const [maintenance,  setMaintenance]  = useState(false);
  const [platSaved,    setPlatSaved]    = useState(false);

  // Notification toggles
  const [notifySignup,  setNotifySignup]  = useState(false);
  const [notifyMessage, setNotifyMessage] = useState(false);
  const [notifyCollab,  setNotifyCollab]  = useState(false);
  const [notifSaved,    setNotifSaved]    = useState(false);

  // Sync loaded settings into state
  useEffect(() => {
    if (!settings) return;
    if (settings.platform_name)   setPlatformName(settings.platform_name);
    if (settings.maintenance_mode !== undefined) setMaintenance(settings.maintenance_mode === 'true');
    setNotifySignup(settings.notify_signup   === 'true');
    setNotifyMessage(settings.notify_message === 'true');
    setNotifyCollab(settings.notify_collab   === 'true');
  }, [settings]);

  async function savePlatformSettings() {
    await Promise.all([
      setSetting({ key: 'platform_name',    value: platformName }),
      setSetting({ key: 'maintenance_mode', value: String(maintenance) }),
    ]);
    setPlatSaved(true);
    setTimeout(() => setPlatSaved(false), 2500);
  }

  async function saveNotifications() {
    await Promise.all([
      setSetting({ key: 'notify_signup',   value: String(notifySignup)  }),
      setSetting({ key: 'notify_message',  value: String(notifyMessage) }),
      setSetting({ key: 'notify_collab',   value: String(notifyCollab)  }),
    ]);
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2500);
  }

  const founderCounts = {
    creator: getCount(CREATOR_COUNT_KEY),
    host:    getCount(HOST_COUNT_KEY),
  };

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 640 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: '#192524', letterSpacing: '-0.025em', margin: 0 }}>
        Settings
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#959D90', marginTop: '0.3rem', marginBottom: '1.75rem' }}>
        Platform-level configuration and overrides.
      </p>

      {settings === undefined ? (
        <div style={{ color: '#959D90', fontSize: '0.85rem', padding: '3rem 0', textAlign: 'center' }}>Loading…</div>
      ) : (
        <>
          {/* ── Platform Settings ── */}
          <SectionTitle>Platform Settings</SectionTitle>
          <div style={CARD}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={LABEL}>Admin Email (read-only)</label>
              <input value={ADMIN_EMAIL || '—'} readOnly style={{ ...INPUT, background: '#F7F5F2', color: '#959D90', cursor: 'not-allowed' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={LABEL}>Platform Name</label>
              <input
                value={platformName}
                onChange={(e) => { setPlatformName(e.target.value); setPlatSaved(false); }}
                style={INPUT}
              />
            </div>
            <Toggle
              label="Maintenance Mode — shows a banner on all pages"
              checked={maintenance}
              onChange={(v) => { setMaintenance(v); setPlatSaved(false); }}
            />
            {maintenance && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#FEF3C7', borderRadius: '0.5rem', fontSize: '0.78rem', color: '#92400E', borderLeft: '3px solid #FCD34D' }}>
                ⚠️ Maintenance mode is ON — a banner will show on all pages.
              </div>
            )}
            <SaveBtn onClick={savePlatformSettings} saved={platSaved} />
          </div>

          {/* ── Founder Settings ── */}
          <SectionTitle>Founder Settings</SectionTitle>
          <div style={CARD}>
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: founderCounts.creator >= FOUNDER_LIMIT ? '#991B1B' : '#166534' }}>
                  {founderCounts.creator} <span style={{ fontSize: '0.9rem', color: '#959D90', fontWeight: 400 }}>/ {FOUNDER_LIMIT}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#3C5759' }}>Creator Founders</div>
              </div>
              <div style={{ width: 1, background: 'rgba(25,37,36,0.07)' }} />
              <div>
                <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: founderCounts.host >= FOUNDER_LIMIT ? '#991B1B' : '#166534' }}>
                  {founderCounts.host} <span style={{ fontSize: '0.9rem', color: '#959D90', fontWeight: 400 }}>/ {FOUNDER_LIMIT}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#3C5759' }}>Host Founders</div>
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3C5759', marginBottom: '0.625rem' }}>Manual Override</div>
            <FounderOverride />
          </div>

          {/* ── Notification Preferences ── */}
          <SectionTitle>Notification Preferences</SectionTitle>
          <div style={CARD}>
            <Toggle label="Email on new signup"           checked={notifySignup}  onChange={(v) => { setNotifySignup(v);  setNotifSaved(false); }} />
            <Toggle label="Email on new user message"     checked={notifyMessage} onChange={(v) => { setNotifyMessage(v); setNotifSaved(false); }} />
            <Toggle label="Email on collab completed"     checked={notifyCollab}  onChange={(v) => { setNotifyCollab(v);  setNotifSaved(false); }} />
            <SaveBtn onClick={saveNotifications} saved={notifSaved} />
          </div>
        </>
      )}
    </div>
  );
}
