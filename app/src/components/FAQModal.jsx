import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

// ─── Accordion item ────────────────────────────────────────────────────────────
function AccordionItem({ q, a, visible }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef(null);

  if (!visible) return null;

  return (
    <div style={{ borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', textAlign: 'left', padding: '0.875rem 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1rem', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600,
          color: 'var(--ink)',
        }}
      >
        <span>{q}</span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{
            flexShrink: 0, color: 'var(--slate)',
            transition: 'transform 200ms',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        ref={bodyRef}
        style={{
          overflow: 'hidden',
          maxHeight: open ? '400px' : '0',
          transition: 'max-height 250ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <p style={{
          fontSize: '0.875rem', color: 'var(--slate)', lineHeight: 1.75,
          paddingBottom: '1rem', whiteSpace: 'pre-line',
        }}>
          {a}
        </p>
      </div>
    </div>
  );
}

// ─── Matching: tokenized AND-match across question + answer + keyword aliases ──
function itemMatches(item, tokens) {
  if (tokens.length === 0) return true;
  const haystack = `${item.q} ${item.a} ${(item.keywords || []).join(' ')}`.toLowerCase();
  return tokens.every((tok) => haystack.includes(tok));
}

// ─── Ask-a-question CTA (shown when no FAQ or community answer matches) ────────
function AskQuestionCTA({ search, profile }) {
  const { t } = useTranslation('faqModal');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [question, setQuestion] = useState(search);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitMessage = useMutation(api.messages.submitMessage);

  useEffect(() => { setQuestion(search); }, [search]);

  const inputStyle = {
    width: '100%', padding: '0.65rem 0.85rem',
    background: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(25,37,36,0.1)',
    borderRadius: '0.625rem',
    fontFamily: 'var(--font-body)', fontSize: '0.85rem',
    color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || submitting) return;
    setSubmitting(true);
    try {
      await submitMessage({
        name: name || 'Anonymous',
        email,
        category: 'FAQ Question',
        message: question.trim(),
        add_to_faq: true,
      });
      setSent(true);
    } catch {}
    setSubmitting(false);
  };

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: 'rgba(209,235,219,0.25)', borderRadius: '0.875rem', border: '1px solid rgba(74,155,127,0.2)' }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.3rem' }}>
          {t('askQuestion.postedHeading')}
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--slate)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
          {t('askQuestion.postedBody')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '1.75rem 1rem', border: '1px dashed rgba(25,37,36,0.15)', borderRadius: '0.875rem' }}>
      <p style={{ fontSize: '0.875rem', color: 'var(--slate)', marginBottom: '0.875rem' }}>
        {search ? t('askQuestion.noMatchQuoted', { search }) : t('askQuestion.noneFound')}
      </p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: '0.65rem 1.25rem', background: 'var(--ink)', color: 'var(--bone)',
            borderRadius: '999px', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 700,
          }}
        >
          {t('askQuestion.askButton')}
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', textAlign: 'left', maxWidth: 360, margin: '0 auto' }}>
          <textarea
            required value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2} placeholder={t('askQuestion.questionPlaceholder')}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            <input type="text" required placeholder={t('askQuestion.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <input type="email" required placeholder={t('askQuestion.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: 0, lineHeight: 1.5 }}>
            {t('askQuestion.publicNotice')}
          </p>
          <button
            type="submit"
            disabled={submitting || !question.trim()}
            style={{
              padding: '0.7rem', background: 'var(--ink)', color: 'var(--bone)',
              borderRadius: '999px', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 700,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? t('askQuestion.posting') : t('askQuestion.postQuestion')}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Community question item (submitted via "Ask this as a question") ─────────
function CommunityQuestionItem({ question, answer, answered_at }) {
  const { t } = useTranslation('faqModal');
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
      <button
        onClick={() => answer && setOpen((o) => !o)}
        style={{
          width: '100%', textAlign: 'left', padding: '0.875rem 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1rem', background: 'none', border: 'none', cursor: answer ? 'pointer' : 'default',
          fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600,
          color: 'var(--ink)',
        }}
      >
        <span>{question}</span>
        {answer ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ flexShrink: 0, color: 'var(--slate)', transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        ) : (
          <span style={{ flexShrink: 0, fontSize: '0.68rem', fontWeight: 700, color: '#92400E', background: 'rgba(212,168,67,0.15)', padding: '0.2rem 0.5rem', borderRadius: '999px', whiteSpace: 'nowrap' }}>
            {t('communityQuestions.awaitingAnswer')}
          </span>
        )}
      </button>
      {answer && (
        <div style={{ overflow: 'hidden', maxHeight: open ? '400px' : '0', transition: 'max-height 250ms cubic-bezier(0.16,1,0.3,1)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate)', lineHeight: 1.75, paddingBottom: '1rem', whiteSpace: 'pre-line' }}>
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 1: FAQ ────────────────────────────────────────────────────────────────
function FAQTab({ profile }) {
  const { t } = useTranslation('faqModal');
  const [search, setSearch] = useState('');
  const term = search.toLowerCase().trim();
  const tokens = term ? term.split(/\s+/).filter(Boolean) : [];

  const communityQuestions = useQuery(api.messages.getFaqQuestions) || [];
  const visibleCommunity = communityQuestions.filter((c) =>
    tokens.length === 0 || itemMatches({ q: c.question, a: c.answer || '' }, tokens)
  );

  const faqSections = t('faqSections', { returnObjects: true });
  const sectionsWithVisibility = faqSections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      visible: itemMatches(item, tokens),
    })),
  })).filter((s) => s.items.some((i) => i.visible));

  const noResults = sectionsWithVisibility.length === 0 && visibleCommunity.length === 0;

  return (
    <div>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--sage)', pointerEvents: 'none' }}
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder={t('search.placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '0.7rem 0.9rem 0.7rem 2.5rem',
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(25,37,36,0.1)',
            borderRadius: '0.75rem',
            fontFamily: 'var(--font-body)', fontSize: '0.875rem',
            color: 'var(--ink)', outline: 'none',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.25)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.1)'; }}
        />
      </div>

      {/* Sections */}
      {noResults ? (
        <AskQuestionCTA search={search} profile={profile} />
      ) : (
        <>
          {sectionsWithVisibility.map((section) => (
            <div key={section.title} style={{ marginBottom: '1.5rem' }}>
              <p style={{
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--sage)', marginBottom: '0.25rem',
              }}>
                {section.title}
              </p>
              {section.items.map((item) => (
                <AccordionItem key={item.q} q={item.q} a={item.a} visible={item.visible} />
              ))}
            </div>
          ))}

          {visibleCommunity.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--sage)', marginBottom: '0.25rem',
              }}>
                {t('communityQuestions.heading')}
              </p>
              {visibleCommunity.map((c) => (
                <CommunityQuestionItem key={c._id} question={c.question} answer={c.answer} answered_at={c.answered_at} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab 2: Send a Message ─────────────────────────────────────────────────────
function MessageTab({ profile }) {
  const { t } = useTranslation('faqModal');
  const CATEGORIES = [
    t('messageTab.categories.bugReport'),
    t('messageTab.categories.featureRequest'),
    t('messageTab.categories.accountHelp'),
    t('messageTab.categories.generalQuestion'),
    t('messageTab.categories.other'),
  ];
  const [name, setName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitMessage = useMutation(api.messages.submitMessage);

  // Previous messages from this user (to show admin replies)
  const prevMessages = useQuery(
    api.messages.getMessagesByEmail,
    profile?.email ? { email: profile.email } : 'skip'
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitMessage({ name, email, category: category || undefined, message });
    } catch {}
    setSubmitting(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(209,235,219,0.7)', border: '1px solid rgba(74,155,127,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.125rem',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
          {t('messageTab.sentHeading')}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--slate)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
          {t('messageTab.sentBody')}
        </p>
      </div>
    );
  }

  const inputStyle = {
    width: '100%', padding: '0.7rem 0.9rem',
    background: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(25,37,36,0.1)',
    borderRadius: '0.75rem',
    fontFamily: 'var(--font-body)', fontSize: '0.875rem',
    color: 'var(--ink)', outline: 'none',
  };

  return (
    <>
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate)', marginBottom: '0.375rem' }}>{t('messageTab.nameLabel')}</label>
          <input
            type="text" required value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.25)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.1)'; }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate)', marginBottom: '0.375rem' }}>{t('messageTab.emailLabel')}</label>
          <input
            type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.25)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.1)'; }}
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate)', marginBottom: '0.375rem' }}>{t('messageTab.categoryLabel')}</label>
        <select
          value={category} onChange={(e) => setCategory(e.target.value)}
          style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
        >
          <option value="">{t('messageTab.categoryPlaceholder')}</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate)', marginBottom: '0.375rem' }}>{t('messageTab.messageLabel')}</label>
        <textarea
          required value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5} placeholder={t('messageTab.messagePlaceholder')}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.25)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.1)'; }}
        />
      </div>

      <button
        type="submit"
        style={{
          padding: '0.85rem', background: 'var(--ink)', color: 'var(--bone)',
          borderRadius: '999px', fontFamily: 'var(--font-body)', fontSize: '0.95rem',
          fontWeight: 700, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
          transition: 'opacity 150ms', marginTop: '0.25rem',
          opacity: submitting ? 0.7 : 1,
        }}
        onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.opacity = '0.88'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = submitting ? '0.7' : '1'; }}
      >
        {submitting ? t('messageTab.sending') : t('messageTab.sendMessage')}
      </button>
    </form>

    {/* ── Previous messages + admin replies ── */}
    {prevMessages && prevMessages.length > 0 && (
      <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(25,37,36,0.07)', paddingTop: '1.25rem' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
          {t('messageTab.previousMessages')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {prevMessages.map((m) => (
            <div key={m._id} style={{ borderRadius: '0.625rem', border: '1px solid rgba(25,37,36,0.07)', overflow: 'hidden' }}>
              {/* User's original message */}
              <div style={{ padding: '0.625rem 0.875rem', background: '#F7F5F2' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--slate)', marginBottom: '0.25rem' }}>
                  {m.category && <span style={{ fontWeight: 600, marginRight: '0.4rem' }}>{m.category}</span>}
                  {new Date(m._creationTime).toLocaleDateString()}
                </div>
                <p style={{ fontSize: '0.83rem', color: 'var(--ink)', margin: 0, lineHeight: 1.55 }}>{m.message}</p>
              </div>
              {/* Admin reply (if any) */}
              {m.admin_reply ? (
                <div style={{ padding: '0.625rem 0.875rem', background: 'rgba(209,235,219,0.25)', borderTop: '1px solid rgba(74,155,127,0.15)' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2d6a4f', marginBottom: '0.25rem' }}>
                    {t('messageTab.supportPrefix')} · {m.admin_reply_at ? new Date(m.admin_reply_at).toLocaleDateString() : ''}
                  </div>
                  <p style={{ fontSize: '0.83rem', color: 'var(--ink)', margin: 0, lineHeight: 1.55 }}>{m.admin_reply}</p>
                </div>
              ) : (
                <div style={{ padding: '0.5rem 0.875rem', background: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(25,37,36,0.05)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>{t('messageTab.awaitingReply')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
    </>
  );
}

// ─── Tab 3: Suggestions ────────────────────────────────────────────────────────
function SuggestionsTab({ userId }) {
  const { t } = useTranslation('faqModal');
  const suggestions = useQuery(api.suggestions.getSuggestions, { userId: userId || undefined });
  const seedMutation = useMutation(api.suggestions.seedSuggestions);
  const voteMutation = useMutation(api.suggestions.vote);
  const submitMutation = useMutation(api.suggestions.submitSuggestion);

  const [newText, setNewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true;
      seedMutation();
    }
  }, [seedMutation]);

  const handleVote = async (suggestionId, direction) => {
    if (!userId) return;
    await voteMutation({ suggestionId, userId, direction });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = newText.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await submitMutation({ text: trimmed, userId: userId || undefined });
      setNewText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '0.375rem' }}>
          {t('suggestions.heading')}
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--slate)' }}>
          {t('suggestions.subtitle')}
        </p>
      </div>

      {/* Suggestion cards */}
      {suggestions === undefined ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ width: 20, height: 20, border: '2px solid #D1EBDB', borderTopColor: '#3C5759', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {suggestions.map((s) => (
            <div
              key={s._id}
              style={{
                padding: '1rem 1.125rem',
                background: 'rgba(255,255,255,0.65)',
                border: '1px solid rgba(255,255,255,0.7)',
                borderRadius: '1rem',
                display: 'flex', alignItems: 'center', gap: '0.875rem',
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--ink)', lineHeight: 1.55, margin: 0 }}>
                  {s.text}
                </p>
                {s.status === 'approved' && (
                  <span style={{ fontSize: '0.7rem', color: '#92400E', background: 'rgba(212,168,67,0.15)', padding: '0.1rem 0.45rem', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.35rem' }}>
                    <svg viewBox="0 0 16 16" width="8" height="8" fill="currentColor"><path d="M8 1l1.85 3.75L14 5.5l-3 2.92.7 4.08L8 10.4l-3.7 2.1.7-4.08L2 5.5l4.15-.75z"/></svg>
                    {t('suggestions.featured')}
                  </span>
                )}
                {s.status === 'implemented' && (
                  <span style={{ fontSize: '0.7rem', color: '#166534', background: '#D1FAE5', padding: '0.1rem 0.45rem', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.35rem' }}>
                    <svg viewBox="0 0 16 16" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 8 6.5 11.5 13 4.5"/></svg>
                    {t('suggestions.implemented')}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem', flexShrink: 0, minWidth: 32 }}>
                {/* Upvote only (no downvote) */}
                <button
                  onClick={() => handleVote(s._id, 'up')}
                  title={userId ? t('suggestions.upvoteTitle') : t('suggestions.signInToVoteTitle')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28,
                    borderRadius: '0.5rem', border: 'none', cursor: userId ? 'pointer' : 'default',
                    background: s.userVote === 'up' ? 'rgba(209,235,219,0.85)' : 'transparent',
                    color: s.userVote === 'up' ? '#2d6a4f' : 'var(--slate)',
                    transition: 'background 150ms',
                    opacity: !userId ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => { if (userId) e.currentTarget.style.background = s.userVote === 'up' ? 'rgba(209,235,219,0.85)' : 'rgba(25,37,36,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = s.userVote === 'up' ? 'rgba(209,235,219,0.85)' : 'transparent'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill={s.userVote === 'up' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>

                {/* Upvote tally (raw count) */}
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700,
                  color: s.upvotes > 0 ? '#2d6a4f' : 'var(--sage)',
                  lineHeight: 1, textAlign: 'center', minWidth: 20,
                }}>
                  {s.upvotes}
                </span>
            </div>
          </div>
          ))}
        </div>
      )}

      {/* Submit new suggestion */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={t('suggestions.placeholder')}
          maxLength={200}
          style={{
            flex: 1, padding: '0.7rem 0.9rem',
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(25,37,36,0.1)',
            borderRadius: '0.75rem',
            fontFamily: 'var(--font-body)', fontSize: '0.875rem',
            color: 'var(--ink)', outline: 'none',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.25)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.1)'; }}
        />
        <button
          type="submit"
          disabled={!newText.trim() || submitting}
          style={{
            padding: '0.7rem 1.25rem',
            background: newText.trim() ? 'var(--ink)' : 'rgba(25,37,36,0.12)',
            color: newText.trim() ? 'var(--bone)' : 'var(--sage)',
            borderRadius: '0.75rem', border: 'none', cursor: newText.trim() ? 'pointer' : 'default',
            fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600,
            transition: 'background 150ms, color 150ms', whiteSpace: 'nowrap',
          }}
        >
          {submitting ? t('suggestions.submitting') : t('suggestions.submit')}
        </button>
      </form>
    </div>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────────
export default function FAQModal({ isOpen, onClose }) {
  const { t } = useTranslation('faqModal');
  const { profile, session } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const userId = session?.user?.id || null;

  const TABS = [t('tabs.faq'), t('tabs.sendMessage'), t('tabs.suggestions')];

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(25,37,36,0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'faqFadeIn 200ms cubic-bezier(0.16,1,0.3,1) forwards',
      }}
    >
      <style>{`
        @keyframes faqFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes faqSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        style={{
          width: '100%', maxWidth: '560px',
          maxHeight: '88dvh',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(243,240,237,0.92)',
          backdropFilter: 'blur(28px) saturate(145%)',
          WebkitBackdropFilter: 'blur(28px) saturate(145%)',
          border: '1px solid rgba(255,255,255,0.82)',
          borderRadius: '1.75rem',
          boxShadow: '0 24px 56px -12px rgba(25,37,36,0.22), inset 0 1px 0 rgba(255,255,255,0.7)',
          animation: 'faqSlideUp 220ms cubic-bezier(0.16,1,0.3,1) forwards',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.375rem 1.5rem 0',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(209,235,219,0.7)', border: '1px solid rgba(74,155,127,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--ink)' }}>
              {t('modal.title')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              onClick={() => {
                onClose();
                setTimeout(() => {
                  localStorage.removeItem('collabnb_demo_dismissed');
                  window.location.assign('/collabs');
                }, 100);
              }}
              title={t('modal.reopenDemoTitle')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.3rem 0.5rem', borderRadius: '9999px',
                fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600,
                color: 'var(--sage)', transition: 'background 150ms, color 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(25,37,36,0.06)'; e.currentTarget.style.color = 'var(--slate)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--sage)'; }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              {t('modal.demoTour')}
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: 'rgba(25,37,36,0.07)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', transition: 'background 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(25,37,36,0.13)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(25,37,36,0.07)'; }}
              aria-label={t('modal.closeAriaLabel')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{
          display: 'flex', gap: '0.25rem',
          padding: '1rem 1.5rem 0',
          flexShrink: 0,
        }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              style={{
                padding: '0.5rem 0.875rem',
                borderRadius: '9999px', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.825rem', fontWeight: 600,
                background: activeTab === i ? 'var(--ink)' : 'transparent',
                color: activeTab === i ? 'var(--bone)' : 'var(--slate)',
                transition: 'background 160ms, color 160ms',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Divider ── */}
        <div style={{ height: '1px', background: 'rgba(25,37,36,0.07)', margin: '0.875rem 0 0', flexShrink: 0 }} />

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem 1.5rem' }}>
          {activeTab === 0 && <FAQTab profile={profile} />}
          {activeTab === 1 && <MessageTab profile={profile} />}
          {activeTab === 2 && <SuggestionsTab userId={userId} />}
        </div>
      </div>
    </div>
  );
}
