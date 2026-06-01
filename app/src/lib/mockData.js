// Fallback for broken/missing listing images — warm gray placeholder
export const IMG_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23EFECE9' width='800' height='600'/%3E%3C/svg%3E";

// ─── Mock creator profile ─────────────────────────────────────────────────────
export const MOCK_CREATOR = {
  id: 'mock-benjamin',
  full_name: 'Ben Venturing',
  username: 'ben.venturing',
  email: 'benventuring@gmail.com',
  role: 'creator',
  tier: 'UGC Pro',
  bio: 'Travel & lifestyle creator documenting unique stays and hidden gems around the world. Passionate about authentic content that inspires people to explore.',
  avatar_url: '/assets/ben-venturing.png',
  follower_count: 413500,
  engagement_rate: 8.2,
  collab_count: 47,
  instagram_handle: 'ben.venturing',
  tiktok_handle: 'ben.venturing',
  youtube_handle: 'ben.venturing',
  portfolio: 'beacons.ai/benventuring',
  is_founder: true,
  beta: true,
  city: 'Asheville',
  region: 'NC',
  is_verified: false,
};

// ─── Sample host profile (always Ben Venturing on listing detail pages) ───────
// Replace avatar_url with '/assets/ben-venturing.jpg' once photo is saved there
export const SAMPLE_HOST = {
  name: 'Ben Venturing',
  username: 'ben.venturing',
  avatar_url: '/assets/ben-venturing.png',
  avatar_fallback: 'https://ucarecdn.com/6d425040-e4c3-46f0-a774-91ac597ebe24/-/format/auto/',
  role: 'Collabnb Host',
  verified: true,
  years_hosting: 3,
  review_count: 847,
  rating: 4.97,
  response_rate: 100,
  response_time: 'within an hour',
  bio: 'Travel creator and Collabnb founding host. I partner with authentic creators who love to tell honest stories about incredible places.',
};

// ─── Sample listings (6 properties with full detail-page data) ────────────────
export const SAMPLE_LISTINGS = [
  {
    id: '1',
    title: 'Glacier Prime Cabin',
    subtitle: 'Rustic cabin in old-growth forest',
    location: 'Lake Tahoe, CA',
    property_type: 'Cabin',
    is_featured: true,
    rating: 4.97,
    review_count: 84,

    compensation: 'Free Stay · 3 nights',
    compensation_type: 'free',
    cash_amount: null,

    collab_type: 'UGC Video',
    creator_tier: 'UGC Pro',
    deliverables: '3 Reels, 5 Photos, 1 Blog Post',
    deliverable_count: 9,
    deliverable_load: 'Moderate',
    dates_available: 'Feb–Apr 2026',
    due_days: 14,

    image: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=1200&q=85',
      'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80',
      'https://images.unsplash.com/photo-1480497490787-505ec076689f?w=800&q=80',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    ],

    about: 'A stunning old-growth forest cabin perched above Lake Tahoe with sweeping mountain and lake views. Floor-to-ceiling windows, a stone fireplace, and a private hot tub make this the perfect backdrop for authentic travel content. Surrounded by towering pines with ski slopes just 10 minutes away.',

    amenities: [
      { icon: '♨️', label: 'Private hot tub' },
      { icon: '🔥', label: 'Stone fireplace' },
      { icon: '⛷️', label: 'Ski storage' },
      { icon: '🏔️', label: 'Mountain views' },
      { icon: '🍳', label: 'Full kitchen' },
      { icon: '🐕', label: 'Pet friendly' },
      { icon: '📶', label: 'High-speed WiFi' },
      { icon: '🅿️', label: 'Free parking' },
    ],

    what_you_get: [
      '3 nights complimentary stay',
      'Private hot tub access',
      'Ski equipment storage',
      'Welcome provisions basket',
      'Late checkout (2pm)',
    ],
    what_you_deliver: '9 total deliverables across 3 formats (Moderate load)',

    requirements: [
      'Minimum 10,000 followers on primary platform',
      'UGC Pro or higher creator tier',
      'Content must tag @collabnb and property handle',
      'All posts submitted within 14 days of checkout',
      'Horizontal + vertical format for each reel',
    ],

    location_full: 'Lake Tahoe, El Dorado County, California',
    lat: 38.9399,
    lng: -119.9772,
  },
  {
    id: '2',
    title: 'Tranquil Waterfront Retreat',
    subtitle: 'Patagonian lakefront villa with private infinity pool',
    location: 'Bariloche, Argentina',
    property_type: 'Villa',
    is_featured: true,
    rating: 4.93,
    review_count: 112,

    compensation: 'Free Stay · 2 nights',
    compensation_type: 'free',
    cash_amount: null,

    collab_type: 'Instagram Reels',
    creator_tier: 'Micro Influencer',
    deliverables: '2 Reels, 8 Photos',
    deliverable_count: 10,
    deliverable_load: 'Moderate',
    dates_available: 'Jan–Mar 2026',
    due_days: 10,

    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=85',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
      'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80',
      'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&q=80',
    ],

    about: 'A stunning Patagonian lakefront villa perched on the shores of Nahuel Huapi Lake with sweeping views of the Andes. The infinity pool seems to merge with the crystal-clear mountain water. Features a chef\'s kitchen, wraparound deck with lake access, and private dock. Golden hour over the Cerro Catedral peaks is pure magic.',

    amenities: [
      { icon: '🏊', label: 'Infinity pool' },
      { icon: '🏔️', label: 'Andean lake views' },
      { icon: '👨‍🍳', label: "Chef's kitchen" },
      { icon: '🛶', label: 'Private dock & kayaks' },
      { icon: '🔥', label: 'Lakeside fire pit' },
      { icon: '🍽️', label: 'Outdoor parrilla grill' },
      { icon: '📶', label: 'High-speed WiFi' },
      { icon: '🚗', label: 'Gated parking' },
    ],

    what_you_get: [
      '2 nights complimentary stay',
      'Infinity pool exclusive access',
      'Private dock & kayak access',
      'Welcome Argentine wine & provisions',
      'Personal concierge for shoot scheduling',
    ],
    what_you_deliver: '10 total deliverables across 2 formats (Moderate load)',

    requirements: [
      'Minimum 5,000 followers on Instagram',
      'Micro Influencer or higher creator tier',
      'At least 2 reels must feature the lake or mountain view',
      'All posts must go live within 10 days of checkout',
      'Include location tag and @collabnb in all posts',
    ],

    location_full: 'Bariloche, Río Negro Province, Argentina',
    lat: -41.1335,
    lng: -71.3103,
  },
  {
    id: '4',
    title: 'Mountain Lodge Escape',
    subtitle: 'Jungle mountain luxury with panoramic views',
    location: 'Chiang Mai, Thailand',
    property_type: 'Lodge',
    is_featured: true,
    rating: 4.95,
    review_count: 203,

    compensation: '$500 Cash',
    compensation_type: 'cash',
    cash_amount: 500,

    collab_type: 'YouTube Vlog',
    creator_tier: 'UGC Pro',
    deliverables: '5 Reels, 12 Photos, 1 YouTube Vlog',
    deliverable_count: 18,
    deliverable_load: 'Heavy',
    dates_available: 'Nov–Feb 2026',
    due_days: 21,

    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=85',
      'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80',
      'https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=800&q=80',
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
      'https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=800&q=80',
    ],

    about: 'A breathtaking jungle mountain lodge in the hills above Chiang Mai with panoramic views of Doi Suthep and mist-covered rice terraces. Open-air design with soaring teak ceilings, a natural stone infinity pool, and a private outdoor sala for yoga and meditation. Includes a personal chef for Northern Thai cooking and guided jungle treks. The golden light over the mountains at sunset is unforgettable.',

    amenities: [
      { icon: '🏊', label: 'Infinity pool' },
      { icon: '🌿', label: 'Jungle mountain views' },
      { icon: '🧘', label: 'Yoga sala' },
      { icon: '🔥', label: 'Outdoor fire pit' },
      { icon: '👨‍🍳', label: 'Private chef' },
      { icon: '🥾', label: 'Guided jungle treks' },
      { icon: '🍜', label: 'Thai cooking class' },
      { icon: '📶', label: 'High-speed Starlink WiFi' },
    ],

    what_you_get: [
      '$500 cash payment upon content approval',
      'Complimentary 3-night stay included',
      'Daily private chef meals',
      'Guided Doi Suthep sunrise trek',
      'Professional behind-the-scenes stills',
    ],
    what_you_deliver: '18 total deliverables across 3 formats (Heavy load)',

    requirements: [
      'Minimum 25,000 followers across platforms',
      'UGC Pro or higher creator tier',
      'YouTube vlog must be minimum 8 minutes',
      'All content submitted within 21 days of checkout',
      'Must feature both interior and jungle mountain exterior shots',
    ],

    location_full: 'Chiang Mai, Thailand',
    lat: 18.7883,
    lng: 98.9853,
  },
  {
    id: '7',
    title: 'Vineyard Wine Estate',
    subtitle: 'Private villa on a working South African estate',
    location: 'Stellenbosch, South Africa',
    property_type: 'Estate',
    is_featured: true,
    rating: 4.96,
    review_count: 129,

    compensation: '$800 Cash',
    compensation_type: 'cash',
    cash_amount: 800,

    collab_type: 'Full Package',
    creator_tier: 'Macro',
    deliverables: '3 Reels, 8 Photos, 1 YouTube Video',
    deliverable_count: 12,
    deliverable_load: 'Moderate',
    dates_available: 'Mar–Nov 2026',
    due_days: 14,

    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200&q=85',
      'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&q=80',
      'https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?w=800&q=80',
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80',
      'https://images.unsplash.com/photo-1601821765780-754fa98637c1?w=800&q=80',
    ],

    about: 'An opulent Cape Dutch-style private villa set within a working Stellenbosch wine estate with dramatic views of the Jonkershoek Valley and Table Mountain in the distance. Wake up to rows of Cabernet Sauvignon and Chenin Blanc vines stretching toward the mountains. Includes exclusive barrel room access, private wine tastings with a master sommelier, and guided vineyard tours. The warm golden hour light over the Cape Winelands is among the most cinematic in the world.',

    amenities: [
      { icon: '🍷', label: 'Private wine tasting' },
      { icon: '🌿', label: 'Vineyard access' },
      { icon: '🏊', label: 'Heated estate pool' },
      { icon: '👨‍🍳', label: "Chef's kitchen" },
      { icon: '🧀', label: 'Master sommelier' },
      { icon: '🛋️', label: 'Wine cellar suite' },
      { icon: '🏔️', label: 'Table Mountain views' },
      { icon: '📶', label: 'High-speed WiFi' },
    ],

    what_you_get: [
      '$800 cash payment upon content approval',
      'Complimentary 2-night estate stay',
      'Private vineyard & barrel room tour',
      'Hosted wine tasting (up to 4 guests)',
      'Exclusive golden-hour access to vine rows',
    ],
    what_you_deliver: '12 total deliverables across 3 formats (Moderate load)',

    requirements: [
      'Minimum 100,000 followers on primary platform',
      'Macro creator tier required',
      'All content must be aspirational and brand-aligned',
      'YouTube video minimum 10 minutes with vineyard B-roll',
      'Content submitted within 14 days of checkout',
    ],

    location_full: 'Stellenbosch, Western Cape, South Africa',
    lat: -33.9364,
    lng: 18.8605,
  },
  {
    id: '5',
    title: 'Lakeside Forest Treehouse',
    subtitle: 'Elevated treehouse above a private lake',
    location: 'Asheville, NC',
    property_type: 'Treehouse',
    is_featured: false,
    rating: 4.99,
    review_count: 41,

    compensation: '$1,000 Cash',
    compensation_type: 'cash',
    cash_amount: 1000,

    collab_type: 'Photography',
    creator_tier: 'UGC Pro',
    deliverables: '2 Reels, 6 Photos, 2 Stories',
    deliverable_count: 10,
    deliverable_load: 'Light',
    dates_available: 'Apr–Jun 2026',
    due_days: 7,

    image: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1200&q=85',
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
      'https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80',
    ],

    about: 'A one-of-a-kind treehouse elevated 30 feet above a glassy private lake in the Blue Ridge Mountains. Accessed by a rope bridge, with glass floors and a wraparound deck. Kayaks and paddleboards are included. The mist rolling across the lake at dawn creates some of the most ethereal photography conditions anywhere in the Southeast.',

    amenities: [
      { icon: '🚣', label: 'Kayaks included' },
      { icon: '🌲', label: 'Private lake access' },
      { icon: '🌄', label: 'Blue Ridge views' },
      { icon: '🔥', label: 'Lakeside fire pit' },
      { icon: '🚿', label: 'Outdoor shower' },
      { icon: '🛤️', label: 'Forest hiking trails' },
      { icon: '⚡', label: 'Off-grid solar power' },
      { icon: '📵', label: 'Digital detox ready' },
    ],

    what_you_get: [
      '$1,000 cash payment upon content approval',
      'Complimentary 2-night treehouse stay',
      'Kayaks & paddleboards included',
      'Lakeside bonfire kit',
      'Sunrise golden-hour photography access',
    ],
    what_you_deliver: '10 total deliverables across 3 formats (Light load)',

    requirements: [
      'Minimum 10,000 followers on primary platform',
      'Strong photography portfolio required',
      'Content must capture dawn/dusk lighting conditions',
      'All posts submitted within 7 days of checkout',
      'High-resolution files (minimum 4K) for all photos',
    ],

    location_full: 'Asheville, Buncombe County, North Carolina',
    lat: 35.5951,
    lng: -82.5515,
  },
  {
    id: '6',
    title: 'Desert Dome Glamping',
    subtitle: 'Geodesic dome on the Mediterranean coast',
    location: 'Paphos, Cyprus',
    property_type: 'Glamping',
    is_featured: false,
    rating: 4.91,
    review_count: 78,

    compensation: '$500 Cash',
    compensation_type: 'cash',
    cash_amount: 500,

    collab_type: 'Instagram Reels',
    creator_tier: 'Micro Influencer',
    deliverables: '1 Reel, 4 Photos',
    deliverable_count: 5,
    deliverable_load: 'Light',
    dates_available: 'Year-round',
    due_days: 7,

    image: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1200&q=85',
      'https://images.unsplash.com/photo-1525130413817-d45c1d127c42?w=800&q=80',
      'https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&q=80',
      'https://images.unsplash.com/photo-1585970480901-90d6bb2a48b5?w=800&q=80',
      'https://images.unsplash.com/photo-1532339142463-fd0a8979791a?w=800&q=80',
    ],

    about: 'A stunning geodesic glass dome perched on a hillside above the Paphos coastline with sweeping views of the Mediterranean Sea. The transparent roof turns stargazing into a nightly spectacle under some of the clearest skies in Europe. Features an outdoor rain-style shower, a stone-built meditation terrace, and a private fire pit surrounded by olive trees and ancient cypress groves. Minutes from the tomb-lined ruins of Kato Paphos.',

    amenities: [
      { icon: '🌌', label: 'Mediterranean stargazing' },
      { icon: '🔥', label: 'Private fire pit' },
      { icon: '🧘', label: 'Stone meditation terrace' },
      { icon: '🚿', label: 'Outdoor rain shower' },
      { icon: '🌊', label: 'Sea views' },
      { icon: '☀️', label: 'Solar-powered dome' },
      { icon: '🫒', label: 'Olive grove trails' },
      { icon: '🏛️', label: 'Ancient ruins nearby' },
    ],

    what_you_get: [
      '$500 cash payment upon content approval',
      'Complimentary 1-night dome stay',
      'Guided stargazing session',
      'Mediterranean provisions & fire kit',
      'Sunrise vantage point access',
    ],
    what_you_deliver: '5 total deliverables across 2 formats (Light load)',

    requirements: [
      'Minimum 5,000 followers on Instagram',
      'Micro Influencer or higher creator tier',
      'At least 1 reel must feature coastal or night sky footage',
      'All posts submitted within 7 days of checkout',
      'Tag @collabnb and property in all posts',
    ],

    location_full: 'Paphos, Cyprus',
    lat: 34.7754,
    lng: 32.4218,
  },
];

// ─── Collaboration lifecycle stages ────────────────────────────────────────────
export const STAGES = [
  { key: 'pending',         label: 'Pending',           icon: '🟡' },
  { key: 'accepted',        label: 'Accepted',          icon: '📋' },
  { key: 'updated',         label: 'Adjustments',       icon: '🔄' },
  { key: 'uploaded_tagged', label: 'Uploaded',          icon: '🔵' },
  { key: 'closed',          label: 'Closed',            icon: '🟢' },
  { key: 'archived',        label: 'Archived',          icon: '📦' },
];

// ─── Demo stage explanations (graphic icon cards for the demo collab) ─────────
export const DEMO_STAGE_CARDS = {
  pending: {
    icon: '✉️',
    title: 'Application Sent',
    description: 'Your pitch has been submitted to the host. They\'ll review your profile, portfolio, and message before deciding.',
    tip: 'Tip: A personalized message with specific content ideas increases acceptance rates by 3x.',
  },
  accepted: {
    icon: '🤝',
    title: 'Collaboration Accepted',
    description: 'The host loved your pitch! Now it\'s time to share your drive link and start planning your content.',
    tip: 'Tip: Share a Google Drive folder early so the host can follow along with your progress.',
  },
  updated: {
    icon: '🔄',
    title: 'Adjustments Requested',
    description: 'Review and adjust the agreed deliverables — reels, photos, blog posts. Changes are shared with the host for approval.',
    tip: 'Tip: Clear communication about changes builds trust. Explain why each adjustment helps the content perform better.',
  },
  uploaded_tagged: {
    icon: '📸',
    title: 'Uploaded',
    description: 'All content is uploaded and ready for host review. Cross-check the deliverable list one more time before requesting approval.',
    tip: 'Tip: Always tag @collabnb and the property — it helps both parties\' reach.',
  },
  closed: {
    icon: '✅',
    title: 'Collaboration Complete',
    description: 'Both parties confirmed everything looks great. Payment is released and the collab is wrapped up.',
    tip: 'Tip: A happy host = future referrals. Send a thank-you note after closing.',
  },
  archived: {
    icon: '📦',
    title: 'Archived',
    description: 'This collaboration is safely stored in your archive. You can revisit any stage details anytime.',
    tip: 'Tip: Archived collabs make great portfolio pieces for future applications.',
  },
};

function makeStages(completedUpTo, notes = {}) {
  const keys = ['pending', 'accepted', 'updated', 'uploaded_tagged', 'closed', 'archived'];
  return Object.fromEntries(keys.map((k, i) => [
    k, {
      completed: i <= keys.indexOf(completedUpTo),
      date: i <= keys.indexOf(completedUpTo) ? (notes[k]?.date || '—') : null,
      note: notes[k]?.note || '',
    }
  ]));
}

// ─── Sample collaborations ────────────────────────────────────────────────────
export const SAMPLE_COLLABORATIONS = [
  {
    id: 1,
    listing_id: '1',
    property_name: 'Glacier Prime Cabin',
    location: 'Lake Tahoe, CA',
    host_name: 'Ben Venturing',
    image: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80',
    status: 'pending',
    status_text: 'Pending Upload',
    dates: 'Feb 15–18, 2026',
    deliverables: '3 Reels, 5 Photos, 1 Blog Post',
    days_left: 12,
    is_active: true,
    is_sample: true,
    current_stage: 'pending',
    stages: makeStages('pending', {
      pending: { date: 'Feb 1, 2026', note: 'Application submitted — waiting for host response' },
    }),
    drive_url: '',
    content_stats: null,
    contract_id: null,
    listing_description: 'A stunning old-growth forest cabin perched above Lake Tahoe with sweeping mountain and lake views.',
  },
  {
    id: 2,
    listing_id: '2',
    property_name: 'Tranquil Waterfront Retreat',
    location: 'Bariloche, Argentina',
    host_name: 'Ben Venturing',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    status: 'uploaded',
    status_text: 'Uploaded',
    dates: 'Jan 28–31, 2026',
    deliverables: '2 Reels, 8 Photos',
    days_left: 0,
    is_active: true,
    is_sample: true,
    current_stage: 'uploaded_tagged',
    stages: makeStages('uploaded_tagged', {
      pending:         { date: 'Jan 5, 2026',  note: 'Application submitted and accepted' },
      accepted:        { date: 'Jan 8, 2026',  note: 'Host confirmed the collaboration' },
      updated:         { date: 'Jan 15, 2026', note: 'Content plan submitted and reviewed' },
      uploaded_tagged: { date: 'Feb 1, 2026',  note: 'All content uploaded and tagged' },
    }),
    drive_url: 'https://drive.google.com/drive/folders/example123',
    content_stats: { reels: 2, photos: 8 },
    contract_id: null,
    listing_description: 'A breathtaking cliffside villa perched above the Pacific Ocean with unobstructed views from every room.',
  },
  {
    id: 3,
    listing_id: '4',
    property_name: 'Mountain Lodge Escape',
    location: 'Chiang Mai, Thailand',
    host_name: 'Ben Venturing',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    status: 'archived',
    status_text: 'Archived',
    dates: 'Jan 10–13, 2026',
    deliverables: '5 Reels, 12 Photos, 1 YouTube Vlog',
    days_left: null,
    payment: '$500',
    is_active: false,
    current_stage: 'archived',
    stages: makeStages('archived', {
      pending:         { date: 'Dec 20, 2025', note: 'Application submitted and accepted' },
      accepted:        { date: 'Dec 22, 2025', note: 'Host confirmed the collaboration' },
      updated:         { date: 'Dec 28, 2025', note: 'Content plan submitted and reviewed' },
      uploaded_tagged: { date: 'Jan 15, 2026', note: 'All content uploaded and tagged' },
      closed:          { date: 'Jan 20, 2026', note: 'Content approved — payment released' },
      archived:        { date: 'Jan 25, 2026', note: 'Collaboration completed and archived' },
    }),
    drive_url: '',
    content_stats: { reels: 5, photos: 12, youtube_vlog: 1 },
    contract_id: null,
    listing_description: 'Ski-in, ski-out luxury lodge at the base of Aspen Mountain with panoramic views.',
  },
];

// ─── Demo collaboration (guided tour, all stages pre-filled) ──────────────────
export const DEMO_COLLAB = {
  id: 'demo',
  listing_id: 'demo',
  property_name: 'Collabnb Demo Tour',
  location: 'San Francisco, CA',
  host_name: 'Collabnb Guide',
  image: 'https://images.unsplash.com/photo-1502780809386-6e8c1d349d15?w=800&q=80',
  status: 'demo',
  status_text: 'Demo',
  dates: 'Anytime',
  deliverables: 'Interactive Tour',
  days_left: null,
  payment: null,
  is_active: true,
  is_demo: true,
  current_stage: 'pending',
  stages: {
    pending:         { completed: true,  date: 'Now',     note: 'You are here — your application is ready for review.' },
    accepted:        { completed: false, date: null,      note: '' },
    updated:         { completed: false, date: null,      note: '' },
    uploaded_tagged: { completed: false, date: null,      note: '' },
    closed:          { completed: false, date: null,      note: '' },
    archived:        { completed: false, date: null,      note: '' },
  },
  drive_url: '',
  content_stats: null,
  contract_id: null,
  listing_description: 'Welcome to Collabnb! This demo walks you through the entire collaboration lifecycle — from application to archive. Click the auto-advance play button or tap each stage dot to explore.',
};

// ─── Thread message histories ─────────────────────────────────────────────────
export const THREAD_MESSAGES = {
  t1: [
    { id: 'm1', from: 'host', text: "Hi Ben! We loved your portfolio — would love to have you at Glacier Prime this season.", time: 'Apr 16 · 8:45 AM' },
    { id: 'm2', from: 'me', text: "Thanks so much! I've been eyeing this property for a while. The morning fog over Lake Tahoe would make incredible content.", time: 'Apr 16 · 10:12 AM' },
    { id: 'm3', from: 'host', text: "Exactly what we had in mind. We'd love 3 reels and a collection of photos. Does Feb 15–18 work for you?", time: 'Apr 17 · 9:14 AM' },
    { id: 'm4', from: 'me', text: "Yes, those dates are perfect! I'll have my content plan to you by end of week.", time: 'Apr 17 · 10:02 AM' },
    { id: 'm5', from: 'host', text: "Amazing. We've got the whole cabin reserved just for the shoot. Let me know if you need any gear access.", time: 'Apr 18 · 2:31 PM' },
    { id: 'm6', from: 'me', text: "That's so helpful, thank you. I'm planning 3 reels and a long-form vlog — golden hour exteriors are top of my list.", time: 'Apr 18 · 3:45 PM' },
    { id: 'm7', from: 'host', text: "Looking forward to the shoot next week! We'll have breakfast ready when you arrive.", time: 'Apr 19 · 8:07 AM' },
  ],
};

// ─── Sample inbox threads ─────────────────────────────────────────────────────
// One sample conversation to showcase the messaging experience
export const SAMPLE_THREADS = [
  {
    id: 't1',
    listing_title: 'Glacier Prime Cabin',
    host_name: 'Sarah at Glacier Stays',
    host_avatar: null,
    tag: 'Collab',
    last_message: 'Looking forward to the shoot next week!',
    timestamp: 'Apr 19',
    unread: 0,
    is_founder: true,
    collab_id: 1,
    is_sample: true,
  },
];
