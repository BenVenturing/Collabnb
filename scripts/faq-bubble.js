/* ============================================================
   Collabnb — Floating FAQ / Help Center bubble (marketing site)
   Vanilla-JS mirror of app/src/components/FAQModal.jsx, wired to
   the same Convex functions via scripts/convex.js.
   ============================================================ */

import { submitMessage, getMessagesByEmail, getSuggestions, seedSuggestions, submitSuggestion, voteSuggestion } from './convex.js';
import { launchConfetti } from './main.js';

/* ── Lazy Clerk instance (same pattern as main.js/login.js/profile.js) ── */
let _clerkPromise = null;
async function getClerk() {
  if (!_clerkPromise) {
    _clerkPromise = (async () => {
      try {
        const { Clerk } = await import('@clerk/clerk-js');
        const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
        if (!key) return null;
        const clerk = new Clerk(key);
        await clerk.load();
        return clerk;
      } catch {
        return null;
      }
    })();
  }
  return _clerkPromise;
}

/* ── FAQ content (mirrors FAQModal.jsx FAQ_SECTIONS) ── */
const FAQ_SECTIONS = [
  {
    title: 'About Collabnb',
    items: [
      { q: 'How is Collabnb different from Airbnb or influencer platforms?', a: "Airbnb connects paying guests with accommodation. Collabnb is different: boutique hospitality brands hire creators as professional marketing partners to produce authentic content campaigns\n\nUnlike influencer platforms, we are not an agency taking a cut, we do not run gifting campaigns for mass brands, and we do not cater to large hotel chains. We focus exclusively on boutique hospitality and creators who treat content creation as a profession. Every collaboration is structured around clear deliverables, agreed compensation, and a signed contract — never a vague arrangement." },
      { q: 'Can I sign up as both a creator and a host?', a: "Yes. If you're a creator who also owns or manages a boutique property, you can join both waitlists. Submit two separate applications — one as a creator (with your handles and tier) and one as a host (with your property details). Each is reviewed independently, and each counts against its own 100-spot founding pool." },
      { q: "Can I apply if I'm a small creator?", a: "Yes. Collabnb was explicitly built with beginner tiers: UGC Beginner (0–5K followers, building a portfolio) and UGC Pro (5K–10K followers, paid UGC output). Follower count isn't the only metric.\n\nA focused UGC creator producing high-quality vertical video for boutique properties is exactly what many hosts want — even with a small following. Quality of output and fit matter more than size." },
      { q: 'I run a boutique property — how do I post a collab listing?', a: 'Sign up on the host waitlist and we\'ll verify your property before launch. Once the app is live, you\'ll post collab listings with: the stay details, your deliverable brief (e.g. "3 Reels + 1 TikTok, romantic vibe, no face required"), the dates available, and your preferred creator tier.\n\nCreators apply to you — you review their portfolio and approve the best fit. No agency, no middleman taking a cut.' },
      { q: 'When does the app launch?', a: 'July 15, 2026. The waitlist closes or fills before then. Verified waitlist members receive early access before the public launch. Beta testers (opt-in on the join form) get access even earlier to help shape the product.' },
    ],
  },
  {
    title: 'Getting Started',
    items: [
      { q: 'What is Collabnb?', a: 'Collabnb is a creator-first hospitality marketing platform connecting boutique properties with vetted creators. Hosts hire creators as professional marketing partners for campaigns with clear deliverables and fair compensation — Reels, TikToks, photography, and more.' },
      { q: 'How do I sign up as a host or creator?', a: 'Visit the homepage and click "Get Started." Choose your role (host or creator), fill out your profile, and submit for verification. You\'ll receive a confirmation email once your account is approved.' },
      { q: 'How does verification work?', a: 'Our team manually reviews each profile to maintain a trusted, curated network of professional creators and quality properties. For creators: we verify social accounts, follower counts, portfolio quality, and professionalism. For hosts: we verify property details, online presence, and business credentials.' },
      { q: 'How long does verification take?', a: "Verification typically takes 1–2 business days. You'll receive an email notification once your account has been reviewed." },
    ],
  },
  {
    title: 'Creator Tiers',
    items: [
      { q: 'What are the creator tiers?', a: "Collabnb has four professional tiers across two tracks. UGC tiers are portfolio-driven, where content runs on the host's channels. Influencer tiers are audience-reach driven, where content runs on the creator's channels.:\n• UGC Beginner — 0–5K followers, building a portfolio, admitted on quality\n• UGC Pro — 5K–10K followers, paid UGC producer with proven output\n• Micro Influencer — 10K–50K followers\n• Influencer — 50K+ followers\n\nYour track and tier are assigned during verification based on your portfolio, follower counts, and professional experience. They determine which listings and deliverable types you can be booked for." },
      { q: 'How do I know which tier I qualify for?', a: "Your track and tier are assigned by the Collabnb team during verification. For the UGC track, tier is based on portfolio quality. For the Influencer track, tier is based on verified follower counts. You can view your current track and tier on your Profile page." },
    ],
  },
  {
    title: 'Listings + Collabs',
    items: [
      { q: 'What does pausing a listing do?', a: 'Pausing a listing removes it from the Explore feed so no new creators can discover or apply. However, all existing applications and active collaborations continue unaffected — nothing is cancelled.' },
      { q: 'How do deliverables work?', a: "Each campaign specifies the deliverables required — photo sets, story frames, carousels, Reels, or YouTube videos. The points system assigns each deliverable a weight based on production effort (a photo is 1 point, a Reel is 3 points, a YouTube video is 5 points). The total determines the load shown on the card: Light (2 pts or fewer), Moderate (3-4 pts), or Heavy (5+ pts). This lets you compare effort at a glance, regardless of deliverable mix." },
      { q: 'What is the difference between an Application and a Pitch?', a: "An Application means you are accepting the campaign exactly as listed — dates, deliverables, and compensation unchanged. A Pitch is a modified proposal where you can suggest different terms (dates, deliverables, or compensation). Pitches count toward your monthly pitch limit." },
      { q: 'How many pitches can I submit per month?', a: 'You can submit up to 10 pitches per month. The counter resets on the 1st of each month. Standard applications (no changes to listing terms) do not count toward this limit.' },
      { q: 'How do contracts work?', a: "Once a host accepts your application or pitch, a contract is generated with all agreed terms. Both parties sign digitally to lock in the arrangement. The platform fee is never charged at signing — it is charged automatically only after the collaboration is marked complete, so the host pays once the work is actually delivered." },
    ],
  },
  {
    title: 'Payments',
    items: [
      { q: 'How much does Collabnb cost for hosts?', a: 'Hosts never pay to browse, search, message, or post listings. Fees are charged only after a collaboration is completed. For completed collaborations under $500 cash value: $20 flat fee. For collaborations $500 and above: 5% of the cash value. Hybrid Collaborations: cash-only basis — the stay value is excluded. Founding Members pay nothing, ever.' },
      { q: 'How much does Collabnb cost for creators?', a: "Collabnb is free for all approved creators during your 30-day trial. After the trial, Creator Plus is $10/month or $60/year. Founding Members — the first 100 verified creators — keep full access forever at no cost. There is no charge to browse, apply, or communicate. The subscription only starts after your trial ends." },
      { q: 'What is a Founding Member?', a: 'Founding Members are the first 100 verified creators and first 100 verified hosts on Collabnb. They receive permanent free access — no platform fees for hosts, no Creator Plus subscription for creators — as a thank-you for being early partners in building the community. Founding status is assigned at verification in approval order. Once all 100 spots per role are filled, founding is closed permanently.' },
      { q: 'When is the host platform fee charged?', a: "The platform fee is never charged up front. It is charged automatically only after the collaboration is marked complete — when both sides confirm the campaign wrapped successfully. If the host saved a payment method at contract signing, it happens automatically. Otherwise, the host completes a one-tap payment when the collab closes. Either way: you do not pay until you get value." },
      { q: 'How does the referral code work, and how do I get free months?', a: "Every member gets a personal referral code to share. When someone signs up using your code, you BOTH get 1 free month right away. Then, once that new member completes their first collaboration, you BOTH get another free month on top — so a successful referral is worth 2 free months to each of you. Free months are applied automatically at billing time before any charge. They stack: refer multiple friends and you can build up several months of credit." },
    ],
  },
  {
    title: 'Affiliate Links',
    items: [
      { q: 'How do affiliate codes work?', a: 'Each host receives an affiliate code generated from their initials plus their discount percentage (e.g., TBR25 for a 25% referral discount). Affiliate codes currently run on the honor system — creators apply the code at checkout.' },
      { q: 'Does Collabnb track affiliate clicks?', a: 'Not yet. Click and conversion tracking for affiliate codes is a planned feature coming later. For now, code usage is tracked manually on both sides.' },
    ],
  },
  {
    title: 'Creator Features',
    items: [
      { q: 'How does the travel calendar work?', a: "The travel calendar lets you mark the dates you're available to travel and take on collaborations. Hosts can see your availability when reviewing your application, making it easier to match on timing." },
      { q: 'What is the swipe view?', a: 'The swipe view is an alternative way to browse listings — similar to a card-swipe interface. You can quickly swipe right to save a listing or left to skip it, making discovery faster on mobile.' },
      { q: 'What is 30-Day Engagement Rate?', a: "30-Day Engagement Rate is the percentage of a creator's followers who actively liked, commented, or shared their posts in the last 30 days. A high rate signals a loyal, responsive audience — often more valuable to hosts than raw follower count.\n\nFor example, a creator with 10K followers and a 12% engagement rate (1,200 engaged people per post) typically drives more real visibility than a creator with 100K followers and a 1% rate. We show the 30-day rolling average so you see current momentum, not a historical snapshot." },
    ],
  },
  {
    title: 'Creator Metrics',
    items: [
      { q: 'How do I find my average reach / views?', a: "Instagram: Go to your profile → tap a post → View Insights → Reach. Average this across your last 10–15 posts for a representative number.\n\nTikTok: Go to Profile → Analytics → Content tab → tap each video to see views. Average your last 10–15 videos.\n\nYouTube: Go to YouTube Studio → Analytics → Reach tab → Impressions and Views over the last 28 days. Divide total views by number of videos published." },
      { q: 'How is Engagement Rate calculated?', a: "Collabnb calculates it automatically — you don't need to enter it yourself. Just fill in your average views, likes, and comments and we compute:\n\nEngagement Rate = (Avg Likes + Avg Comments) ÷ Avg Views × 100\n\nThis gives a content-level engagement rate, which reflects how compelling your actual content is — independent of follower count." },
      { q: 'How often should I update my metrics?', a: "Update your metrics once a month. You'll receive a reminder notification when it's time.\n\nKeeping your numbers current ensures hosts see accurate reach and engagement when reviewing your profile — outdated stats can hurt your chances of being matched. You can only update once every 30 days to keep numbers meaningful.\n\nTo update: go to your Profile → My Metrics → enter your latest numbers → Save." },
    ],
  },
];

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function guestId() {
  let id = localStorage.getItem('collabnb_guest_id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('collabnb_guest_id', id);
  }
  return id;
}

/* ── Build markup ── */
function buildSkeleton() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <button type="button" class="faq-bubble-trigger" aria-haspopup="dialog" aria-expanded="false" aria-controls="faq-bubble-panel" aria-label="Open Help Center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" stroke-width="3"/></svg>
      <span class="faq-bubble-trigger-label">Help</span>
    </button>
    <div class="faq-bubble-overlay" id="faq-bubble-panel" role="dialog" aria-modal="true" aria-labelledby="faq-bubble-title">
      <div class="faq-bubble-card">
        <div class="faq-bubble-header">
          <div class="faq-bubble-header-title">
            <div class="faq-bubble-header-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" stroke-width="3"/></svg>
            </div>
            <span id="faq-bubble-title">Help Center</span>
          </div>
          <button type="button" class="faq-bubble-close" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="faq-bubble-tabs">
          <button type="button" class="faq-bubble-tab active" data-tab="faq">FAQ</button>
          <button type="button" class="faq-bubble-tab" data-tab="message">Send a Message</button>
          <button type="button" class="faq-bubble-tab" data-tab="suggestions">Suggestions</button>
        </div>
        <div class="faq-bubble-divider"></div>
        <div class="faq-bubble-body">
          <div class="faq-bubble-panel-faq"></div>
          <div class="faq-bubble-panel-message" hidden></div>
          <div class="faq-bubble-panel-suggestions" hidden></div>
        </div>
      </div>
    </div>
  `;
  return wrap;
}

/* ── FAQ tab ── */
function renderFAQTab(container) {
  container.innerHTML = `
    <div class="faq-bubble-search-wrap">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="faq-bubble-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" class="faq-bubble-search" placeholder="Search questions…" />
    </div>
    <div class="faq-bubble-sections"></div>
  `;
  const searchInput = container.querySelector('.faq-bubble-search');
  const sectionsEl = container.querySelector('.faq-bubble-sections');

  function renderSections(term) {
    const t = term.toLowerCase().trim();
    const filtered = FAQ_SECTIONS.map((section) => ({
      title: section.title,
      items: section.items.filter((item) => !t || item.q.toLowerCase().includes(t) || item.a.toLowerCase().includes(t)),
    })).filter((s) => s.items.length > 0);

    if (filtered.length === 0) {
      sectionsEl.innerHTML = `<p class="faq-bubble-empty">No questions match "${escapeHtml(term)}"</p>`;
      return;
    }

    sectionsEl.innerHTML = filtered.map((section) => `
      <div class="faq-bubble-section">
        <p class="faq-bubble-section-title">${escapeHtml(section.title)}</p>
        ${section.items.map((item) => `
          <div class="faq-bubble-item">
            <button type="button" class="faq-bubble-question">
              <span>${escapeHtml(item.q)}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="faq-bubble-chevron"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="faq-bubble-answer-wrap">
              <p class="faq-bubble-answer">${escapeHtml(item.a)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');

    sectionsEl.querySelectorAll('.faq-bubble-question').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.parentElement.classList.toggle('open');
      });
    });
  }

  renderSections('');
  searchInput.addEventListener('input', () => renderSections(searchInput.value));
}

/* ── Message tab ── */
async function renderMessageTab(container) {
  const clerk = await getClerk().catch(() => null);
  const user = clerk?.user;
  const prefillName = user?.fullName || '';
  const prefillEmail = user?.primaryEmailAddress?.emailAddress || '';

  container.innerHTML = `
    <form class="faq-bubble-message-form">
      <div class="faq-bubble-form-row">
        <div>
          <label>Name</label>
          <input type="text" name="name" required value="${escapeHtml(prefillName)}" />
        </div>
        <div>
          <label>Email</label>
          <input type="email" name="email" required value="${escapeHtml(prefillEmail)}" />
        </div>
      </div>
      <div>
        <label>Category</label>
        <select name="category">
          <option value="">Select a category…</option>
          <option>Bug Report</option>
          <option>Feature Request</option>
          <option>Account Help</option>
          <option>General Question</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label>Message</label>
        <textarea name="message" rows="5" required placeholder="Describe your question or issue…"></textarea>
      </div>
      <button type="submit" class="faq-bubble-submit">Send Message</button>
    </form>
    <div class="faq-bubble-message-sent" hidden>
      <div class="faq-bubble-sent-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <p class="faq-bubble-sent-title">Message sent!</p>
      <p class="faq-bubble-sent-desc">We typically respond within 1–2 business days, often right here in this same window — log back in and check this tab for a reply.</p>
    </div>
    <div class="faq-bubble-prev-messages"></div>
  `;

  const form = container.querySelector('.faq-bubble-message-form');
  const sentEl = container.querySelector('.faq-bubble-message-sent');
  const prevWrap = container.querySelector('.faq-bubble-prev-messages');

  async function loadPrevMessages(email) {
    if (!email) return;
    const prev = await getMessagesByEmail(email);
    if (!prev || prev.length === 0) return;
    prevWrap.innerHTML = `
      <p class="faq-bubble-prev-title">Previous Messages</p>
      <div class="faq-bubble-prev-list">
        ${prev.map((m) => `
          <div class="faq-bubble-prev-card">
            <div class="faq-bubble-prev-original">
              <div class="faq-bubble-prev-meta">${m.category ? `<span class="faq-bubble-prev-category">${escapeHtml(m.category)}</span>` : ''}${new Date(m._creationTime).toLocaleDateString()}</div>
              <p>${escapeHtml(m.message)}</p>
            </div>
            ${m.admin_reply
              ? `<div class="faq-bubble-prev-reply"><div class="faq-bubble-prev-reply-meta">Collabnb Support · ${m.admin_reply_at ? new Date(m.admin_reply_at).toLocaleDateString() : ''}</div><p>${escapeHtml(m.admin_reply)}</p></div>`
              : `<div class="faq-bubble-prev-awaiting">Awaiting reply — we'll respond here within 1–2 business days.</div>`}
          </div>
        `).join('')}
      </div>
    `;
  }
  if (prefillEmail) loadPrevMessages(prefillEmail);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('.faq-bubble-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await submitMessage({
        name: data.name,
        email: data.email,
        category: data.category || undefined,
        message: data.message,
      });
    } catch (err) {
      console.warn('submitMessage failed:', err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Try again';
      return;
    }
    form.hidden = true;
    prevWrap.hidden = true;
    sentEl.hidden = false;
    launchConfetti();
  });
}

/* ── Suggestions tab ── */
async function renderSuggestionsTab(container) {
  const clerk = await getClerk().catch(() => null);
  const userId = clerk?.user?.id || guestId();

  container.innerHTML = `
    <div class="faq-bubble-suggestions-intro">
      <p class="faq-bubble-suggestions-title">Shape the future of Collabnb</p>
      <p class="faq-bubble-suggestions-desc">Upvote features and ideas you want to see. Top suggestions help us prioritize the roadmap.</p>
    </div>
    <div class="faq-bubble-suggestions-list"><div class="faq-bubble-loading"></div></div>
    <form class="faq-bubble-suggest-form">
      <input type="text" maxlength="200" placeholder="Suggest a feature…" />
      <button type="submit">Submit</button>
    </form>
  `;

  const listEl = container.querySelector('.faq-bubble-suggestions-list');
  const form = container.querySelector('.faq-bubble-suggest-form');
  const input = form.querySelector('input');
  const submitBtn = form.querySelector('button');

  async function refresh() {
    const suggestions = await getSuggestions(userId);
    if (!suggestions || suggestions.length === 0) {
      listEl.innerHTML = '';
      return;
    }
    listEl.innerHTML = suggestions.map((s) => `
      <div class="faq-bubble-suggestion" data-id="${s._id}">
        <div class="faq-bubble-suggestion-text">
          <p>${escapeHtml(s.text)}</p>
          ${s.status === 'approved' ? '<span class="faq-bubble-badge faq-bubble-badge-featured">Featured</span>' : ''}
          ${s.status === 'implemented' ? '<span class="faq-bubble-badge faq-bubble-badge-implemented">Implemented</span>' : ''}
        </div>
        <div class="faq-bubble-suggestion-vote">
          <button type="button" class="faq-bubble-vote-btn${s.userVote === 'up' ? ' voted' : ''}" title="Upvote">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="${s.userVote === 'up' ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <span class="faq-bubble-vote-count${s.upvotes > 0 ? ' has-votes' : ''}">${s.upvotes}</span>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.faq-bubble-vote-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('.faq-bubble-suggestion').dataset.id;
        await voteSuggestion(id, userId);
        refresh();
      });
    });
  }

  await seedSuggestions();
  await refresh();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    submitBtn.disabled = true;
    try {
      await submitSuggestion(text, userId);
      input.value = '';
      await refresh();
    } finally {
      submitBtn.disabled = false;
    }
  });
}

/* ── Init ── */
export function initFAQBubble() {
  if (document.querySelector('.faq-bubble-trigger')) return; // already mounted

  const el = buildSkeleton();
  document.body.appendChild(el);

  const trigger = document.querySelector('.faq-bubble-trigger');
  const overlay = document.querySelector('.faq-bubble-overlay');
  const closeBtn = document.querySelector('.faq-bubble-close');
  const tabs = document.querySelectorAll('.faq-bubble-tab');
  const panels = {
    faq: document.querySelector('.faq-bubble-panel-faq'),
    message: document.querySelector('.faq-bubble-panel-message'),
    suggestions: document.querySelector('.faq-bubble-panel-suggestions'),
  };

  let faqBuilt = false, messageBuilt = false, suggestionsBuilt = false;

  function open() {
    overlay.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (!faqBuilt) { renderFAQTab(panels.faq); faqBuilt = true; }
  }
  function close() {
    overlay.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  function switchTab(name) {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    Object.entries(panels).forEach(([key, el]) => { el.hidden = key !== name; });
    if (name === 'message' && !messageBuilt) { renderMessageTab(panels.message); messageBuilt = true; }
    if (name === 'suggestions' && !suggestionsBuilt) { renderSuggestionsTab(panels.suggestions); suggestionsBuilt = true; }
  }

  trigger.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  tabs.forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });
}
