import vineyard1 from '../assets/vineyard-1.jpg';
import vineyard2 from '../assets/vineyard-2.jpg';
import vineyard3 from '../assets/vineyard-3.jpg';
import vineyard4 from '../assets/vineyard-4.jpg';
import vineyard5 from '../assets/vineyard-5.jpg';

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
  is_verified: false,
};

// ─── Sample host profile (always Ben Venturing on listing detail pages) ───────
export const SAMPLE_HOST = {
  name: 'Ben Venturing',
  username: 'ben.venturing',
  avatar_url: null,
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
    ],

    about: 'A fully renovated 1960s log cabin set among old-growth pines above the Lake Tahoe basin, with floor-to-ceiling windows framing the water and the peaks of the Sierra Nevada. The interior is anchored by a hand-laid stone fireplace, exposed timber beam ceilings, hand-hewn hardwood floors, and a fully stocked chef\'s kitchen with a farmhouse sink. Three bedrooms sleep six comfortably, and the private cedar hot tub sits on a deck where the lake appears through the tree line at eye level.\n\nFor creators, the golden hour here is operationally perfect — the sun drops behind Heavenly at around 5:40pm in winter and catches the steam rising off the hot tub for a 20-minute window that reliably performs on travel Reels. The snow-dusted pine canopy overhead and the silence of the forest make this one of the most atmospherically complete cabin stays in California.\n\nHeavenly Ski Resort is 10 minutes by car. The Fallen Leaf Lake trailhead is a 5-minute walk. Emerald Bay State Park — among the most photographed locations on the West Coast — is 20 minutes south. South Lake Tahoe village has groceries, gear rental, and après options within a short drive.',

    amenities: [
      { icon: 'hot_tub',  label: 'Private hot tub' },
      { icon: 'fire',     label: 'Stone fireplace' },
      { icon: 'ski',      label: 'Ski storage' },
      { icon: 'mountain', label: 'Mountain views' },
      { icon: 'kitchen',  label: 'Full kitchen' },
      { icon: 'pet',      label: 'Pet friendly' },
      { icon: 'wifi',     label: 'High-speed WiFi' },
      { icon: 'parking',  label: 'Free parking' },
    ],

    what_you_get: [
      '3 nights complimentary stay',
      'Private cedar hot tub with lake view access',
      'Ski equipment storage + boot dryer',
      'Welcome provisions basket (local honey, wine, firewood)',
      'Late checkout at 2pm',
      'Lake access pass for Fallen Leaf Lake trailhead',
    ],
    what_you_deliver: '3 vertical Reels (check-in reveal, hot tub moment, ski day), 5 edited lifestyle photos (exterior, interior, fireplace, lake view, deck), 1 blog post ~800 words with 3 embedded photos',

    requirements: [
      'Minimum 10,000 followers on primary platform',
      'UGC Pro or higher tier required',
      'Reels must be 30–60 seconds, vertical 9:16 format',
      'All music must be licensed or royalty-free',
      'Photos minimum 4K resolution, no heavy filters',
      'Blog post must include a property link and @collabnb mention',
      'All content submitted within 14 days of checkout',
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
      'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80',
      'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&q=80',
    ],

    about: 'A 4,200 sq ft Patagonian villa built from local stone and reclaimed timber, cantilevered over the shores of Nahuel Huapi Lake with unobstructed views of the Andes across the water. Four bedrooms, a baronial dining room that seats twelve, a library with a wood-burning stove, and a wraparound deck that extends over the lake\'s edge. The infinity pool is positioned so the water line aligns perfectly with the Cerro López ridgeline — from March through May, the surface holds a near-mirror reflection of the mountains.\n\nFor creators, the light off Nahuel Huapi at sunrise is extraordinary and largely undocumented on social — most travel content from Patagonia is shot in Torres del Paine or El Chaltén, leaving this stretch of the Argentine lake district genuinely underexposed. The private dock gives you golden-hour water-level access, and the kayaks are there whenever you want them.\n\nBariloche\'s city center is 15 minutes north. The Circuito Chico scenic loop starts at the property\'s front gate. El Bolsón\'s craft market and chocolate houses are an hour south. The property concierge can arrange a private boat on the lake for overhead and water-level shots on request.',

    amenities: [
      { icon: 'pool',     label: 'Infinity pool' },
      { icon: 'mountain', label: 'Andean lake views' },
      { icon: 'kitchen',  label: "Chef's kitchen" },
      { icon: 'dock',     label: 'Private dock & kayaks' },
      { icon: 'fire',     label: 'Lakeside fire pit' },
      { icon: 'grill',    label: 'Outdoor parrilla grill' },
      { icon: 'wifi',     label: 'High-speed WiFi' },
      { icon: 'parking',  label: 'Gated parking' },
    ],

    what_you_get: [
      '2 nights complimentary stay',
      'Infinity pool exclusive access (heated year-round)',
      'Private dock with 2 kayaks included',
      'Welcome Argentine Malbec & Patagonian provisions',
      'Personal concierge for shoot scheduling',
      'Private boat access on Nahuel Huapi (on request)',
    ],
    what_you_deliver: '2 vertical Reels (infinity pool reveal, golden hour at the dock), 8 edited photos covering exterior, pool with Andes, interior living room, lake kayaking, fire pit sunset, wine at the dock, bedroom, and overhead pool shot',

    requirements: [
      'Minimum 5,000 Instagram followers',
      'Micro Influencer or higher tier required',
      'At least 2 photos must show the lake or mountain backdrop',
      'Both reels must feature the infinity pool or lake views',
      'Tag property handle and @collabnb on all posts',
      'Posts must go live within 10 days of checkout',
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
      'https://images.unsplash.com/photo-1559327291-72ee739d0d9a?w=800&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
      'https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=800&q=80',
    ],

    about: 'A traditional Lanna-style teak lodge elevated at 1,050 meters on a hillside above Chiang Mai, with five open-air suites each fitted with outdoor rain showers, hand-woven textiles, and private terraces overlooking the jungle canopy. The main sala — an open pavilion with carved teak columns — catches the mountain light through the afternoon. The natural stone infinity pool overflows over the hillside with Doi Suthep\'s summit rising directly behind.\n\nFor creators, the lodge is operationally designed around golden hour. The sunrise over the northern mountains happens at 6:20am in the cool season — staff will have northern Thai coffee ready at 6am. The cooking class runs at 4pm and catches the afternoon light through the open-air kitchen in a way that reads exceptionally well on camera. The zero light pollution at this elevation means night-sky content is a genuine secondary asset here.\n\nThe Chiang Mai Old City is 45 minutes down the mountain by car. Doi Inthanon National Park — Thailand\'s highest peak and one of its most visually diverse landscapes — is a 90-minute drive. The lodge can arrange a half-day at a responsible elephant sanctuary 30 minutes away, and the night markets at Warorot and the Sunday Walking Street are both easy evening trips.',

    amenities: [
      { icon: 'pool',    label: 'Infinity pool' },
      { icon: 'garden',  label: 'Jungle mountain views' },
      { icon: 'yoga',    label: 'Yoga sala' },
      { icon: 'fire',    label: 'Outdoor fire pit' },
      { icon: 'chef',    label: 'Private chef' },
      { icon: 'hiking',  label: 'Guided jungle treks' },
      { icon: 'kitchen', label: 'Thai cooking class' },
      { icon: 'wifi',    label: 'High-speed Starlink WiFi' },
    ],

    what_you_get: [
      '$500 cash payment upon content approval',
      'Complimentary 3-night stay in open-air teak suite',
      'Daily private chef meals (Northern Thai cuisine)',
      'Guided Doi Suthep sunrise trek with photography timing',
      'Northern Thai cooking class (afternoon light, great for Reels)',
      'Behind-the-scenes stills shot by lodge photographer',
    ],
    what_you_deliver: '5 Reels (arrival/explore, sunrise pool, jungle trek, cooking class, panorama sunset), 12 edited photos (lodge exterior, bedroom, pool, jungle, kitchen, local dishes, sunrise, portrait + 4 detail shots), 1 YouTube vlog minimum 10 minutes with lodge B-roll, cooking class segment, and trek footage',

    requirements: [
      'Minimum 25,000 followers across platforms',
      'Active YouTube channel required (minimum 1,000 subscribers)',
      'YouTube vlog must be minimum 10 minutes, fully edited',
      'Reels must be 30–90 seconds, no talking head only — show the property',
      'Photos minimum 4K, delivered as RAW + edited JPEG',
      'Must feature both interior lodge shots and jungle/mountain exterior',
      'All content submitted within 21 days of checkout',
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

    image: vineyard1,
    gallery_images: [
      vineyard1,
      vineyard2,
      vineyard3,
      vineyard4,
      vineyard5,
    ],

    about: 'A Cape Dutch manor built in 1823, set at the foot of the Jonkershoek Mountains on a 120-acre working wine estate in the heart of Stellenbosch. The private guest wing spans six bedrooms with wide-plank Oregon pine floors, pressed tin ceilings, and a wraparound stoep (veranda) that looks out over the vine rows toward Table Mountain. Directly adjacent to the main house is exclusive access to the barrel hall — a vaulted stone cellar with 400 oak barrels that is available for private use during the stay, including after-hours shoots with controlled lighting available on request.\n\nThe vine rows run east-west and catch the Jonkershoek Valley haze from 7am to 9am every morning — a combination of mountain mist and dew on the leaves that creates a soft, directional light that luxury travel photographers specifically seek out in South Africa. The estate produces Cabernet Sauvignon, Chenin Blanc, and a single-vineyard Syrah, and a hosted tasting with the master sommelier is arranged on day two of the stay.\n\nStellenbosch town — with its oak-lined streets, galleries, and restaurants — is 20 minutes. Cape Town city center and the V&A Waterfront are 45 minutes. The Franschhoek Wine Tram is 30 minutes east. Table Mountain\'s aerial cableway is 50 minutes away and makes for a one-day content excursion that pairs naturally with this estate stay.',

    amenities: [
      { icon: 'wine',     label: 'Private wine tasting' },
      { icon: 'garden',   label: 'Vineyard access' },
      { icon: 'pool',     label: 'Heated estate pool' },
      { icon: 'kitchen',  label: "Chef's kitchen" },
      { icon: 'wine',     label: 'Master sommelier' },
      { icon: 'wine',     label: 'Wine cellar suite' },
      { icon: 'mountain', label: 'Table Mountain views' },
      { icon: 'wifi',     label: 'High-speed WiFi' },
    ],

    what_you_get: [
      '$800 cash payment upon content approval',
      'Complimentary 2-night stay in private Cape Dutch guest wing',
      'Exclusive barrel room access including after-hours shoot access',
      'Hosted tasting with master sommelier (up to 4 guests)',
      'Golden-hour vine row access — 7am–9am both mornings',
      'Curated wine selection from the estate cellar on arrival',
    ],
    what_you_deliver: '3 Reels (estate reveal + vine rows, barrel room tasting, golden hour in the vines), 8 aspirational photos (Cape Dutch exterior, vine rows close-up, barrel cellar, pool + mountain backdrop, plated wine pairing, sunset estate view, estate bedroom, sommelier tasting), 1 YouTube video minimum 12 minutes — winemaking behind-the-scenes, estate history, tasting notes, Jonkershoek Valley B-roll',

    requirements: [
      'Minimum 100,000 followers on primary platform',
      'Macro creator tier required — lifestyle or luxury travel niche preferred',
      'YouTube video must be minimum 12 minutes, cinematic-grade edit',
      'Feed aesthetic must align with luxury hospitality — no low-effort content',
      'All content must be aspirational, brand-safe, and location-tagged',
      'Raw footage of vine rows and barrel room must be delivered alongside final cuts',
      'All content submitted within 14 days of checkout',
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
      'https://images.unsplash.com/photo-1519974719765-e6559eac2575?w=800&q=80',
    ],

    about: 'A custom-built 600 sq ft treehouse suspended 30 feet up in a 200-year-old white oak grove at the edge of a private 3-acre lake in the Blue Ridge Mountains outside Asheville. Accessed by a 40-foot rope bridge, the interior features Douglas fir tongue-and-groove walls, a king bed with a 180° forest canopy view, and a glass-floor observatory panel that looks straight down through the oaks to the ground below. Outside, a wraparound deck with string lights and a spring-fed wood-fired hot tub sits above the water line.\n\nThe lake catches morning mist from October through May between 6:30am and 8am — a low, still layer that sits just above the surface and makes for some of the most distinct natural-light photography conditions in the American Southeast. The rope bridge arrival is a near-universal creator hook: multiple creators who\'ve shot here have hit 400K–700K views on the walk-across reel alone, with zero paid promotion.\n\nAsheville\'s River Arts District is 20 minutes. The Blue Ridge Parkway begins 10 minutes from the property. Chimney Rock State Park is 45 minutes east. The Biltmore Estate — an extraordinary architectural content location on its own — is 25 minutes away. Local farmstead breakfast spots within 5 minutes of the property.',

    amenities: [
      { icon: 'dock',    label: 'Kayaks included' },
      { icon: 'garden',  label: 'Private lake access' },
      { icon: 'views',   label: 'Blue Ridge views' },
      { icon: 'fire',    label: 'Lakeside fire pit' },
      { icon: 'shower',  label: 'Outdoor shower' },
      { icon: 'hiking',  label: 'Forest hiking trails' },
      { icon: 'solar',   label: 'Off-grid solar power' },
      { icon: 'landmark',label: 'Digital detox ready' },
    ],

    what_you_get: [
      '$1,000 cash payment upon content approval',
      'Complimentary 2-night treehouse stay',
      'Kayaks & paddleboards included (no additional cost)',
      'Lakeside bonfire kit + s\'mores provisions',
      'Spring-fed wood-fired hot tub access',
      'Sunrise golden-hour photography access — mist guaranteed Oct–May',
    ],
    what_you_deliver: '2 Reels (rope bridge arrival reveal, misty dawn kayak on the lake), 6 high-res lifestyle photos (treehouse exterior at golden hour, elevated lake view, glass floor detail, kayaking, fire pit at dusk, deck sunrise moment), 2 Stories (real-time arrival + morning coffee with lake view)',

    requirements: [
      'Minimum 10,000 followers on primary platform',
      'Strong photography portfolio required — share 3 examples at application',
      'Photos must be minimum 4K resolution, delivered as edited JPEG + RAW',
      'At least 2 photos must capture dawn or dusk lighting conditions',
      'Reels must include aerial or elevated perspective of the treehouse',
      'Stories must be posted in real-time during the stay',
      'All deliverables submitted within 7 days of checkout',
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
    deliverables: '2 Reels, 4 Photos',
    deliverable_count: 6,
    deliverable_load: 'Light',
    dates_available: 'Year-round',
    due_days: 7,

    image: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1200&q=85',
      'https://images.unsplash.com/photo-1525130413817-d45c1d127c42?w=800&q=80',
      'https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&q=80',
      'https://images.unsplash.com/photo-1532339142463-fd0a8979791a?w=800&q=80',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    ],

    about: 'A 475 sq ft geodesic dome with 40% transparent polycarbonate panels, perched on a limestone hillside 80 meters above the Mediterranean at the edge of the Paphos coastline. The interior centers on a king bed raised on a platform aimed directly at the night sky, surrounded by hand-thrown ceramic fixtures, a Moroccan-tiled wet room, and a handmade walnut writing desk. An outdoor fire pit is encircled by 200-year-old olive trees and wild lavender. The architecture is genuinely unlike anything common to European glamping — this is a property that reads as editorial-quality on first look.\n\nPaphos sits at the edge of one of Europe\'s darkest sky corridors. The Milky Way is visible to the naked eye from late March through October, and the transparent dome panels create a 3×4m live star ceiling above the bed — a Reel asset that no amount of editing can replicate at a standard glamping site. The sunrise over the Mediterranean appears at the horizon line directly through the dome\'s east-facing panel and catches the water in a way that is unusually cinematic for a coastal stay.\n\nKato Paphos Archaeological Park — a UNESCO World Heritage Site with mosaics from the 2nd century AD — is 5 minutes by car and entirely free to visit at dawn before the crowds. Coral Bay beach is 15 minutes north. The Akamas Peninsula nature reserve, with sea turtle nesting beaches and cliff-side trails, begins 30 minutes away.',

    amenities: [
      { icon: 'stargazing', label: 'Mediterranean stargazing' },
      { icon: 'fire',       label: 'Private fire pit' },
      { icon: 'yoga',       label: 'Stone meditation terrace' },
      { icon: 'shower',     label: 'Outdoor rain shower' },
      { icon: 'views',      label: 'Sea views' },
      { icon: 'solar',      label: 'Solar-powered dome' },
      { icon: 'garden',     label: 'Olive grove trails' },
      { icon: 'landmark',   label: 'Ancient ruins nearby' },
    ],

    what_you_get: [
      '$500 cash payment upon content approval',
      'Complimentary 1-night geodesic dome stay',
      'Private guided stargazing session with telescope',
      'Mediterranean provisions & olive wood fire kit',
      'Sunrise vantage access — Mediterranean horizon directly through east panel',
      'Concierge access to Kato Paphos ruins at dawn (before public hours)',
    ],
    what_you_deliver: '2 Reels (transparent dome with star-trail moment, morning Mediterranean coastal reveal), 4 edited photos (dome exterior at dusk, sea-view terrace, interior with luxury bedding, olive grove fire pit)',

    requirements: [
      'Minimum 5,000 Instagram followers',
      'Micro Influencer or higher tier required',
      'At least 1 reel must feature the transparent dome under night sky',
      'Night photography experience preferred (astrophotography a plus)',
      'Posts must include coastal and dome location tags + @collabnb',
      'All content submitted within 7 days of checkout',
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
