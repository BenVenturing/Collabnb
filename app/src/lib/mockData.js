// ─── Mock creator profile ─────────────────────────────────────────────────────
export const MOCK_CREATOR = {
  id: 'mock-benjamin',
  full_name: 'Ben Venturing',
  username: 'ben.venturing',
  email: 'benventuring@gmail.com',
  role: 'creator',
  tier: 'UGC Pro',
  bio: 'Travel & lifestyle creator documenting unique stays and hidden gems around the world. Passionate about authentic content that inspires people to explore.',
  avatar_url: 'https://ucarecdn.com/6d425040-e4c3-46f0-a774-91ac597ebe24/-/format/auto/',
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
};

// ─── Sample host profile (always Ben Venturing on listing detail pages) ───────
// Replace avatar_url with '/assets/ben-venturing.jpg' once photo is saved there
export const SAMPLE_HOST = {
  name: 'Ben Venturing',
  username: 'ben.venturing',
  avatar_url: '/assets/ben-venturing.jpg',
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
    subtitle: 'Cliffside villa with private infinity pool',
    location: 'Malibu, CA',
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
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
    ],

    about: "A breathtaking cliffside villa perched above the Pacific Ocean with unobstructed views from every room. The infinity pool seems to spill directly into the sea. Features a chef's kitchen, wraparound deck, and private beach stairs. Golden hour from the terrace is unlike anything else on the West Coast.",

    amenities: [
      { icon: '🏊', label: 'Infinity pool' },
      { icon: '🌊', label: 'Ocean views' },
      { icon: '👨‍🍳', label: "Chef's kitchen" },
      { icon: '🏖️', label: 'Private beach access' },
      { icon: '🔥', label: 'Fire pit terrace' },
      { icon: '🍽️', label: 'Outdoor dining' },
      { icon: '📶', label: 'High-speed WiFi' },
      { icon: '🅿️', label: 'Gated parking' },
    ],

    what_you_get: [
      '2 nights complimentary stay',
      'Infinity pool exclusive access',
      'Private beach stairs access',
      'Welcome champagne & provisions',
      'Personal concierge for shoot scheduling',
    ],
    what_you_deliver: '10 total deliverables across 2 formats (Moderate load)',

    requirements: [
      'Minimum 5,000 followers on Instagram',
      'Micro Influencer or higher creator tier',
      'At least 2 reels must feature the pool or ocean view',
      'All posts must go live within 10 days of checkout',
      'Include location tag and @collabnb in all posts',
    ],

    location_full: 'Malibu, Los Angeles County, California',
    lat: 34.0259,
    lng: -118.7798,
  },
  {
    id: '4',
    title: 'Mountain Lodge Escape',
    subtitle: 'Slope-side luxury with panoramic views',
    location: 'Aspen, CO',
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
    dates_available: 'Dec 2025–Feb 2026',
    due_days: 21,

    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=85',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80',
      'https://images.unsplash.com/photo-1451440063999-77a8b2960d2b?w=800&q=80',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80',
    ],

    about: 'Ski-in, ski-out luxury lodge at the base of Aspen Mountain. Soaring ceilings, a floor-to-ceiling stone fireplace, and panoramic mountain views from every window. Includes a private outdoor hot tub, sauna, and a fully staffed concierge service. This is the pinnacle of Colorado mountain luxury.',

    amenities: [
      { icon: '⛷️', label: 'Ski-in / ski-out' },
      { icon: '♨️', label: 'Private hot tub' },
      { icon: '🧖', label: 'Sauna' },
      { icon: '🔥', label: 'Stone fireplace' },
      { icon: '🏔️', label: 'Panoramic views' },
      { icon: '🛎️', label: 'Concierge service' },
      { icon: '🍷', label: 'Wine cellar' },
      { icon: '📶', label: 'High-speed WiFi' },
    ],

    what_you_get: [
      '$500 cash payment upon content approval',
      'Complimentary 3-night stay included',
      'Ski equipment rental credit ($200)',
      'Private concierge for filming schedule',
      'Professional behind-the-scenes stills',
    ],
    what_you_deliver: '18 total deliverables across 3 formats (Heavy load)',

    requirements: [
      'Minimum 25,000 followers across platforms',
      'UGC Pro or higher creator tier',
      'YouTube vlog must be minimum 8 minutes',
      'All content submitted within 21 days of checkout',
      'Must feature both interior and slope-side exterior shots',
    ],

    location_full: 'Aspen, Pitkin County, Colorado',
    lat: 39.1911,
    lng: -106.8175,
  },
  {
    id: '7',
    title: 'Vineyard Wine Estate',
    subtitle: 'Private villa on a working estate',
    location: 'Napa Valley, CA',
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

    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=85',
      'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
      'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80',
      'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800&q=80',
    ],

    about: 'An opulent private villa set within 40 acres of working Napa Valley vineyard. Wake up to rows of Cabernet Sauvignon vines stretching to the horizon. Includes exclusive access to the barrel room, private wine tastings, and a personal sommelier. The golden light of Napa Valley makes this one of the most cinematic stays in California.',

    amenities: [
      { icon: '🍷', label: 'Private wine tasting' },
      { icon: '🌿', label: 'Vineyard access' },
      { icon: '🏊', label: 'Heated estate pool' },
      { icon: '👨‍🍳', label: "Chef's kitchen" },
      { icon: '🧀', label: 'Sommelier on call' },
      { icon: '🛋️', label: 'Wine cellar suite' },
      { icon: '🚗', label: 'Estate vehicle' },
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

    location_full: 'Napa Valley, Napa County, California',
    lat: 38.5025,
    lng: -122.2654,
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
      'https://images.unsplash.com/photo-1474302771604-7f7a4aff70f8?w=800&q=80',
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
    subtitle: 'Geodesic dome under the Milky Way',
    location: 'Sedona, AZ',
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
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
      'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&q=80',
      'https://images.unsplash.com/photo-1532339142463-fd0a8979791a?w=800&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    ],

    about: 'A stunning geodesic glass dome perched on the red rock mesa outside Sedona with a 270° panoramic view of the desert sky. The transparent roof turns stargazing into a nightly spectacle — the Milky Way is visible from your bed. Features an outdoor shower, a meditation deck, and a private fire pit surrounded by ancient red rock formations.',

    amenities: [
      { icon: '🌌', label: 'Milky Way stargazing' },
      { icon: '🔥', label: 'Private fire pit' },
      { icon: '🧘', label: 'Meditation deck' },
      { icon: '🚿', label: 'Outdoor shower' },
      { icon: '🏜️', label: 'Red rock views' },
      { icon: '☀️', label: 'Solar-powered dome' },
      { icon: '🌵', label: 'Desert trail access' },
      { icon: '🦅', label: 'Wildlife observation' },
    ],

    what_you_get: [
      '$500 cash payment upon content approval',
      'Complimentary 1-night dome stay',
      'Guided stargazing session',
      'Desert provisions & fire kit',
      'Sunrise vantage point access',
    ],
    what_you_deliver: '5 total deliverables across 2 formats (Light load)',

    requirements: [
      'Minimum 5,000 followers on Instagram',
      'Micro Influencer or higher creator tier',
      'At least 1 reel must feature night sky footage',
      'All posts submitted within 7 days of checkout',
      'Tag @collabnb and @sedonadome in all posts',
    ],

    location_full: 'Sedona, Yavapai County, Arizona',
    lat: 34.8697,
    lng: -111.7609,
  },
];

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
  },
  {
    id: 2,
    listing_id: '2',
    property_name: 'Tranquil Waterfront Retreat',
    location: 'Malibu, CA',
    host_name: 'Ben Venturing',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    status: 'uploaded',
    status_text: 'Uploaded & Tagged (AI)',
    dates: 'Jan 28–31, 2026',
    deliverables: '2 Reels, 8 Photos',
    days_left: null,
    is_active: true,
  },
  {
    id: 3,
    listing_id: '4',
    property_name: 'Mountain Lodge Escape',
    location: 'Aspen, CO',
    host_name: 'Ben Venturing',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    status: 'approved',
    status_text: 'Approved · Payment Released',
    dates: 'Jan 10–13, 2026',
    deliverables: '5 Reels, 12 Photos, 1 YouTube Vlog',
    days_left: null,
    payment: '$500',
    is_active: false,
  },
];

// ─── Sample inbox threads ─────────────────────────────────────────────────────
export const SAMPLE_THREADS = [
  {
    id: 't1',
    listing_title: 'Glacier Prime Cabin',
    host_name: 'Ben Venturing',
    host_avatar: null,
    tag: 'Collab',
    last_message: 'Looking forward to the shoot next week!',
    timestamp: 'Apr 19',
    unread: 0,
    is_founder: true,
  },
  {
    id: 't2',
    listing_title: 'Mountain Lodge Escape',
    host_name: 'Ben Venturing',
    host_avatar: null,
    tag: 'Application',
    last_message: "Hi! I'd love to collaborate on this property...",
    timestamp: 'Apr 18',
    unread: 1,
    is_founder: false,
  },
  {
    id: 't3',
    listing_title: 'Vineyard Wine Estate',
    host_name: 'Ben Venturing',
    host_avatar: null,
    tag: 'Pitch',
    last_message: 'I have some ideas for unique content angles...',
    timestamp: 'Apr 17',
    unread: 3,
    is_founder: false,
  },
];
