import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const MOSS  = '#2D7A5F';
const RUST  = '#b45309';

function PasskeyModal({ contract, onClose, onApproved }) {
  const approveContractCharge = useAction(api.stripe.approveContractCharge);
  const [passkey, setPasskey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!passkey) return;
    setBusy(true);
    setError('');
    try {
      const result = await approveContractCharge({ contractId: contract._id, passkey });
      if (result?.error) {
        setError(result.error);
      } else if (result?.needsAction) {
        setError(`Charge needs manual completion (status: ${result.status}) — the saved card may need re-authentication.`);
      } else {
        onApproved();
      }
    } catch (err) {
      setError(err?.data || err?.message || "Couldn't approve — check the passkey and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(25,37,36,0.45)', padding: '1.5rem' }} onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 20px 60px rgba(25,37,36,0.25)' }}>
        <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: INK, marginBottom: '0.3rem' }}>
          Confirm charge
        </div>
        <p style={{ fontSize: '0.82rem', color: SLATE, lineHeight: 1.5, margin: '0 0 1rem' }}>
          This will charge <strong>{contract.host_name}</strong>'s saved {contract.host_payment_method_type === 'us_bank_account' ? 'bank account' : 'card'} <strong>${(contract.charge_approval_gross_amount ?? 0).toFixed(2)}</strong> right now. Enter the passkey to confirm.
        </p>
        <input
          type="password"
          autoFocus
          value={passkey}
          onChange={(e) => setPasskey(e.target.value)}
          placeholder="Passkey"
          style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.6rem', border: '1px solid rgba(25,37,36,0.18)', fontSize: '0.9rem', marginBottom: '0.9rem', boxSizing: 'border-box' }}
        />
        {error && <p style={{ fontSize: '0.78rem', color: '#dc2626', margin: '0 0 0.9rem', lineHeight: 1.4 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.7rem', borderRadius: '0.6rem', border: '1px solid rgba(25,37,36,0.14)', background: 'none', color: SLATE, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={busy || !passkey} style={{ flex: 1, padding: '0.7rem', borderRadius: '0.6rem', border: 'none', background: busy || !passkey ? 'rgba(45,122,95,0.5)' : MOSS, color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: busy || !passkey ? 'not-allowed' : 'pointer' }}>
            {busy ? 'Charging…' : 'Approve & charge'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ApprovalRow({ contract, onApprove, onDecline, declining }) {
  const isACH = contract.host_payment_method_type === 'us_bank_account';
  const requestedAgo = contract.charge_approval_requested_at
    ? new Date(contract.charge_approval_requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—';
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', padding: '1.1rem 1.35rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: INK }}>
            {contract.property_name || 'Collaboration'} · {contract.host_name}
          </div>
          <div style={{ fontSize: '0.76rem', color: SAGE, marginTop: '0.2rem' }}>
            Requested {requestedAgo} · <span style={{ fontWeight: 700, color: isACH ? RUST : SLATE }}>{isACH ? 'Bank account (ACH)' : 'Card'}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700, fontSize: '1.15rem', color: INK }}>
            ${(contract.charge_approval_gross_amount ?? 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.72rem', color: SAGE }}>
            fee ${(contract.charge_approval_fee_amount ?? 0).toFixed(2)}
            {(contract.charge_approval_creator_payout ?? 0) > 0 && ` · payout $${contract.charge_approval_creator_payout.toFixed(2)}`}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.9rem' }}>
        <button onClick={onApprove} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: MOSS, color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
          Approve & charge
        </button>
        <button onClick={onDecline} disabled={declining} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid rgba(180,83,9,0.3)', background: 'none', color: RUST, fontWeight: 700, fontSize: '0.78rem', cursor: declining ? 'not-allowed' : 'pointer' }}>
          {declining ? 'Declining…' : 'Decline'}
        </button>
      </div>
    </div>
  );
}

export default function PayoutApprovals() {
  const pending = useQuery(api.contracts.getPendingChargeApprovals);
  const declineChargeApproval = useMutation(api.contracts.declineChargeApproval);
  const [approvingId, setApprovingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);

  async function handleDecline(contractId) {
    if (!window.confirm('Decline this charge? The host will not be billed unless you re-trigger it manually later.')) return;
    setDecliningId(contractId);
    try {
      await declineChargeApproval({ contractId });
    } finally {
      setDecliningId(null);
    }
  }

  const approvingContract = pending?.find((c) => c._id === approvingId);

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 900 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Approvals
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.75rem' }}>
        Nothing charges automatically. A collab landing here means its host is ready to be charged — nothing moves until you approve it here with the passkey.
      </p>

      {pending === undefined ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem', background: '#fff', borderRadius: '0.875rem', border: '1px solid rgba(25,37,36,0.07)' }}>
          Loading…
        </div>
      ) : pending.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem', background: '#fff', borderRadius: '0.875rem', border: '1px solid rgba(25,37,36,0.07)' }}>
          Nothing waiting on approval right now.
        </div>
      ) : (
        pending.map((c) => (
          <ApprovalRow
            key={c._id}
            contract={c}
            declining={decliningId === c._id}
            onApprove={() => setApprovingId(c._id)}
            onDecline={() => handleDecline(c._id)}
          />
        ))
      )}

      {approvingContract && (
        <PasskeyModal
          contract={approvingContract}
          onClose={() => setApprovingId(null)}
          onApproved={() => setApprovingId(null)}
        />
      )}
    </div>
  );
}
