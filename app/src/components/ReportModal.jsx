import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

const REASONS = [
  ['objectionable_content', 'Objectionable or inappropriate content'],
  ['harassment', 'Harassment or abuse'],
  ['spam', 'Spam or scam'],
  ['inaccurate_information', 'Fake or inaccurate information'],
  ['unprofessional_behavior', 'Unprofessional behavior'],
  ['other', 'Something else'],
];

export default function ReportModal({ reportedUserId, reportedName, context, onClose }) {
  const { profile } = useAuth();
  const submitReport = useMutation(api.reports.submitReport);
  const blockUser = useMutation(api.profiles.blockUser);
  const [reason, setReason] = useState('objectionable_content');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const reporterId = String(profile._id);
      await submitReport({ reportedUserId: String(reportedUserId), reporterId, reason, details: details || undefined, context });
      if (alsoBlock) await blockUser({ profileId: reporterId, targetId: String(reportedUserId) });
      setDone(true);
    } catch (e) {
      setError('Could not send the report. Please try again or email hellocollabnb@gmail.com.');
    }
    setBusy(false);
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(25,37,36,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: 420, fontFamily: 'var(--font-body)' }}>
        {done ? (
          <>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#192524' }}>Report sent</h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#3C5759', lineHeight: 1.55 }}>
              Thanks. Our team reviews reports within 24 hours and removes content or users that break our rules.{alsoBlock ? ` ${reportedName || 'This user'} has been blocked.` : ''}
            </p>
            <button onClick={onClose} style={btn('#192524', '#fff')}>Done</button>
          </>
        ) : (
          <>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', color: '#192524' }}>Report {reportedName || 'this user'}</h3>
            <p style={{ margin: '0 0 0.9rem', fontSize: '0.8rem', color: '#646B62' }}>Reports are confidential. We act on them within 24 hours.</p>
            <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '0.6rem', border: '1px solid rgba(60,87,89,0.2)', fontSize: '0.85rem', marginBottom: '0.6rem', fontFamily: 'inherit' }}>
              {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} rows={3} placeholder="Add details (optional)" style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem', borderRadius: '0.6rem', border: '1px solid rgba(60,87,89,0.2)', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical' }} />
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.82rem', color: '#192524', margin: '0.75rem 0' }}>
              <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
              Also block this user
            </label>
            {error && <p style={{ color: '#991B1B', fontSize: '0.8rem', margin: '0 0 0.6rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={onClose} style={btn('#F7F5F2', '#3C5759')}>Cancel</button>
              <button onClick={submit} disabled={busy} style={btn('#991B1B', '#fff')}>{busy ? 'Sending…' : 'Submit report'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function btn(bg, color) {
  return { flex: 1, padding: '0.6rem 1rem', borderRadius: '999px', background: bg, color, border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
}
