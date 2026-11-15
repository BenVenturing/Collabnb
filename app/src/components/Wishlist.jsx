import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

const inputStyle = {
  fontSize: '0.85rem', fontFamily: 'var(--font-body)', color: 'var(--ink)',
  background: 'rgba(247,245,242,0.7)', border: '1px solid rgba(60,87,89,0.18)',
  borderRadius: '0.6rem', padding: '0.5rem 0.65rem', boxSizing: 'border-box', minWidth: 0,
};

const pill = (on) => ({
  fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
  borderRadius: 999, padding: '0.35rem 0.75rem',
  border: on ? '1.5px solid var(--ink)' : '1.5px solid rgba(25,37,36,0.15)',
  background: on ? 'var(--ink)' : 'transparent', color: on ? '#fff' : 'var(--slate)',
});

export default function Wishlist() {
  const { t } = useTranslation('settings');
  const { profile } = useAuth();
  const userId = profile?._id ? String(profile._id) : null;
  const items = useQuery(api.wishlist.listForUser, userId ? { userId } : 'skip') || [];
  const add = useMutation(api.wishlist.add);
  const remove = useMutation(api.wishlist.remove);

  const [kind, setKind] = useState('hotel');
  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!userId || !name.trim()) return;
    setSaving(true); setError('');
    try {
      await add({ userId, kind, name, place: kind === 'hotel' && place.trim() ? place : undefined });
      setName(''); setPlace('');
    } catch (err) {
      setError(String(err.data || err.message || '').replace(/^.*Error:\s*/, '') || t('wishlist.error', "Couldn't save that. Try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: '0 0 0.75rem', lineHeight: 1.55 }}>
        {t('wishlist.intro', 'Tell us where you want to stay. We invite the hotels creators ask for most, and tell them you want to come.')}
      </p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button type="button" style={pill(kind === 'hotel')} onClick={() => setKind('hotel')}>{t('wishlist.kindHotel', 'A specific hotel')}</button>
          <button type="button" style={pill(kind === 'location')} onClick={() => setKind('location')}>{t('wishlist.kindLocation', 'A destination')}</button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input style={{ ...inputStyle, flex: '2 1 180px' }} value={name} maxLength={80} onChange={(e) => setName(e.target.value)}
            aria-label={kind === 'hotel' ? t('wishlist.hotelName', 'Hotel name') : t('wishlist.destination', 'Destination')}
            placeholder={kind === 'hotel' ? t('wishlist.hotelPlaceholder', 'Hotel name') : t('wishlist.locationPlaceholder', 'City, island or country')} />
          {kind === 'hotel' && (
            <input style={{ ...inputStyle, flex: '1 1 130px' }} value={place} maxLength={80} onChange={(e) => setPlace(e.target.value)}
              aria-label={t('wishlist.where', 'Where it is')} placeholder={t('wishlist.wherePlaceholder', 'Where it is (optional)')} />
          )}
          <button type="submit" disabled={saving || !name.trim()}
            style={{ ...pill(true), opacity: saving || !name.trim() ? 0.5 : 1 }}>
            {saving ? t('wishlist.adding', 'Adding…') : t('wishlist.add', 'Add')}
          </button>
        </div>
        {error && <p role="alert" style={{ fontSize: '0.78rem', color: '#b91c1c', margin: 0 }}>{error}</p>}
      </form>

      {items.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--slate)', margin: '0.5rem 0 0', lineHeight: 1.55 }}>
          {t('wishlist.empty', 'Nothing on your wishlist yet.')}
        </p>
      )}
      {items.map((w) => (
        <div key={w._id} style={{ padding: '0.7rem 0', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink)', margin: 0, overflowWrap: 'anywhere' }}>{w.name}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0.15rem 0 0' }}>
              {w.kind === 'hotel' ? [t('wishlist.hotelTag', 'Hotel'), w.place].filter(Boolean).join(' · ') : t('wishlist.locationTag', 'Destination')}
            </p>
          </div>
          <button onClick={() => remove({ id: w._id })}
            style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate)', flexShrink: 0 }}>
            {t('wishlist.remove', 'Remove')}
          </button>
        </div>
      ))}
    </div>
  );
}
