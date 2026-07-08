import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCollabs } from '../contexts/CollabContext';
import { useAuth } from '../contexts/AuthContext';
import { SAMPLE_HOST } from '../lib/mockData';
import PaymentModal from './PaymentModal';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
const FREE_STAY_VALUE = 'free_stay';

const USAGE_RIGHTS = [
  { value: 'social_media', label: 'Social Media Only' },
  { value: 'commercial', label: 'Commercial Use' },
  { value: 'unlimited', label: 'Unlimited Use' },
  { value: 'exclusive_30', label: 'Exclusive 30 Days' },
  { value: 'editorial', label: 'Limited Editorial Use' },
  { value: 'web_print', label: 'Web & Print' },
  { value: 'all_credit', label: 'All Platforms with Credit' },
];

const STATUS_CONFIG = {
  draft:       { label: 'Draft',       bg: 'bg-stone/30 text-sage' },
  pending:     { label: 'Pending',     bg: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'In Progress', bg: 'bg-mint text-slate' },
};

/* Hosts the creator can send contracts to */
const KNOWN_HOSTS = [
  { id: 'host_1', name: SAMPLE_HOST.name, avatar: SAMPLE_HOST.avatar_url, properties: ['Glacier Prime Cabin', 'Tranquil Waterfront Retreat'] },
  { id: 'host_2', name: 'Sierra Mountain Lodge', avatar: null, properties: ['Mountain Lodge Escape'] },
  { id: 'host_3', name: 'Napa Valley Estates', avatar: null, properties: ['Vineyard Wine Estate'] },
];

// ─── Helper: format date for filename ──
function dateStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ContractBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill;
  const previewRef = useRef(null);
  const { saveContract, updateContract, markContractSent, contracts, sendContractMessage } = useCollabs();
  const { profile } = useAuth();

  // Real host profiles to send to; fall back to demo hosts when none exist yet.
  const hostProfiles = useQuery(api.profiles.getHosts);
  const liveHosts = (hostProfiles || []).map((h) => ({
    id: String(h._id),
    name: h.full_name,
    avatar: h.avatar_url,
    subtitle: [h.city, h.region].filter(Boolean).join(', ') || 'Host',
    isReal: true,
  }));
  const sendHosts = liveHosts.length ? liveHosts : KNOWN_HOSTS;

  const [editingId, setEditingId] = useState(null);
  const [contractList, setContractList] = useState([]);
  const [showList, setShowList] = useState(false);
  const [selectedHost, setSelectedHost] = useState(null);

  const FORM_DRAFT_KEY = 'collabnb_contract_form_draft';

  const [form, setForm] = useState(() => {
    // On first mount restore any in-progress draft (unless navigated with prefill)
    if (!prefill) {
      try {
        const raw = localStorage.getItem(FORM_DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d.form) return d.form;
        }
      } catch {}
    }
    return {
      creator: prefill?.creator || profile?.full_name || '',
      host: prefill?.host || '',
      property_name: prefill?.property_name || '',
      location: prefill?.location || '',
      dates: prefill?.dates || '',
      deliverables: prefill?.deliverables || '',
      currency: 'USD',
      paymentAmount: '',
      isFreeStay: false,
      usageRights: '',
    };
  });

  const [status, setStatus] = useState(() => {
    if (!prefill) {
      try {
        const raw = localStorage.getItem(FORM_DRAFT_KEY);
        if (raw) return JSON.parse(raw).status || 'draft';
      } catch {}
    }
    return 'draft';
  });
  const [creatorSig, setCreatorSig] = useState(() => {
    if (!prefill) {
      try {
        const raw = localStorage.getItem(FORM_DRAFT_KEY);
        if (raw) return JSON.parse(raw).creatorSig || '';
      } catch {}
    }
    return '';
  });
  const [hostSig, setHostSig] = useState(() => {
    if (!prefill) {
      try {
        const raw = localStorage.getItem(FORM_DRAFT_KEY);
        if (raw) return JSON.parse(raw).hostSig || '';
      } catch {}
    }
    return '';
  });

  // ── Auto-save state ──
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const autoSaveTimer = useRef(null);
  const savedStatusTimer = useRef(null);

  // ── Send modal state ──
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // ── Payment state ──
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [contractPaid, setContractPaid] = useState(false);
  const [paymentCancelled, setPaymentCancelled] = useState(false);
  const [cardSaved, setCardSaved] = useState(false);
  const [founderToast, setFounderToast] = useState(false);
  const verifyFeeSetupSession = useAction(api.stripe.verifyFeeSetupSession);

  // ── Auto-generated summary paragraph ──
  const [summaryNote, setSummaryNote] = useState('');

  const generateSummary = () => {
    const payment = computePaymentDisplay();
    const usage = computeUsageDisplay();
    let text = `This collaboration agreement is between `;

    if (form.creator && form.host) {
      text += `${form.creator} (Creator) and ${form.host} (Host)`;
    } else if (form.creator) {
      text += `${form.creator} (Creator) and the Host`;
    } else if (form.host) {
      text += `the Creator and ${form.host} (Host)`;
    } else {
      text += `the Creator and the Host`;
    }

    if (form.property_name) text += ` for a collaboration at ${form.property_name}`;
    if (form.location) text += ` in ${form.location}`;
    if (form.dates) text += `, taking place from ${form.dates}`;
    text += `. `;

    if (form.deliverables) text += `The Creator agrees to deliver ${form.deliverables}`;
    if (payment) text += ` in exchange for ${payment}`;
    if (usage) text += `. Content usage is limited to ${usage}`;
    text += '. Both parties agree to the terms outlined above.';

    return text;
  };

  // Auto-populate summary whenever form fields change
  useEffect(() => {
    setSummaryNote(generateSummary());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.creator, form.host, form.property_name, form.location, form.dates, form.deliverables, form.paymentAmount, form.isFreeStay, form.currency, form.usageRights]);

  // Load contracts from context on mount; restore editingId from draft
  useEffect(() => {
    setContractList(contracts || []);
  }, [contracts]);

  useEffect(() => {
    if (prefill) return;
    try {
      const raw = localStorage.getItem(FORM_DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.editingId) setEditingId(d.editingId);
      }
    } catch {}
  }, []); // eslint-disable-line

  // Persist form draft to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify({ form, status, creatorSig, hostSig, editingId }));
    } catch {}
  }, [form, status, creatorSig, hostSig, editingId]);

  // Debounced auto-save when editing an existing contract
  useEffect(() => {
    if (!editingId) return;
    setSaveStatus('saving');
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      updateContract(editingId, {
        creator_name: form.creator,
        host_name: form.host,
        property_name: form.property_name,
        location: form.location,
        dates: form.dates,
        deliverables: form.deliverables,
        currency: form.isFreeStay ? FREE_STAY_VALUE : form.currency,
        payment: form.isFreeStay ? 'Free Stay' : (form.currency && form.paymentAmount ? `${form.currency} ${form.paymentAmount}` : ''),
        usage_rights: USAGE_RIGHTS.find((u) => u.value === form.usageRights)?.label || form.usageRights,
        summary_note: summaryNote,
        status,
        creator_signed: !!creatorSig,
        host_signed: !!hostSig,
      });
      setSaveStatus('saved');
      clearTimeout(savedStatusTimer.current);
      savedStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
    }, 1000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [form, status, creatorSig, hostSig, summaryNote]); // eslint-disable-line

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      creator: profile?.full_name || '',
      host: '',
      property_name: '',
      location: '',
      dates: '',
      deliverables: '',
      currency: 'USD',
      paymentAmount: '',
      isFreeStay: false,
      usageRights: '',
    });
    setStatus('draft');
    setCreatorSig('');
    setHostSig('');
    setSummaryNote('');
    setEditingId(null);
    setSendSuccess(false);
    setIsSent(false);
    try { localStorage.removeItem(FORM_DRAFT_KEY); } catch {}
  };

  const loadContract = (c) => {
    const isFreeStay = c.currency === FREE_STAY_VALUE || c.payment === 'Free Stay';
    setForm({
      creator: c.creator_name || '',
      host: c.host_name || '',
      property_name: c.property_name || '',
      location: c.location || '',
      dates: c.dates || '',
      deliverables: c.deliverables || '',
      currency: isFreeStay ? 'USD' : (c.currency || 'USD'),
      paymentAmount: isFreeStay ? '' : (c.payment === 'Free Stay' ? '' : c.payment || ''),
      isFreeStay,
      usageRights: c.usage_rights || '',
    });
    setStatus(c.status || 'draft');
    setCreatorSig(c.creator_signed ? (c.creator_name || profile?.full_name || 'Creator') : '');
    setHostSig(c.host_signed ? (c.host_name || profile?.full_name || 'Host') : '');
    setSummaryNote(c.summary_note || generateSummary());
    setEditingId(c.id);
    setShowList(false);
    setSendSuccess(false);
    setIsSent(Boolean(c.sent_at));
  };

  const computePaymentDisplay = () => {
    if (form.isFreeStay) return 'Free Stay';
    if (form.currency && form.paymentAmount) return `${form.currency} ${form.paymentAmount}`;
    return '';
  };

  const computeUsageDisplay = () => {
    if (!form.usageRights) return '';
    const found = USAGE_RIGHTS.find((u) => u.value === form.usageRights);
    return found ? found.label : form.usageRights;
  };

  const buildContractData = () => ({
    creator_name: form.creator,
    host_name: form.host,
    property_name: form.property_name,
    location: form.location,
    dates: form.dates,
    deliverables: form.deliverables,
    currency: form.isFreeStay ? FREE_STAY_VALUE : form.currency,
    payment: computePaymentDisplay(),
    usage_rights: computeUsageDisplay(),
    summary_note: summaryNote,
    status,
    creator_signed: !!creatorSig,
    host_signed: !!hostSig,
  });

  const saveCurrentContract = async () => {
    const contractData = buildContractData();

    if (editingId) {
      updateContract(editingId, contractData);
    } else {
      const saved = saveContract(contractData);
      setEditingId(saved.id);
    }
  };

  const signAsCreator = () => {
    const name = profile?.full_name || form.creator;
    if (!name) return;
    setCreatorSig(name);
    if (hostSig) setStatus('in_progress');
    else setStatus('pending');
  };

  const signAsHost = () => {
    const name = selectedHost?.name || form.host;
    if (!name) {
      window.alert('Please send this contract to a host first.');
      return;
    }
    setHostSig(name);
    if (creatorSig) setStatus('in_progress');
    else setStatus('pending');
  };

  // Auto-detect status when both sigs are set
  useEffect(() => {
    if (creatorSig && hostSig && status !== 'in_progress') {
      setStatus('in_progress');
    } else if ((creatorSig || hostSig) && status === 'draft') {
      setStatus('pending');
    }
  }, [creatorSig, hostSig, status]);

  // Handle Stripe payment redirect return
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get('payment');
    const setupStatus = params.get('setup');
    const sessionId = params.get('session_id');
    if (setupStatus === 'success') {
      // Card saved at signing — persist it to the contract; the fee is charged
      // automatically when the collaboration completes.
      setCardSaved(true);
      setShowPaymentModal(false);
      if (sessionId) verifyFeeSetupSession({ sessionId }).catch(() => {});
      navigate('/contract', { replace: true });
    } else if (setupStatus === 'cancelled') {
      setPaymentCancelled(true);
      navigate('/contract', { replace: true });
    } else if (paymentStatus === 'success') {
      setContractPaid(true);
      setShowPaymentModal(false);
      navigate('/contract', { replace: true });
    } else if (paymentStatus === 'cancelled') {
      setPaymentCancelled(true);
      navigate('/contract', { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show payment modal when both parties have signed and contract is unpaid.
  // Founding member hosts skip the payment entirely.
  useEffect(() => {
    if (creatorSig && hostSig && !contractPaid && !cardSaved) {
      if (profile?.is_founder) {
        setContractPaid(true);
        setFounderToast(true);
        setTimeout(() => setFounderToast(false), 4000);
      } else {
        setShowPaymentModal(true);
      }
    }
  }, [creatorSig, hostSig, contractPaid, cardSaved, profile?.is_founder]);

  const downloadPDF = async () => {
    if (!previewRef.current) return;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const stamp = dateStamp();
      const creatorName = form.creator?.replace(/\s+/g, '_') || 'Creator';
      const hostName = form.host?.replace(/\s+/g, '_') || 'Host';
      const fileName = `Contract_${stamp}_${creatorName}_${hostName}.pdf`;

      html2pdf()
        .set({
          margin:      8,
          filename:    fileName,
          image:       { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, letterRendering: true, useCORS: true },
          jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(previewRef.current)
        .save(fileName);
    } catch (err) {
      console.error('PDF download error:', err);
    }
  };

  const handleSendToHost = async (host) => {
    setSelectedHost(host);
    updateField('host', host.name);
    // Save first
    let id = editingId;
    if (!id) {
      const saved = saveContract(buildContractData());
      id = saved.id;
    } else {
      updateContract(id, buildContractData());
    }

    // Update status to pending, stamping the real host id when we have one so the
    // server can resolve the recipient directly (instead of by name match).
    setStatus('pending');
    updateContract(id, {
      ...buildContractData(),
      status: 'pending',
      ...(host.isReal ? { host_id: host.id } : {}),
    });

    // Create a message thread
    sendContractMessage({
      hostName: host.name,
      contractId: id,
      contractTitle: form.property_name || form.creator || 'Contract',
    });

    markContractSent(id);
    setIsSent(true);
    setSendSuccess(true);
    try { localStorage.removeItem(FORM_DRAFT_KEY); } catch {}
    setTimeout(() => {
      setShowSendModal(false);
      setSendSuccess(false);
    }, 2000);
  };

  const fieldEntries = [
    { key: 'creator', label: 'Creator name' },
    { key: 'host', label: 'Host name' },
    { key: 'property_name', label: 'Property name' },
    { key: 'location', label: 'Location' },
    { key: 'dates', label: 'Dates' },
    { key: 'deliverables', label: 'Deliverables' },
  ];

  return (
    <div className="min-h-dvh bg-bone px-4 py-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Back + contract list toggle */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-sage hover:text-ink transition-colors flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <button
            onClick={() => { setShowList(!showList); resetForm(); }}
            className="text-sm text-sage hover:text-ink transition-colors font-semibold"
          >
            {showList ? 'New Contract' : `Saved Contracts (${contractList.length})`}
          </button>
        </div>

        {/* ── SAVED CONTRACTS LIST ── */}
        {showList && (
          <div className="mb-6">
            <div className="glass-card p-6">
              <h2 className="font-display font-bold text-ink text-lg mb-4">Your Contracts</h2>
              {contractList.length === 0 ? (
                <p className="text-sage text-sm">No contracts saved yet.</p>
              ) : (
                <div className="space-y-3">
                  {contractList.map((c) => {
                    const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
                    return (
                      <button
                        key={c.id}
                        onClick={() => loadContract(c)}
                        className="w-full flex items-center justify-between p-4 rounded-xl bg-white/60 border border-stone/30 hover:bg-white/90 hover:border-mint transition-all text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink text-sm truncate">{c.property_name || c.creator_name || 'Untitled'}</p>
                          <p className="text-xs text-sage mt-0.5">{c.dates || c.location || 'No details'}</p>
                        </div>
                        <span className={`ml-3 text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${sc.bg}`}>
                          {sc.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {!showList && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* ── FORM SIDE (1/3) ── */}
            <div className="w-full lg:w-1/3">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display font-bold text-ink text-lg">
                    {editingId ? 'Edit Contract' : 'Build Contract'}
                  </h2>
                  {saveStatus !== 'idle' && (
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600,
                      color: saveStatus === 'saved' ? '#4A9B7F' : 'var(--sage)',
                      transition: 'color 200ms',
                    }}>
                      {saveStatus === 'saving' ? 'Saving…' : 'Saved ✓'}
                    </span>
                  )}
                </div>

                {fieldEntries.map(({ key, label }) => (
                  <div key={key} className="mb-3">
                    <label className="block text-xs font-semibold text-sage uppercase tracking-wider mb-1">
                      {label}
                    </label>
                    <input
                      placeholder={label}
                      value={form[key]}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone/50 bg-white/60 text-ink text-sm
                                 placeholder:text-sage/60 outline-none transition-colors
                                 focus:border-mint focus:bg-white focus:shadow-sm"
                    />
                  </div>
                ))}

                {/* ── Currency / Payment ── */}
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-sage uppercase tracking-wider mb-1">
                    Payment / Compensation
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <select
                      value={form.isFreeStay ? FREE_STAY_VALUE : form.currency}
                      onChange={(e) => {
                        if (e.target.value === FREE_STAY_VALUE) {
                          updateField('isFreeStay', true);
                        } else {
                          updateField('isFreeStay', false);
                          updateField('currency', e.target.value);
                        }
                      }}
                      className="px-3 py-2 rounded-xl border border-stone/50 bg-white/60 text-ink text-sm
                                 outline-none transition-colors focus:border-mint focus:bg-white"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      {/* Legacy contracts only — stay-only compensation can no longer be selected */}
                      {form.isFreeStay && <option value={FREE_STAY_VALUE}>Free Stay</option>}
                    </select>
                    {!form.isFreeStay && (
                      <input
                        type="text"
                        placeholder="Amount"
                        value={form.paymentAmount}
                        onChange={(e) => updateField('paymentAmount', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-stone/50 bg-white/60 text-ink text-sm
                                   placeholder:text-sage/60 outline-none transition-colors
                                   focus:border-mint focus:bg-white focus:shadow-sm"
                      />
                    )}
                    {form.isFreeStay && (
                      <span className="flex-1 px-3 py-2 text-sm font-semibold text-ink bg-mint/40 rounded-xl">
                        Free Stay
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Usage Rights Dropdown ── */}
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-sage uppercase tracking-wider mb-1">
                    Usage Rights
                  </label>
                  <select
                    value={form.usageRights}
                    onChange={(e) => updateField('usageRights', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone/50 bg-white/60 text-ink text-sm
                               outline-none transition-colors focus:border-mint focus:bg-white"
                  >
                    <option value="">Select usage rights…</option>
                    {USAGE_RIGHTS.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>

                {/* ── Auto-generated summary note ── */}
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-sage uppercase tracking-wider mb-1">
                    Summary Note
                  </label>
                  <textarea
                    value={summaryNote}
                    onChange={(e) => setSummaryNote(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl border border-stone/50 bg-white/60 text-ink text-sm
                               placeholder:text-sage/60 outline-none transition-colors resize-y
                               focus:border-mint focus:bg-white focus:shadow-sm"
                  />
                  <p className="text-[0.6rem] text-sage/70 mt-1">Auto-generated from your fields — edit freely.</p>
                </div>

                {/* Save / New buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={saveCurrentContract}
                    className="btn-primary flex-1"
                  >
                    Save Contract
                  </button>
                  {editingId && (
                    <button
                      onClick={resetForm}
                      className="btn-glass text-sm"
                    >
                      New
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── PREVIEW SIDE (2/3) ── */}
            <div className="w-full lg:w-2/3">
              <div className="glass-card p-6 lg:p-8">
                {/* Contract preview — A4 layout */}
                <div
                  ref={previewRef}
                  id="contract-preview"
                  className="space-y-4"
                  style={{
                    padding: '1.75rem 2.25rem',
                    borderRadius: '1.25rem',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    background: `
                      radial-gradient(circle at 20% 25%, rgba(209,235,219,0.12) 0%, transparent 50%),
                      radial-gradient(circle at 85% 75%, rgba(239,236,233,0.25) 0%, transparent 40%),
                      repeating-linear-gradient(
                        0deg, transparent, transparent 12px,
                        rgba(60,87,89,0.018) 12px, rgba(60,87,89,0.018) 13px
                      ),
                      repeating-linear-gradient(
                        90deg, transparent, transparent 12px,
                        rgba(60,87,89,0.018) 12px, rgba(60,87,89,0.018) 13px
                      ),
                      #fff
                    `,
                  }}
                >
                  {/* ── Profile icons + names row ── */}
                  <div className="flex items-center justify-center gap-8 mb-3">
                    {/* Creator slot — always populated from logged-in profile */}
                    <div className="flex flex-col items-center gap-2">
                      <div style={{
                        width: 52, height: 52, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #D1EBDB, #959D90)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(60,87,89,0.18)',
                        border: '2px solid rgba(209,235,219,0.6)',
                      }}>
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={form.creator}
                            style={{ width: 52, height: 52, objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', fontFamily: '"Cabinet Grotesk", sans-serif' }}>
                            {form.creator ? form.creator.charAt(0).toUpperCase() : 'C'}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-ink text-center leading-tight">
                        {form.creator || 'Creator'}
                      </span>
                      <span className="text-[10px] text-sage uppercase tracking-wider">Creator</span>
                    </div>

                    <span className="text-sage text-lg font-bold" style={{ fontFamily: '"Cabinet Grotesk", sans-serif' }}>×</span>

                    {/* Host slot — ghost until host signs, then shows host avatar */}
                    <div className="flex flex-col items-center gap-2">
                      <div style={{
                        width: 52, height: 52, borderRadius: '50%',
                        background: hostSig
                          ? 'linear-gradient(135deg, #3C5759, #192524)'
                          : 'rgba(60,87,89,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', flexShrink: 0,
                        boxShadow: hostSig ? '0 2px 8px rgba(60,87,89,0.18)' : 'none',
                        border: hostSig
                          ? '2px solid rgba(60,87,89,0.25)'
                          : '2px dashed rgba(60,87,89,0.25)',
                        transition: 'all 0.35s ease',
                      }}>
                        {hostSig && selectedHost?.avatar ? (
                          <img
                            src={selectedHost.avatar}
                            alt={form.host}
                            style={{ width: 52, height: 52, objectFit: 'cover' }}
                          />
                        ) : hostSig ? (
                          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', fontFamily: '"Cabinet Grotesk", sans-serif' }}>
                            {form.host ? form.host.charAt(0).toUpperCase() : 'H'}
                          </span>
                        ) : (
                          /* Ghost placeholder — awaiting host */
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(60,87,89,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-center leading-tight" style={{ color: hostSig ? 'var(--ink)' : 'var(--sage)' }}>
                        {form.host || 'Awaiting Host'}
                      </span>
                      <span className="text-[10px] text-sage uppercase tracking-wider">Host</span>
                    </div>
                  </div>

                  <h2 className="font-display font-bold text-ink text-xl border-b border-stone/30 pb-2 text-center">
                    Collabnb Agreement
                  </h2>

                  {/* ── Summary details grid ── */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    {[
                      ['Location', form.location],
                      ['Dates', form.dates],
                      ['Property', form.property_name],
                      ['Deliverables', form.deliverables],
                      ['Payment', computePaymentDisplay() || '—'],
                      ['📋 Usage', computeUsageDisplay() || '—'],
                    ].map(([icon, val]) => (
                      <div key={icon} className="bg-bone/50 rounded-xl px-3 py-2">
                        <span className="text-sage text-xs uppercase tracking-wider block mb-0.5">{icon}</span>
                        <span className="text-ink font-semibold">{val || '—'}</span>
                      </div>
                    ))}
                  </div>

                  {/* ── Summary paragraph with bolded key terms ── */}
                  {summaryNote && (
                    <p className="text-sm text-ink/80 leading-relaxed px-1">
                      {(() => {
                        const boldTerms = [
                          form.creator, form.host, form.property_name,
                          form.location, form.dates,
                        ].filter(Boolean);
                        const escaped = boldTerms
                          .sort((a, b) => b.length - a.length)
                          .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                        const regex = new RegExp('(' + escaped.join('|') + ')', 'gi');
                        const segments = summaryNote.split(regex);
                        return segments.map((seg, i) =>
                          boldTerms.some(t => t.toLowerCase() === seg.toLowerCase())
                            ? <strong key={i} className="text-ink font-semibold">{seg}</strong>
                            : seg
                        );
                      })()}
                    </p>
                  )}

                  <hr className="border-stone/30" />

                  {/* ── Signatures (calligraphy style) ── */}
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                      <span className="text-sage text-xs uppercase tracking-wider block mb-1">Creator Signature</span>
                      <span style={{
                        fontFamily: creatorSig ? '"Pacifico", "Brush Script MT", cursive' : 'inherit',
                        fontSize: creatorSig ? '1.15rem' : 'inherit',
                        fontWeight: creatorSig ? 400 : 600,
                        color: creatorSig ? '#192524' : undefined,
                      }}>
                        {creatorSig || 'Pending'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sage text-xs uppercase tracking-wider block mb-1">Host Signature</span>
                      <span style={{
                        fontFamily: hostSig ? '"Pacifico", "Brush Script MT", cursive' : 'inherit',
                        fontSize: hostSig ? '1.15rem' : 'inherit',
                        fontWeight: hostSig ? 400 : 600,
                        color: hostSig ? '#192524' : undefined,
                      }}>
                        {hostSig || 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Collabnb logo */}
                  <div className="flex justify-end items-center gap-2 pt-2 border-t border-stone/15">
                    <span className="text-xs text-sage/80 font-semibold tracking-wide" style={{ fontFamily: '"Cabinet Grotesk", sans-serif' }}>
                      Collabnb
                    </span>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'var(--mint)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* ── Action buttons ── */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {/* Creator signs */}
                  {!creatorSig && (
                    <button onClick={signAsCreator} className="btn-primary">
                      Sign as Creator
                    </button>
                  )}

                  {/* Host signs (only when contract has been sent to them / is pending) */}
                  {(status === 'pending' || status === 'draft') && !hostSig && creatorSig && (
                    <button onClick={signAsHost} className="btn-glass">
                      Sign &amp; Accept
                    </button>
                  )}

                  {/* Send button — role-aware, shows sent state once dispatched */}
                  {(isSent || (creatorSig && !hostSig && status !== 'in_progress')) && (
                    <button
                      disabled={isSent}
                      onClick={isSent ? undefined : () => setShowSendModal(true)}
                      className="btn-glass"
                      style={isSent ? {
                        background: 'rgba(74,155,127,0.12)',
                        borderColor: 'rgba(74,155,127,0.3)',
                        color: '#2d7d5e',
                        cursor: 'default',
                        opacity: 1,
                      } : undefined}
                    >
                      {isSent ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          {profile?.role === 'host' ? 'Sent to Creator ✓' : 'Sent to Host ✓'}
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                          </svg>
                          {profile?.role === 'host' ? 'Send to Creator' : 'Send to Host'}
                        </>
                      )}
                    </button>
                  )}

                  <button onClick={downloadPDF} className="btn-glass">
                    Download PDF
                  </button>

                  {/* Save a card at signing; the platform fee is charged on completion */}
                  {status === 'in_progress' && !contractPaid && !cardSaved && (
                    <button onClick={() => setShowPaymentModal(true)} className="btn-primary">
                      Save Card for Fee
                    </button>
                  )}
                </div>

                {/* ── Status ── */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sage text-xs uppercase tracking-wider">Status:</span>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    STATUS_CONFIG[status]?.bg || STATUS_CONFIG.draft.bg
                  }`}>
                    {STATUS_CONFIG[status]?.label || status}
                  </span>
                  {status === 'pending' && (
                    <span className="text-xs text-sage ml-2">
                      (needs {!creatorSig ? 'creator ' : ''}{!hostSig ? 'host ' : ''}signature)
                    </span>
                  )}
                  {status === 'in_progress' && (
                    <span className="text-xs text-green-600 ml-2 flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Both parties signed
                    </span>
                  )}
                  {contractPaid && (
                    <span className="text-xs text-green-700 ml-2 flex items-center gap-1 font-semibold">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Payment confirmed
                    </span>
                  )}
                  {cardSaved && !contractPaid && (
                    <span className="text-xs text-green-700 ml-2 flex items-center gap-1 font-semibold">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Card saved — fee charged on completion
                    </span>
                  )}
                  {paymentCancelled && !contractPaid && !cardSaved && (
                    <span className="text-xs text-amber-600 ml-2">
                      Cancelled — click "Save Card for Fee" to retry
                    </span>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Founder toast (auto-dismisses) ── */}
      {founderToast && (
        <div style={{
          position: 'fixed', bottom: '5.5rem', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 350,
          background: 'linear-gradient(135deg, rgba(212,168,67,0.97), rgba(194,148,47,0.95))',
          backdropFilter: 'blur(12px)',
          borderRadius: '1rem',
          padding: '0.75rem 1.375rem',
          color: '#4A2E00',
          fontWeight: 700,
          fontSize: '0.875rem',
          boxShadow: '0 8px 28px rgba(212,168,67,0.4)',
          whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontFamily: 'var(--font-body)',
          animation: 'collabnb-fadein 0.25s ease',
        }}>
          <svg viewBox='0 0 16 16' width='14' height='14' fill='#4A2E00'>
            <path d='M8 1.5l1.67 3.38 3.73.54-2.7 2.63.64 3.72L8 9.77l-3.34 1.76.64-3.72L2.6 5.42l3.73-.54z'/>
          </svg>
          Founding member — no platform fee
        </div>
      )}

      {/* ── Payment modal ── */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        fee={form.isFreeStay ? 20 : Math.max((parseFloat(form.paymentAmount) || 0) * 0.05, 20)}
        isFreeStay={form.isFreeStay}
        cashAmount={parseFloat(form.paymentAmount) || 0}
        contractId={editingId || 'draft'}
      />

      {/* ── Send to Host modal ── */}
      {showSendModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(25,37,36,0.4)', backdropFilter: 'blur(6px)',
          }}
          onClick={() => { if (!sendSuccess) setShowSendModal(false); }}
        >
          <div
            className="glass"
            style={{
              width: '100%', maxWidth: '460px',
              borderRadius: '1.5rem', padding: '2rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {sendSuccess ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(209,235,219,0.8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1rem', fontSize: '1.5rem', color: '#2d6a4f',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', margin: '0 0 0.5rem' }}>
                  Contract Sent!
                </h4>
                <p style={{ color: 'var(--sage)', fontSize: '0.875rem', margin: 0 }}>
                  A message has been created in your Inbox.
                </p>
              </div>
            ) : (
              <>
                <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
                  {profile?.role === 'host' ? 'Send Contract to Creator' : 'Send Contract to Host'}
                </h4>
                <p style={{ color: 'var(--sage)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  {profile?.role === 'host'
                    ? `Send this contract to ${form.creator || 'the creator'}. It will appear in their Inbox.`
                    : 'Select a host to send this contract to. It will appear in your Inbox.'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {profile?.role === 'host' ? (
                    <button
                      onClick={() => handleSendToHost({ id: 'creator', name: form.creator || 'Creator', avatar: null, properties: [] })}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-stone/30 hover:bg-white/90 hover:border-mint transition-all text-left"
                      style={{ fontFamily: 'var(--font-body)', cursor: 'pointer' }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--slate)' }}>
                        {(form.creator || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)', margin: 0 }}>{form.creator || 'Creator'}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>Send contract for review & signature</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--sage)', flexShrink: 0 }}>
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </button>
                  ) : (
                    sendHosts.map((host) => (
                      <button
                        key={host.id}
                        onClick={() => handleSendToHost(host)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-stone/30
                                   hover:bg-white/90 hover:border-mint transition-all text-left"
                        style={{ fontFamily: 'var(--font-body)', cursor: 'pointer' }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem' }}>
                          {host.avatar ? (
                            <img src={host.avatar} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            host.name.charAt(0)
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)', margin: 0 }}>{host.name}</p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>{host.subtitle || (host.properties || []).join(', ')}</p>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--sage)', flexShrink: 0 }}>
                          <line x1="22" y1="2" x2="11" y2="13"/>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                      </button>
                    ))
                  )}
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <button
                    onClick={() => setShowSendModal(false)}
                    className="text-sm text-sage hover:text-ink transition-colors"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
