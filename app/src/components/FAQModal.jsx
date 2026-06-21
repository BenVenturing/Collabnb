import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

// ─── FAQ data ──────────────────────────────────────────────────────────────────
const FAQ_SECTIONS = [
  {
    title: 'About Collabnb',
    items: [
      {
        q: 'How is Collabnb different from Airbnb or influencer platforms?',
        a: "Airbnb is for paying guests. Collabnb is for collab arrangements where the stay is exchanged for content — there's no money changing hands for the room itself, just an agreement on deliverables.\n\nUnlike influencer platforms, we're not an agency taking a cut, we don't offer gifting campaigns for mass brands, and we don't cater to large hotel chains. We focus exclusively on the boutique end of hospitality and the creator-first end of travel content.",
      },
      {
        q: 'Can I sign up as both a creator and a host?',
        a: "Yes. If you're a creator who also owns or manages a boutique property, you can join both waitlists. Submit two separate applications — one as a creator (with your handles and tier) and one as a host (with your property details). Each is reviewed independently, and each counts against its own 100-spot founding pool.",
      },
      {
        q: "Can I apply for collabs if I'm a small creator?",
        a: "Yes. Collabnb was explicitly built with beginner tiers: UGC Beginner (under 5K followers, building a portfolio) and UGC Pro (5K–20K followers, paid UGC output). Follower count isn't the only metric.\n\nA focused UGC creator producing high-quality vertical video for boutique properties is exactly what many hosts want — even with 2,000 followers. Quality of output and fit matter more than size.",
      },
      {
        q: 'I run a boutique property — how do I post a collab listing?',
        a: "Sign up on the host waitlist and we'll verify your property before launch. Once the app is live, you'll post collab listings with: the stay details, your deliverable brief (e.g. \"3 Reels + 1 TikTok, romantic vibe, no face required\"), the dates available, and your preferred creator tier.\n\nCreators apply to you — you review their portfolio and approve the best fit. No agency, no middleman taking a cut.",
      },
      {
        q: 'When does the app launch?',
        a: 'July 1, 2026. The waitlist closes or fills before then. Verified waitlist members receive early access before the public launch. Beta testers (opt-in on the join form) get access even earlier to help shape the product.',
      },
    ],
  },
  {
    title: 'Getting Started',
    items: [
      {
        q: 'What is Collabnb?',
        a: 'Collabnb is a two-sided marketplace connecting boutique hospitality hosts with UGC creators and travel influencers. Hosts offer free or discounted stays in exchange for content — Reels, TikToks, photography, and more.',
      },
      {
        q: 'How do I sign up as a host or creator?',
        a: "Visit the homepage and click \"Get Started.\" Choose your role (host or creator), fill out your profile, and submit for verification. You'll receive a confirmation email once your account is approved.",
      },
      {
        q: 'How does verification work?',
        a: 'Our team manually reviews each host and creator profile to ensure quality and authenticity. We check your social media presence, content quality, and property details before approving your account.',
      },
      {
        q: 'How long does verification take?',
        a: "Verification typically takes 1–2 business days. You'll receive an email notification once your account has been reviewed.",
      },
    ],
  },
  {
    title: 'Creator Tiers',
    items: [
      {
        q: 'What are the creator tiers?',
        a: 'Collabnb has four tiers. UGC tiers are content-output tracks; Influencer tiers are audience-reach tracks:\n• UGC Beginner — under 5K followers, building a portfolio\n• UGC Pro — paid UGC producer, typically 5K–20K followers\n• Micro Influencer — 5K to 50K followers, audience-reach focus\n• Influencer — 50K+ followers\n\nTier affects which listings you can apply to. Hosts set minimum tier requirements per listing.',
      },
      {
        q: 'How do I know which tier I qualify for?',
        a: "Your tier is determined by your total follower count across your connected social platforms. It's calculated automatically when you complete your profile. You can view your current tier on your Profile page.",
      },
    ],
  },
  {
    title: 'Listings + Collabs',
    items: [
      {
        q: 'What does pausing a listing do?',
        a: 'Pausing a listing removes it from the Explore feed so no new creators can discover or apply. However, all existing applications and active collaborations continue unaffected — nothing is cancelled.',
      },
      {
        q: 'What is the difference between an Application and a Pitch?',
        a: "An Application means you're accepting the listing exactly as-is — dates, deliverables, and compensation unchanged. A Pitch is a modified proposal where you can suggest different terms (dates, deliverables, or compensation). Pitches count toward your monthly pitch limit.",
      },
      {
        q: 'How many pitches can I submit per month?',
        a: 'You can submit up to 10 pitches per month. The counter resets on the 1st of each month. Standard applications (no changes to listing terms) do not count toward this limit.',
      },
      {
        q: 'How do contracts work?',
        a: 'Once a host accepts your application or pitch, a contract is generated with all agreed terms. Both parties must sign digitally. Once both have signed, the contract is locked in and — for paid collabs — payment is triggered to the host.',
      },
    ],
  },
  {
    title: 'Payments',
    items: [
      {
        q: 'How much does Collabnb cost for hosts?',
        a: 'For free collabs (no cash compensation), Collabnb charges a flat $20 platform fee per completed collaboration. For paid collabs, we charge 5% of the cash amount with a minimum fee of $20. Founding Members receive free access forever.',
      },
      {
        q: 'How much does Collabnb cost for creators?',
        a: "Collabnb is free until your first completed collaboration. After that, it's $10/month or $60/year. Founding Members (the first 100 verified creators) receive free access forever.",
      },
      {
        q: 'What is a Founding Member?',
        a: 'Founding Members are the first 100 verified hosts and the first 100 verified creators on Collabnb. They receive free platform access forever as a thank-you for being early supporters of the community.',
      },
    ],
  },
  {
    title: 'Affiliate Links',
    items: [
      {
        q: 'How do affiliate codes work?',
        a: 'Each host receives an affiliate code generated from their initials plus their discount percentage (e.g., TBR25 for a 25% referral discount). Affiliate codes currently run on the honor system — creators apply the code at checkout.',
      },
      {
        q: 'Does Collabnb track affiliate clicks?',
        a: 'Not yet. Click and conversion tracking for affiliate codes is a planned feature coming later. For now, code usage is tracked manually on both sides.',
      },
    ],
  },
  {
    title: 'Creator Features',
    items: [
      {
        q: 'How does the travel calendar work?',
        a: "The travel calendar lets you mark the dates you're available to travel and take on collaborations. Hosts can see your availability when reviewing your application, making it easier to match on timing.",
      },
      {
        q: 'What is the swipe view?',
        a: 'The swipe view is an alternative way to browse listings — similar to a card-swipe interface. You can quickly swipe right to save a listing or left to skip it, making discovery faster on mobile.',
      },
      {
        q: 'What is Engagement Rate (Eng. Rate)?',
        a: "Engagement Rate is the percentage of a creator's followers who actively liked, commented, or shared their posts in the last 30 days. A high rate signals a loyal, responsive audience — often more valuable to hosts than raw follower count.\n\nFor example, a creator with 10K followers and a 12% engagement rate (1,200 engaged people per post) typically drives more real visibility than a creator with 100K followers and a 1% rate. We show the 30-day rolling average so you see current momentum, not a historical snapshot.",
      },
    ],
  },
];

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

// ─── Tab 1: FAQ ────────────────────────────────────────────────────────────────
function FAQTab() {
  const [search, setSearch] = useState('');
  const term = search.toLowerCase().trim();

  const sectionsWithVisibility = FAQ_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      visible: !term || item.q.toLowerCase().includes(term) || item.a.toLowerCase().includes(term),
    })),
  })).filter((s) => s.items.some((i) => i.visible));

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
          placeholder="Search questions…"
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
      {sectionsWithVisibility.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--sage)', fontSize: '0.875rem', padding: '2rem 0' }}>
          No questions match "{search}"
        </p>
      ) : (
        sectionsWithVisibility.map((section) => (
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
        ))
      )}
    </div>
  );
}

// ─── Tab 2: Send a Message ─────────────────────────────────────────────────────
const CATEGORIES = [
  'Bug Report',
  'Feature Request',
  'Account Help',
  'General Question',
  'Other',
];

function MessageTab({ profile }) {
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
          Message sent!
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--slate)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
          We typically respond within 1–2 business days, often right here in this same window — log back in and check this tab for a reply.
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
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate)', marginBottom: '0.375rem' }}>Name</label>
          <input
            type="text" required value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.25)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.1)'; }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate)', marginBottom: '0.375rem' }}>Email</label>
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
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate)', marginBottom: '0.375rem' }}>Category</label>
        <select
          value={category} onChange={(e) => setCategory(e.target.value)}
          style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
        >
          <option value="">Select a category…</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate)', marginBottom: '0.375rem' }}>Message</label>
        <textarea
          required value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5} placeholder="Describe your question or issue…"
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
        {submitting ? 'Sending…' : 'Send Message'}
      </button>
    </form>

    {/* ── Previous messages + admin replies ── */}
    {prevMessages && prevMessages.length > 0 && (
      <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(25,37,36,0.07)', paddingTop: '1.25rem' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
          Previous Messages
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
                    Collabnb Support · {m.admin_reply_at ? new Date(m.admin_reply_at).toLocaleDateString() : ''}
                  </div>
                  <p style={{ fontSize: '0.83rem', color: 'var(--ink)', margin: 0, lineHeight: 1.55 }}>{m.admin_reply}</p>
                </div>
              ) : (
                <div style={{ padding: '0.5rem 0.875rem', background: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(25,37,36,0.05)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>Awaiting reply — we'll respond here within 1–2 business days.</span>
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
          Shape the future of Collabnb
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--slate)' }}>
          Upvote features and ideas you want to see. Top suggestions help us prioritize the roadmap.
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
                    Featured
                  </span>
                )}
                {s.status === 'implemented' && (
                  <span style={{ fontSize: '0.7rem', color: '#166534', background: '#D1FAE5', padding: '0.1rem 0.45rem', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.35rem' }}>
                    <svg viewBox="0 0 16 16" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 8 6.5 11.5 13 4.5"/></svg>
                    Implemented
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem', flexShrink: 0, minWidth: 32 }}>
                {/* Upvote only (no downvote) */}
                <button
                  onClick={() => handleVote(s._id, 'up')}
                  title={userId ? 'Upvote' : 'Sign in to vote'}
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
          placeholder="Suggest a feature…"
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
          {submitting ? '…' : 'Submit'}
        </button>
      </form>
    </div>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────────
const TABS = ['FAQ', 'Send a Message', 'Suggestions'];

export default function FAQModal({ isOpen, onClose }) {
  const { profile, session } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const userId = session?.user?.id || null;

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
              Help Center
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
              title="Reopen Demo Tour"
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
              Demo Tour
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
              aria-label="Close"
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
          {activeTab === 0 && <FAQTab />}
          {activeTab === 1 && <MessageTab profile={profile} />}
          {activeTab === 2 && <SuggestionsTab userId={userId} />}
        </div>
      </div>
    </div>
  );
}
