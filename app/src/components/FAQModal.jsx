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
        a: "Airbnb connects paying guests with accommodation. Collabnb is different: boutique hospitality brands hire creators as professional marketing partners to produce authentic content campaigns\n\nUnlike influencer platforms, we are not an agency taking a cut, we do not run gifting campaigns for mass brands, and we do not cater to large hotel chains. We focus exclusively on boutique hospitality and creators who treat content creation as a profession. Every collaboration is structured around clear deliverables, agreed compensation, and a signed contract — never a vague arrangement.",
      },
      {
        q: 'Can I sign up as both a creator and a host?',
        a: "Yes. If you're a creator who also owns or manages a boutique property, you can join both waitlists. Submit two separate applications — one as a creator (with your handles and tier) and one as a host (with your property details). Each is reviewed independently, and each counts against its own 100-spot founding pool.",
      },
      {
        q: "Can I apply if I'm a small creator?",
        a: "Yes. Collabnb was explicitly built with beginner tiers: UGC Beginner (0–5K followers, building a portfolio) and UGC Pro (5K–10K followers, paid UGC output). Follower count isn't the only metric.\n\nA focused UGC creator producing high-quality vertical video for boutique properties is exactly what many hosts want — even with a small following. Quality of output and fit matter more than size.",
      },
      {
        q: 'I run a boutique property — how do I post a collab listing?',
        a: "Sign up on the host waitlist and we'll verify your property before launch. Once the app is live, you'll post collab listings with: the stay details, your deliverable brief (e.g. \"3 Reels + 1 TikTok, romantic vibe, no face required\"), the dates available, and your preferred creator tier.\n\nCreators apply to you — you review their portfolio and approve the best fit. No agency, no middleman taking a cut.",
      },
      {
        q: 'When does the app launch?',
        a: 'July 15, 2026. The waitlist closes or fills before then. Verified waitlist members receive early access before the public launch. Beta testers (opt-in on the join form) get access even earlier to help shape the product.',
      },
    ],
  },
  {
    title: 'Getting Started',
    items: [
      {
        q: 'What is Collabnb?',
        a: 'Collabnb is a creator-first hospitality marketing platform connecting boutique properties with vetted creators. Hosts hire creators as professional marketing partners for campaigns with clear deliverables and fair compensation — Reels, TikToks, photography, and more.',
      },
      {
        q: 'How do I sign up as a host or creator?',
        a: "Visit the homepage and click \"Get Started.\" Choose your role (host or creator), fill out your profile, and submit for verification. You'll receive a confirmation email once your account is approved.",
      },
      {
        q: 'How does verification work?',
        a: 'Our team manually reviews each profile to maintain a trusted, curated network of professional creators and quality properties. For creators: we verify social accounts, follower counts, portfolio quality, and professionalism. For hosts: we verify property details, online presence, and business credentials.',
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
        a: "Collabnb has four professional tiers across two tracks. UGC tiers are portfolio-driven, where content runs on the host's channels. Influencer tiers are audience-reach driven, where content runs on the creator's channels.:\n• UGC Beginner — 0–5K followers, building a portfolio, admitted on quality\n• UGC Pro — 5K–10K followers, paid UGC producer with proven output\n• Micro Influencer — 10K–50K followers\n• Influencer — 50K+ followers\n\nYour track and tier are assigned during verification based on your portfolio, follower counts, and professional experience. They determine which listings and deliverable types you can be booked for.",
      },
      {
        q: 'How do I know which tier I qualify for?',
        a: "Your track and tier are assigned by the Collabnb team during verification. For the UGC track, tier is based on portfolio quality. For the Influencer track, tier is based on verified follower counts. You can view your current track and tier on your Profile page.",
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
        q: 'How do deliverables work?',
        a: "Each campaign specifies the deliverables required — photo sets, story frames, carousels, Reels, or YouTube videos. The points system assigns each deliverable a weight based on production effort (a photo is 1 point, a Reel is 3 points, a YouTube video is 5 points). The total determines the load shown on the card: Light (2 pts or fewer), Moderate (3-4 pts), or Heavy (5+ pts). This lets you compare effort at a glance, regardless of deliverable mix.",
      },
      {
        q: 'What is the difference between an Application and a Pitch?',
        a: "An Application means you are accepting the campaign exactly as listed — dates, deliverables, and compensation unchanged. A Pitch is a modified proposal where you can suggest different terms (dates, deliverables, or compensation). Pitches count toward your monthly pitch limit.",
      },
      {
        q: 'How many pitches can I submit per month?',
        a: 'You can submit up to 10 pitches per month. The counter resets on the 1st of each month. Standard applications (no changes to listing terms) do not count toward this limit.',
      },
      {
        q: 'How do contracts work?',
        a: "Once a host accepts your application or pitch, a contract is generated with all agreed terms. Both parties sign digitally to lock in the arrangement. The platform fee is never charged at signing — it is charged automatically only after the collaboration is marked complete, so the host pays once the work is actually delivered.",
      },
    ],
  },
  {
    title: 'Payments',
    items: [
      {
        q: 'How much does Collabnb cost for hosts?',
        a: 'Hosts never pay to browse, search, message, or post listings. Fees are charged only after a collaboration is completed. For completed collaborations under $500 cash value: $20 flat fee. For collaborations $500 and above: 5% of the cash value. Hybrid Collaborations: cash-only basis — the stay value is excluded. Founding Members pay nothing, ever.',
        keywords: ['pricing', 'price', 'plan', 'plans', 'host pricing', 'host cost'],
      },
      {
        q: 'How much does Collabnb cost for creators?',
        a: "Collabnb is free for all approved creators during your 30-day trial. After the trial, Creator Plus is $10/month or $60/year. Founding Members — the first 100 verified creators — keep full access forever at no cost. There is no charge to browse, apply, or communicate. The subscription only starts after your trial ends.",
        keywords: ['pricing', 'price', 'plan', 'plans', 'subscription cost', 'creator pricing'],
      },
      {
        q: 'What is a Founding Member?',
        a: 'Founding Members are the first 100 verified creators and first 100 verified hosts on Collabnb. They receive permanent free access — no platform fees for hosts, no Creator Plus subscription for creators — as a thank-you for being early partners in building the community. Founding status is assigned at verification in approval order. Once all 100 spots per role are filled, founding is closed permanently.',
      },
      {
        q: 'When is the host platform fee charged?',
        a: "The platform fee is never charged up front. It is charged automatically only after the collaboration is marked complete — when both sides confirm the campaign wrapped successfully. If the host saved a payment method at contract signing, it happens automatically. Otherwise, the host completes a one-tap payment when the collab closes. Either way: you do not pay until you get value.",
      },
      {
        q: 'How does the referral code work, and how do I get free months?',
        a: "Every member gets a personal referral code to share. When someone signs up using your code, you BOTH get 1 free month right away. Then, once that new member completes their first collaboration, you BOTH get another free month on top — so a successful referral is worth 2 free months to each of you. Free months are applied automatically at billing time before any charge. They stack: refer multiple friends and you can build up several months of credit.",
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
        q: 'What is 30-Day Engagement Rate?',
        a: "30-Day Engagement Rate is the percentage of a creator's followers who actively liked, commented, or shared their posts in the last 30 days. A high rate signals a loyal, responsive audience — often more valuable to hosts than raw follower count.\n\nFor example, a creator with 10K followers and a 12% engagement rate (1,200 engaged people per post) typically drives more real visibility than a creator with 100K followers and a 1% rate. We show the 30-day rolling average so you see current momentum, not a historical snapshot.",
      },
      {
        q: 'Can I hide my profile from the Host Creators page?',
        a: "Yes. In Edit Profile, toggle \"Profile is visible to hosts\" off to hide yourself from the Host Creators directory. Hosts won't be able to find or message you while hidden, but any conversations you already have stay open. Turn it back on anytime — it takes effect immediately.",
        keywords: ['visibility', 'hide profile', 'privacy'],
      },
    ],
  },
  {
    title: 'Founders',
    items: [
      {
        q: 'What is the Founders space?',
        a: "The Founders space is a private area for verified Founding Members, at /founders. It includes a role-scoped lounge (creators only see other creators, hosts only see other hosts), a resources library, early-access listings, and a directory of fellow founders.",
        keywords: ['founder', 'founders tab', 'lounge'],
      },
      {
        q: 'Who can access the Founders space?',
        a: "Only verified Founding Members — the first 100 verified creators and first 100 verified hosts. If you're not a Founding Member, the Founders tab is hidden from your navigation and the /founders route redirects you elsewhere.",
        keywords: ['founder access', 'founding member'],
      },
      {
        q: 'What can I do in the Founders lounge?',
        a: "Post and reply in a threaded lounge with other founders in your role. It's a space to connect with peers, share tips, and get early visibility into new features and resources before they roll out more broadly.",
        keywords: ['founder lounge', 'threads'],
      },
    ],
  },
  {
    title: 'Creator Metrics',
    items: [
      {
        q: 'How do I find my average reach / views?',
        a: "Instagram: Go to your profile → tap a post → View Insights → Reach. Average this across your last 10–15 posts for a representative number.\n\nTikTok: Go to Profile → Analytics → Content tab → tap each video to see views. Average your last 10–15 videos.\n\nYouTube: Go to YouTube Studio → Analytics → Reach tab → Impressions and Views over the last 28 days. Divide total views by number of videos published.",
      },
      {
        q: 'How is Engagement Rate calculated?',
        a: "Collabnb calculates it automatically — you don't need to enter it yourself. Just fill in your average views, likes, and comments and we compute:\n\nEngagement Rate = (Avg Likes + Avg Comments) ÷ Avg Views × 100\n\nThis gives a content-level engagement rate, which reflects how compelling your actual content is — independent of follower count.",
      },
      {
        q: 'How often should I update my metrics?',
        a: "Update your metrics once a month. You'll receive a reminder notification when it's time.\n\nKeeping your numbers current ensures hosts see accurate reach and engagement when reviewing your profile — outdated stats can hurt your chances of being matched. You can only update once every 30 days to keep numbers meaningful.\n\nTo update: go to your Profile → My Metrics → enter your latest numbers → Save.",
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

// ─── Matching: tokenized AND-match across question + answer + keyword aliases ──
function itemMatches(item, tokens) {
  if (tokens.length === 0) return true;
  const haystack = `${item.q} ${item.a} ${(item.keywords || []).join(' ')}`.toLowerCase();
  return tokens.every((tok) => haystack.includes(tok));
}

// ─── Ask-a-question CTA (shown when no FAQ or community answer matches) ────────
function AskQuestionCTA({ search, profile }) {
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
          Question posted!
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--slate)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
          It's now live in the FAQ below marked "Awaiting answer." We've emailed the team and the answer will appear right here as soon as we reply.
        </p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '1.75rem 1rem', border: '1px dashed rgba(25,37,36,0.15)', borderRadius: '0.875rem' }}>
      <p style={{ fontSize: '0.875rem', color: 'var(--slate)', marginBottom: '0.875rem' }}>
        {search ? <>No questions match "{search}".</> : 'No questions found.'}
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
          Ask this as a question
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', textAlign: 'left', maxWidth: 360, margin: '0 auto' }}>
          <textarea
            required value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2} placeholder="Type your question…"
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            <input type="text" required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: 0, lineHeight: 1.5 }}>
            This posts publicly to the Help Center right away as "Awaiting answer," and emails our team so we can reply fast.
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
            {submitting ? 'Posting…' : 'Post question'}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Community question item (submitted via "Ask this as a question") ─────────
function CommunityQuestionItem({ question, answer, answered_at }) {
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
            Awaiting answer
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
  const [search, setSearch] = useState('');
  const term = search.toLowerCase().trim();
  const tokens = term ? term.split(/\s+/).filter(Boolean) : [];

  const communityQuestions = useQuery(api.messages.getFaqQuestions) || [];
  const visibleCommunity = communityQuestions.filter((c) =>
    tokens.length === 0 || itemMatches({ q: c.question, a: c.answer || '' }, tokens)
  );

  const sectionsWithVisibility = FAQ_SECTIONS.map((section) => ({
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
                Community Questions
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
          {activeTab === 0 && <FAQTab profile={profile} />}
          {activeTab === 1 && <MessageTab profile={profile} />}
          {activeTab === 2 && <SuggestionsTab userId={userId} />}
        </div>
      </div>
    </div>
  );
}
