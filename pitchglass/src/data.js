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

const FORM_FIELDS = ['Full name', 'Email', 'Instagram handle', 'Followers', 'Portfolio link', 'Available dates', 'Why are you a fit?', 'Rate'];

// Fictional sample briefs so the MVP has something to show. Real sources plug in later.
const RAW_POOL = [
  {
    source: 'threads', brand: '@nomad.kitchen', title: 'Threads post: paid UGC for a travel cookware line',
    oneLiner: 'Cookware brand paying $180 per video for travel-cooking UGC; reply with your handle, then they DM.',
    caption: 'Hiring UGC creators for our travel cookware launch. $180/video. Reply with your handle + niche and we will DM you.',
    location: 'Remote', dates: 'Nov – Dec', comp: '$180 per video',
    deliverables: ['2 UGC videos'], requirements: 'Travel, food or lifestyle',
    tags: ['travel', 'food', 'ugc'], channel: 'dm', commentKeyword: 'Interested',
    steps: ['read_caption', 'comment', 'dm'],
  },
  {
    source: 'instagram', brand: '@salt.and.stone', title: '"Looking for UGC creators" post',
    oneLiner: 'Skincare brand paying $150–250 per 30s UGC video; caption says comment UGC, then DM.',
    caption: 'We’re looking for UGC creators! Comment “UGC” and DM us your portfolio',
    commentKeyword: 'UGC', location: 'Remote', dates: 'Rolling', comp: '$150–$250 per video',
    deliverables: ['1 UGC video (30s)'], requirements: 'Skincare or lifestyle, any size',
    tags: ['lifestyle', 'beauty', 'ugc'], channel: 'dm',
    steps: ['read_caption', 'follow', 'comment', 'dm'],
  },
  {
    source: 'casting', brand: 'Harbour Resort Group', title: 'Resort travel influencer campaign',
    oneLiner: 'Queensland resort flying 3 travel creators out for 5 nights; apply through a Jotform.',
    location: 'Queensland, Australia', dates: 'Dec 1 – Dec 6', comp: 'Flights + stay + fee',
    deliverables: ['3 Reels', '1 TikTok', 'Raw footage'], requirements: 'Travel niche, 25K+ followers, AU based preferred',
    tags: ['travel', 'resort', 'lifestyle'], channel: 'form', formType: 'jotform', fields: FORM_FIELDS,
    steps: ['open_link', 'fill_form', 'submit'],
  },
  {
    source: 'instagram', brand: '@coastline.villas', title: 'Creator search — comment + tag to apply',
    oneLiner: 'Villa group picking 5 creators for free stays; comment CREATOR, tag 2 people, then Typeform in bio.',
    caption: 'Creators wanted. 1) Follow us 2) Comment “CREATOR” and tag 2 creator friends 3) Apply via link in bio',
    commentKeyword: 'CREATOR', tagCount: 2, location: 'Mallorca, Spain', dates: 'Feb – Apr', comp: 'Free stay (4 nights)',
    deliverables: ['2 Reels', '5 stills'], requirements: 'Travel or lifestyle, 5K+ followers',
    tags: ['travel', 'hotels', 'lifestyle'], channel: 'form', formType: 'typeform', fields: FORM_FIELDS,
    steps: ['read_caption', 'follow', 'comment', 'tag', 'open_link', 'fill_form', 'submit'],
  },
  {
    source: 'reddit', brand: 'r/UGCcreators', title: 'Coffee brand needs 5 creators this month',
    oneLiner: 'Specialty coffee brand paying $100 + product for one unboxing video; DM the poster.',
    location: 'Remote', dates: 'Due Oct 30', comp: '$100 + product',
    deliverables: ['1 unboxing video'], requirements: 'Food or lifestyle',
    tags: ['food', 'lifestyle', 'ugc'], channel: 'dm', steps: ['read_caption', 'dm'],
  },
  {
    source: 'x', brand: '@wanderdesk', title: 'Co-working hotel launch — creators wanted',
    oneLiner: 'Bali co-working hotel offering 7 free nights to remote-work creators; DM to apply.',
    location: 'Bali, Indonesia', dates: 'Jan 10 – Jan 17', comp: 'Free stay (7 nights)',
    deliverables: ['1 Reel', '1 YouTube short', 'Blog post'], requirements: 'Remote-work or travel creators',
    tags: ['travel', 'hotels', 'remote work'], channel: 'dm', steps: ['read_caption', 'follow', 'dm'],
  },
  {
    source: 'form', brand: 'Tidewater Surf Co.', title: 'Ambassador application',
    oneLiner: 'Surf brand ambassador program: gear + 15% affiliate for 2 posts a month; Google Form.',
    location: 'Anywhere coastal', dates: 'Closes Oct 15', comp: 'Gear + 15% affiliate',
    deliverables: ['2 posts / month'], requirements: 'Outdoor, surf, travel',
    tags: ['outdoor', 'travel', 'lifestyle'], channel: 'form', formType: 'google', fields: FORM_FIELDS,
    steps: ['fill_form', 'submit'],
  },
  {
    source: 'instagram', brand: '@lumen.glamping', title: 'Reel: "DM us COLLAB"',
    oneLiner: 'Glamping site trading 2 nights for a Reel; caption asks you to DM the word COLLAB.',
    caption: 'Content creators — DM us “COLLAB” with your best travel Reel',
    location: 'Cotswolds, UK', dates: 'Oct – Dec', comp: 'Free stay (2 nights)',
    deliverables: ['1 Reel', '3 Stories'], requirements: 'Travel, outdoor',
    tags: ['travel', 'outdoor', 'hotels'], channel: 'dm', steps: ['read_caption', 'dm'],
  },
  {
    source: 'form', brand: 'Fernweh Hotels', title: 'Creator program (Jotform)',
    oneLiner: 'Boutique hotel chain building a creator roster for 2027 stays; long Jotform.',
    location: 'Germany + Austria', dates: '2027 season', comp: 'Stays + paid usage',
    deliverables: ['Varies by stay'], requirements: 'Hotel or travel niche, media kit required',
    tags: ['hotels', 'travel'], channel: 'form', formType: 'jotform', fields: [...FORM_FIELDS, 'Media kit upload'],
    steps: ['open_link', 'fill_form', 'submit'],
  },
  {
    source: 'casting', brand: 'Azure Charters', title: 'Yacht day content shoot',
    oneLiner: 'Charter company needs 2 creators for a one-day sailing shoot, $400 each.',
    location: 'Split, Croatia', dates: 'May 12', comp: '$400 + day on board',
    deliverables: ['1 Reel', '20 stills', 'Raw footage'], requirements: 'Travel or lifestyle, comfortable on camera',
    tags: ['travel', 'lifestyle'], channel: 'form', formType: 'site', fields: FORM_FIELDS,
    steps: ['open_link', 'fill_form', 'submit'],
  },
  {
    source: 'instagram', brand: '@pantry.co', title: 'Story share + form to apply',
    oneLiner: 'Snack brand sending product to 20 UGC creators; share their post to story, then Google Form.',
    caption: 'UGC creators: share this to your story + fill the form in our bio to get a box',
    location: 'US only', dates: 'Rolling', comp: 'Product + $75',
    deliverables: ['1 UGC video'], requirements: 'US based, food or lifestyle',
    tags: ['food', 'ugc', 'lifestyle'], channel: 'form', formType: 'google', fields: FORM_FIELDS,
    steps: ['read_caption', 'share_story', 'open_link', 'fill_form', 'submit'],
  },
  {
    source: 'form', brand: 'Northwind Luggage', title: 'UGC creator brief (Typeform)',
    oneLiner: 'Luggage brand paying $200 per travel-day UGC video; short Typeform.',
    location: 'Remote', dates: 'Nov', comp: '$200 per video',
    deliverables: ['2 UGC videos'], requirements: 'Travel niche, owns a carry-on',
    tags: ['travel', 'ugc'], channel: 'form', formType: 'typeform', fields: FORM_FIELDS,
    steps: ['fill_form', 'submit'],
  },
  {
    source: 'x', brand: '@staycation.club', title: 'Hotel collective looking for UGC creators',
    oneLiner: 'Boutique hotel collective booking weekend stays for UGC sets they run as ads; DM with portfolio.',
    caption: 'We are looking for UGC creators for our partner hotels. Weekend stay + $150. DM your portfolio.',
    location: 'US + Canada', dates: 'Oct 20 – Dec 15', comp: 'Free stay + $150',
    deliverables: ['3 UGC videos', 'Ad usage 6 months'], requirements: 'UGC or travel',
    tags: ['ugc', 'hotels', 'travel'], channel: 'dm', steps: ['read_caption', 'follow', 'dm'],
  },
  {
    source: 'x', brand: '@railpass.eu', title: 'Rail trip creators thread',
    oneLiner: 'Rail pass brand gifting 10-day passes to travel creators; reply and DM.',
    location: 'Europe', dates: 'Mar – May', comp: '10-day rail pass',
    deliverables: ['3 Reels', '1 carousel'], requirements: 'Travel niche, EU trip planned',
    tags: ['travel'], channel: 'dm', steps: ['read_caption', 'dm'],
  },
];

export const SAMPLE_POOL = RAW_POOL.map((o) => ({ ...o, brand: `Sample · ${o.brand}` }));
