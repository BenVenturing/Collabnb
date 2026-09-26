import { useEffect, useState } from 'react';

export function usePersisted(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

const niches0 = (w) => ['ugc', 'spa', 'pet', 'car'].includes(w);

const list = (s) =>
  (s || '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

// Fit = 40 base + up to 50 for how many of the brief's niche tags match your niches or mission,
// + 10 if it's where you're based, + 5 if it's remote. Capped at 99.
export function fitDetails(opp, profile, mission = '') {
  const niches = [...list(profile.niches), ...list(mission.replace(/\s+/g, ','))].filter((w) => w.length > 3 || niches0(w));
  if (!opp.tags?.length || !niches.length) return null;
  const matched = opp.tags.filter((t) => niches.some((n) => t.includes(n) || n.includes(t)));
  const nicheScore = Math.round((matched.length / opp.tags.length) * 50);
  const local = !!(profile.basedIn && opp.location?.toLowerCase().includes(profile.basedIn.toLowerCase().split(',')[0].trim()));
  const remote = /remote|anywhere/i.test(opp.location || '');
  const score = Math.min(40 + nicheScore + (local ? 10 : 0) + (remote ? 5 : 0), 99);
  return { score, matched, total: opp.tags.length, nicheScore, local, remote };
}

export const fitScore = (opp, profile, mission) => fitDetails(opp, profile, mission)?.score ?? null;

export function fitExplain(d) {
  if (!d) return 'No fit score — the brief has no niche tags yet.';
  return [
    `Base 40`,
    `+${d.nicheScore} niche match (${d.matched.length}/${d.total}${d.matched.length ? `: ${d.matched.join(', ')}` : ''})`,
    d.local && '+10 where you are based',
    d.remote && '+5 remote',
  ]
    .filter(Boolean)
    .join(' · ');
}

export function detectSource(url) {
  const h = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  })();
  if (h.includes('instagram')) return 'instagram';
  if (h.includes('reddit')) return 'reddit';
  if (h === 'x.com' || h.includes('twitter')) return 'x';
  if (h.includes('threads.')) return 'threads';
  if (h.includes('docs.google') || h.includes('forms.gle') || h.includes('typeform') || h.includes('tally')) return 'form';
  if (h.includes('casting') || h.includes('backstage')) return 'casting';
  return 'link';
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Template drafter for the MVP. In production, Claude writes this from the full brief.
export function draftPitch(opp, p) {
  const who = p.name || '[your name]';
  const handle = p.handle ? `@${p.handle.replace(/^@/, '')}` : '[@handle]';
  const reach = [p.followers && `${p.followers} followers`, p.engagement && `${p.engagement} engagement`]
    .filter(Boolean)
    .join(', ');
  const niche = list(p.niches).slice(0, 2).join(' and ') || '[your niche]';
  const deliver = opp.deliverables?.length ? opp.deliverables.join(', ') : 'the deliverables in the brief';
  const past = p.pastWork ? p.pastWork.split('\n')[0].trim() : '';
  const brand = opp.brand.replace(/^Sample · /, '');

  if (opp.channel === 'dm') {
    return [
      `Hi ${brand} — saw "${opp.title}".`,
      `I'm ${who} (${handle}), I shoot ${niche} content${reach ? ` — ${reach}` : ''}.`,
      past ? `Recent: ${past}.` : null,
      `I can deliver ${deliver}${opp.dates && opp.dates !== 'Rolling' ? ` within ${opp.dates}` : ''}.`,
      `Want me to send a few examples?`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `Why you: ${niche[0].toUpperCase() + niche.slice(1)} content is most of what I make, and "${opp.title}" fits it directly.${past ? ` Most recent: ${past}.` : ''}`,
    ``,
    `Reach: ${reach || '[followers, engagement]'} on ${handle}.`,
    ``,
    `Deliverables: ${deliver}. Formats I shoot: ${p.formats || '[formats]'}.`,
    ``,
    `Availability: ${firstLine(p.availability) || opp.dates || '[dates]'}.${p.basedIn ? ` Based in ${p.basedIn}.` : ''}`,
    ``,
    `Rate: ${p.rate || opp.comp || '[rate]'}.`,
    p.portfolio ? `\nPortfolio: ${p.portfolio}` : null,
  ]
    .filter((x) => x !== null)
    .join('\n');
}

export function voiceIssues(text, profile) {
  const t = (text || '').toLowerCase();
  const issues = list(profile.banned).filter((w) => t.includes(w));
  const placeholders = ((text || '').match(/\[[^\]]+\]/g) || []).length;
  return { banned: issues, placeholders };
}

const firstLine = (s) => (s || '').split('\n').map((x) => x.trim()).find(Boolean) || '';

// Everything besides the main message: comment text, who to tag, and form answers.
export function draftExtras(opp, p) {
  const handle = p.handle ? `@${p.handle.replace(/^@/, '')}` : '';
  const niche = list(p.niches).filter((n) => n !== 'ugc').slice(0, 2).join(' + ');
  const answerFor = (field) => {
    const f = field.toLowerCase();
    if (f.includes('name')) return p.name;
    if (f.includes('email')) return p.email;
    if (f.includes('instagram') || f.includes('handle')) return handle;
    if (f.includes('follower')) return p.followers;
    if (f.includes('portfolio')) return p.portfolio;
    if (f.includes('date') || f.includes('availab')) return firstLine(p.availability);
    if (f.includes('rate')) return p.rate;
    if (f.includes('media kit')) return p.mediaKit?.name || '';
    if (f.includes('why')) {
      const past = firstLine(p.pastWork);
      return `${niche ? niche[0].toUpperCase() + niche.slice(1) : 'Travel'} content is most of what I make.${past ? ` Most recent: ${past}.` : ''}`;
    }
    return '';
  };
  return {
    comment: opp.commentKeyword ? `${opp.commentKeyword}${niche ? ` — ${niche} creator here` : ''}` : '',
    recipients: '',
    answers: (opp.fields || []).map((field) => ({ field, value: answerFor(field) || '' })),
  };
}

export function stepsReady(opp) {
  const s = opp.steps || [];
  const missing = [];
  if (s.includes('comment') && !opp.comment?.trim()) missing.push('comment');
  if (s.includes('tag')) {
    const n = (opp.recipients || '').split(/[\s,]+/).filter((x) => x.startsWith('@')).length;
    if (n < (opp.tagCount || 1)) missing.push(`tag ${opp.tagCount || 1} people`);
  }
  if (s.includes('fill_form') && (opp.answers || []).some((a) => !a.value?.trim())) missing.push('form answers');
  return missing;
}

export function daysSince(ts) {
  return ts ? Math.floor((Date.now() - ts) / 86400000) : null;
}

// What confirming a brief does: draft it, and queue it straight for sending when nothing is missing.
export function confirmPatch(opp, profile, settings) {
  const d = { ...opp, draft: draftPitch(opp, profile), ...draftExtras(opp, profile) };
  const ready = voiceIssues(d.draft, profile).placeholders === 0 && stepsReady(d).length === 0;
  return { draft: d.draft, comment: d.comment, recipients: d.recipients, answers: d.answers, status: settings?.autoSubmit && ready ? 'approved' : 'drafted' };
}

export const uid = () => Math.random().toString(36).slice(2, 10);
