export const SOURCES = {
  instagram: { label: 'Instagram', hue: 'pink' },
  casting: { label: 'Casting board', hue: 'amber' },
  reddit: { label: 'Reddit', hue: 'orange' },
  x: { label: 'X', hue: 'slate' },
  threads: { label: 'Threads', hue: 'slate' },
  form: { label: 'Form', hue: 'violet' },
  link: { label: 'Link', hue: 'sky' },
};

export const STAGES = ['found', 'drafted', 'approved', 'sent', 'replied', 'booked'];

export const STAGE_LABEL = {
  found: 'Found',
  drafted: 'Drafted',
  approved: 'Approved',
  sent: 'Sent',
  replied: 'Replied',
  booked: 'Booked',
  skipped: 'Skipped',
};

// Every application is a sequence of browser steps the agent performs.
export const STEP_KINDS = {
  read_caption: { label: 'Read caption & rules', icon: 'eye', desc: 'Reads the post so it knows exactly what the brand asks for.' },
  follow: { label: 'Follow', icon: 'follow', desc: 'Follows the brand account — many posts require it.' },
  like: { label: 'Like post', icon: 'heart', desc: 'Likes the post when the caption asks for it.' },
  comment: { label: 'Comment', icon: 'comment', needs: 'comment', desc: 'Leaves the comment the caption asks for, like a keyword.' },
  tag: { label: 'Tag people', icon: 'at', needs: 'recipients', desc: 'Tags people in a comment. You always choose who.' },
  share_story: { label: 'Share to story', icon: 'story', desc: 'Shares the post to your story.' },
  dm: { label: 'Send DM', icon: 'send', needs: 'message', desc: 'Sends your pitch as a direct message.' },
  open_link: { label: 'Open link', icon: 'external', desc: 'Opens the application link (bio link, form, site).' },
  fill_form: { label: 'Fill form', icon: 'form', needs: 'answers', desc: 'Fills a Google Form, Typeform, Jotform or site form from your profile.' },
  submit: { label: 'Submit', icon: 'check', desc: 'Submits the application.' },
};

export const FORM_TYPES = {
  google: 'Google Form',
  typeform: 'Typeform',
  jotform: 'Jotform',
  site: 'Site form',
};

export const DEFAULT_PROFILE = {
  name: '',
  handle: '',
  email: '',
  followers: '',
  engagement: '',
  basedIn: '',
  niches: 'travel, hotels, lifestyle, ugc',
  formats: 'Reels, TikToks, photo sets',
  pastWork: '',
  rate: '',
  portfolio: '',
  links: '',
  availability: '',
  mediaKit: null,
  voiceSamples: '',
  banned: 'elevate, unlock, stunning, breathtaking, vibrant, seamless, game-changer, journey, delve, passionate about, dream collab, hope this finds you well',
  travel: '',
  turnaround: '',
  deals: '',
  onboarded: false,
  updatedAt: null,
};

// Tags brands post under when they're hiring. Creator-side tags (#ugccreator, #hireugc) are
// mostly creators advertising themselves, so they're searched last.
export const DEFAULT_TAGS = {
  hiring: ['creatorsearch', 'castingcall', 'ugcjobs', 'ugccasting', 'creatorswanted', 'lookingforcreators', 'influencercasting', 'ambassadorsearch', 'brandambassadorsearch', 'nowcasting', 'ugcopportunity', 'paidcollab'],
  community: ['ugccreator', 'ugccommunity', 'ugcmarketing', 'paidugc'],
  phrases: ['looking for UGC creators', 'UGC creators wanted', 'creator search', 'casting call creators', 'hiring UGC creators', 'seeking influencers', 'looking for travel creators'],
};

export const DEFAULT_SETTINGS = {
  notify: 'telegram',
  notifyHandle: '',
  caps: { follows: 20, comments: 10, dms: 15, applications: 10 },
  pace: 'human',
  mission: '',
  autoSubmit: true,
  sources: { instagram: true, x: true, threads: true, reddit: true },
  loopHours: 0,
  tags: DEFAULT_TAGS,
  theme: { c1: '#22d3ee', c2: '#a78bfa', c3: '#fb923c' },
};

export const THEME_PRESETS = [
  { name: 'Sunset glass', c1: '#22d3ee', c2: '#a78bfa', c3: '#fb923c' },
  { name: 'Lagoon', c1: '#2dd4bf', c2: '#38bdf8', c3: '#818cf8' },
  { name: 'Retro diner', c1: '#f43f5e', c2: '#facc15', c3: '#14b8a6' },
  { name: 'Desert', c1: '#f59e0b', c2: '#e11d48', c3: '#7c3aed' },
  { name: 'Mint neon', c1: '#4ade80', c2: '#22d3ee', c3: '#e879f9' },
];

export const DEFAULT_FORM_FIELDS = ['Full name', 'Email', 'Instagram handle', 'Followers', 'Portfolio link', 'Available dates', 'Why are you a fit?', 'Rate'];
