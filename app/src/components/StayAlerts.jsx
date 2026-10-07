import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import { COUNTRIES } from '../lib/countries';
import { DELIVERABLE_TYPES, DELIVERABLE_LABELS } from '../../convex/lib/compensationPoints';

const MAX_ALERTS = 5;

const EMPTY = {
  name: '',
  countries: [],
  deliverable_types: [],
  min_cash: '',
  compensation_types: [],
  min_nights: '',
  travel_start: '',
  travel_end: '',
  instant_email: false,
};

// Convert the form's string-y state into the mutation/query shape: blank means
// "no constraint on this dimension", not zero.
function toFilters(d) {
  const num = (v) => (v === '' || v === null || Number.isNaN(Number(v)) ? undefined : Number(v));
  return {
    countries: d.countries.length ? d.countries : undefined,
    deliverable_types: d.deliverable_types.length ? d.deliverable_types : undefined,
    min_cash: num(d.min_cash),
    compensation_types: d.compensation_types.length ? d.compensation_types : undefined,
    min_nights: num(d.min_nights),
    travel_start: d.travel_start || undefined,
    travel_end: d.travel_end || undefined,
  };
}

function alertToDraft(a) {
  return {
    name: a.name || '',
    countries: a.countries || [],
    deliverable_types: a.deliverable_types || [],
    min_cash: a.min_cash ?? '',
    compensation_types: a.compensation_types || [],
    min_nights: a.min_nights ?? '',
    travel_start: a.travel_start || '',
    travel_end: a.travel_end || '',
    instant_email: a.instant_email === true,
  };
}

function summarize(a, t) {
  const parts = [];
  if (a.compensation_types?.length === 1) {
    parts.push(a.compensation_types[0] === 'hybrid' ? t('stayAlerts.hybrid') : t('stayAlerts.paid'));
  }
  if (a.deliverable_types?.length) parts.push(a.deliverable_types.map((d) => DELIVERABLE_LABELS[d] || d).join(' / '));
  if (a.min_cash) parts.push(`$${a.min_cash}+`);
  if (a.min_nights) parts.push(t('stayAlerts.nightsPlus', { n: a.min_nights }));
  parts.push(a.countries?.length ? a.countries.join(', ') : t('stayAlerts.anywhere'));
  if (a.travel_start || a.travel_end) parts.push(`${a.travel_start || '…'} → ${a.travel_end || '…'}`);
  return parts.join(' · ');
}

const chipStyle = (on) => ({
  fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
  borderRadius: 999, padding: '0.35rem 0.75rem',
  border: on ? '1.5px solid var(--ink)' : '1.5px solid rgba(25,37,36,0.15)',
  background: on ? 'var(--ink)' : 'transparent',
  color: on ? '#fff' : 'var(--slate)',
  transition: 'all 150ms',
});

const inputStyle = {
  fontSize: '0.85rem', fontFamily: 'var(--font-body)', color: 'var(--ink)',
  background: 'rgba(247,245,242,0.7)', border: '1px solid rgba(60,87,89,0.18)',
  borderRadius: '0.6rem', padding: '0.5rem 0.65rem', width: '100%', boxSizing: 'border-box',
};

function FieldLabel({ children, hint }) {
  return (
    <div style={{ margin: '0 0 0.4rem' }}>
      <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{children}</p>
      {hint && <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0.1rem 0 0', lineHeight: 1.45 }}>{hint}</p>}
    </div>
  );
}

function Editor({ initial, onCancel, onSave, saving, error }) {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const [d, setD] = useState(initial);
  const set = (k, v) => setD((prev) => ({ ...prev, [k]: v }));
  const toggleIn = (k, v) => setD((prev) => ({
    ...prev,
    [k]: prev[k].includes(v) ? prev[k].filter((x) => x !== v) : [...prev[k], v],
  }));

  const filters = useMemo(() => toFilters(d), [d]);
  const preview = useQuery(api.stayAlerts.previewMatches, filters);

  return (
    <div style={{ padding: '1.1rem', background: 'rgba(25,37,36,0.03)', border: '1px solid rgba(60,87,89,0.12)', borderRadius: '0.9rem', margin: '0.75rem 0 0' }}>
      <div style={{ marginBottom: '1.1rem' }}>
        <FieldLabel>{t('stayAlerts.fieldName')}</FieldLabel>
        <input style={inputStyle} value={d.name} maxLength={60} placeholder={t('stayAlerts.fieldNamePlaceholder')} onChange={(e) => set('name', e.target.value)} />
      </div>

      <div style={{ marginBottom: '1.1rem' }}>
        <FieldLabel hint={t('stayAlerts.fieldWhereHint')}>{t('stayAlerts.fieldWhere')}</FieldLabel>
        {d.countries.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
            {d.countries.map((c) => (
              <button key={c} onClick={() => toggleIn('countries', c)} style={chipStyle(true)}>{c} ×</button>
            ))}
          </div>
        )}
        <select
          value=""
          onChange={(e) => { if (e.target.value) toggleIn('countries', e.target.value); }}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">{t('stayAlerts.addCountry')}</option>
          {COUNTRIES.filter((c) => !d.countries.includes(c)).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '1.1rem' }}>
        <FieldLabel hint={t('stayAlerts.fieldDeliverablesHint')}>{t('stayAlerts.fieldDeliverables')}</FieldLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {DELIVERABLE_TYPES.map((dt) => (
            <button key={dt} onClick={() => toggleIn('deliverable_types', dt)} style={chipStyle(d.deliverable_types.includes(dt))}>
              {DELIVERABLE_LABELS[dt]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 140px', minWidth: 0 }}>
          <FieldLabel hint={t('stayAlerts.fieldCashHint')}>{t('stayAlerts.fieldCash')}</FieldLabel>
          <input style={inputStyle} type="number" min="0" step="50" value={d.min_cash} placeholder="0" onChange={(e) => set('min_cash', e.target.value)} />
        </div>
        <div style={{ flex: '1 1 140px', minWidth: 0 }}>
          <FieldLabel>{t('stayAlerts.fieldNights')}</FieldLabel>
          <input style={inputStyle} type="number" min="0" step="1" value={d.min_nights} placeholder={t('stayAlerts.any')} onChange={(e) => set('min_nights', e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: '1.1rem' }}>
        <FieldLabel hint={t('stayAlerts.fieldCompHint')}>{t('stayAlerts.fieldComp')}</FieldLabel>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[['paid', t('stayAlerts.paid')], ['hybrid', t('stayAlerts.hybrid')]].map(([v, lbl]) => (
            <button key={v} onClick={() => toggleIn('compensation_types', v)} style={chipStyle(d.compensation_types.includes(v))}>{lbl}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 140px', minWidth: 0 }}>
          <FieldLabel>{t('stayAlerts.fieldFrom')}</FieldLabel>
          <input style={inputStyle} type="date" value={d.travel_start} onChange={(e) => set('travel_start', e.target.value)} />
        </div>
        <div style={{ flex: '1 1 140px', minWidth: 0 }}>
          <FieldLabel>{t('stayAlerts.fieldTo')}</FieldLabel>
          <input style={inputStyle} type="date" value={d.travel_end} onChange={(e) => set('travel_end', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.1rem' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{t('stayAlerts.instantEmail')}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0.1rem 0 0', lineHeight: 1.45 }}>{t('stayAlerts.instantEmailDesc')}</p>
        </div>
        <button
          role="switch" aria-checked={d.instant_email} aria-label={t('stayAlerts.instantEmail')}
          onClick={() => set('instant_email', !d.instant_email)}
          style={{ flexShrink: 0, position: 'relative', width: 44, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, background: d.instant_email ? '#4A9B7F' : 'rgba(25,37,36,0.15)', transition: 'background 200ms' }}
        >
          <span style={{ position: 'absolute', top: 2, left: d.instant_email ? 20 : 2, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 200ms cubic-bezier(0.34,1.56,0.64,1)' }} />
        </button>
      </div>

      {/* Live match count — doubles as the too-narrow warning when it reads 0 */}
      <div style={{ padding: '0.7rem 0.85rem', borderRadius: '0.7rem', background: preview?.count === 0 ? 'rgba(212,168,67,0.12)' : 'rgba(74,155,127,0.1)', marginBottom: '1.1rem' }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>
          {preview === undefined
            ? t('stayAlerts.previewLoading')
            : preview.count === 0
              ? t('stayAlerts.previewNone')
              : t('stayAlerts.previewCount', { n: preview.count })}
        </p>
        {preview?.count > 0 && (
          <button
            onClick={() => navigate('/explore')}
            style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--ink)', background: 'none', border: 'none', padding: 0, marginTop: '0.3rem', cursor: 'pointer', fontFamily: 'var(--font-body)', textDecoration: 'underline' }}
          >
            {t('stayAlerts.previewSeeThem')}
          </button>
        )}
      </div>

      {error && <p style={{ fontSize: '0.78rem', color: '#dc2626', margin: '0 0 0.75rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <button
          onClick={() => onSave(d)}
          disabled={saving || !d.name.trim()}
          style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', background: 'var(--ink)', border: 'none', borderRadius: 999, padding: '0.5rem 1.1rem', cursor: saving || !d.name.trim() ? 'default' : 'pointer', opacity: saving || !d.name.trim() ? 0.5 : 1, fontFamily: 'var(--font-body)' }}
        >
          {saving ? t('stayAlerts.saving') : t('stayAlerts.save')}
        </button>
        <button
          onClick={onCancel}
          style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)', background: 'none', border: '1.5px solid rgba(25,37,36,0.15)', borderRadius: 999, padding: '0.5rem 1.1rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          {t('stayAlerts.cancel')}
        </button>
      </div>
    </div>
  );
}

/**
 * Stay alerts panel — "tell me when a stay like this goes live".
 * Rendered in Settings → Notifications, and linked to from the creator
 * onboarding checklist via /settings?tab=notifications&alerts=setup.
 */
export default function StayAlerts({ highlight }) {
  const { t } = useTranslation('settings');
  const { profile, updateProfile } = useAuth();
  const userId = profile?._id ? String(profile._id) : null;
  const alerts = useQuery(api.stayAlerts.listForUser, userId ? { userId } : 'skip');
  const save = useMutation(api.stayAlerts.save);
  const setPaused = useMutation(api.stayAlerts.setPaused);
  const remove = useMutation(api.stayAlerts.remove);

  const [editing, setEditing] = useState(null); // null | 'new' | alertId
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const list = alerts || [];
  const masterOn = profile?.notification_prefs?.newListings === true;

  const handleSave = async (d) => {
    if (!userId) return;
    setSaving(true);
    setError('');
    try {
      await save({
        userId,
        ...(editing && editing !== 'new' ? { id: editing } : {}),
        name: d.name.trim(),
        ...toFilters(d),
        instant_email: d.instant_email,
      });
      // Saving an alert is consent to be alerted — flip the master switch on
      // rather than leaving the creator with an alert that silently can't fire.
      if (!masterOn) {
        updateProfile({
          notification_prefs: { ...(profile?.notification_prefs || {}), newListings: true },
        });
      }
      setEditing(null);
    } catch (e) {
      setError(e?.data || e?.message || t('stayAlerts.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={highlight ? { padding: '0.9rem', margin: '0.5rem 0', borderRadius: '0.9rem', background: 'rgba(74,155,127,0.07)', border: '1px solid rgba(74,155,127,0.25)' } : undefined}>
      <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: '0 0 0.75rem', lineHeight: 1.55 }}>
        {t('stayAlerts.intro')}
      </p>

      {list.length === 0 && editing === null && (
        <p style={{ fontSize: '0.82rem', color: 'var(--slate)', margin: '0 0 0.75rem', lineHeight: 1.55 }}>
          {t('stayAlerts.empty')}
        </p>
      )}

      {list.map((a) => (
        editing === a._id ? (
          <Editor
            key={a._id}
            initial={alertToDraft(a)}
            onCancel={() => { setEditing(null); setError(''); }}
            onSave={handleSave}
            saving={saving}
            error={error}
          />
        ) : (
          <div key={a._id} style={{ padding: '0.9rem 0', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                🔔 {a.name}
                {a.paused && (
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#A87820', background: 'rgba(212,168,67,0.16)', borderRadius: 999, padding: '0.15rem 0.45rem' }}>
                    {t('stayAlerts.pausedBadge')}
                  </span>
                )}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: '0.2rem 0 0', lineHeight: 1.5 }}>{summarize(a, t)}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0.25rem 0 0' }}>
                {t('stayAlerts.matchedCount', { n: a.match_count || 0 })}
                {' · '}
                {a.instant_email ? t('stayAlerts.cadenceInstant') : t('stayAlerts.cadenceWeekly')}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.45rem' }}>
                {[
                  [t('stayAlerts.edit'), () => { setEditing(a._id); setError(''); }],
                  [a.paused ? t('stayAlerts.resume') : t('stayAlerts.pause'), () => setPaused({ id: a._id, paused: !a.paused })],
                  [t('stayAlerts.delete'), () => remove({ id: a._id })],
                ].map(([label, onClick]) => (
                  <button
                    key={label}
                    onClick={onClick}
                    style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', textDecoration: 'underline' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      ))}

      {editing === 'new' && (
        <Editor
          initial={EMPTY}
          onCancel={() => { setEditing(null); setError(''); }}
          onSave={handleSave}
          saving={saving}
          error={error}
        />
      )}

      {editing === null && (
        <button
          onClick={() => { setEditing('new'); setError(''); }}
          disabled={list.length >= MAX_ALERTS}
          style={{ marginTop: '0.75rem', fontSize: '0.82rem', fontWeight: 700, color: list.length >= MAX_ALERTS ? 'var(--sage)' : '#fff', background: list.length >= MAX_ALERTS ? 'transparent' : 'var(--ink)', border: list.length >= MAX_ALERTS ? '1.5px solid rgba(25,37,36,0.12)' : 'none', borderRadius: 999, padding: '0.5rem 1.1rem', cursor: list.length >= MAX_ALERTS ? 'default' : 'pointer', fontFamily: 'var(--font-body)' }}
        >
          {list.length >= MAX_ALERTS ? t('stayAlerts.maxReached', { n: MAX_ALERTS }) : t('stayAlerts.newAlert')}
        </button>
      )}

      {list.length > 0 && !masterOn && (
        <p style={{ fontSize: '0.75rem', color: '#A87820', margin: '0.75rem 0 0', lineHeight: 1.5 }}>
          {t('stayAlerts.masterOff')}
        </p>
      )}
    </div>
  );
}
