// Preview-only proposals for the host board, shown when the page is opened
// with ?preview=1. Purely client-side — these are never written to Convex and
// never leave the browser. Delete this file (and its use in HostProposals)
// once there's enough real data to design against.

function emptySignatures() {
  return { hostSignature: null, hostSignedAt: null, hostSignedVersion: null, creatorSignature: null, creatorSignedAt: null, creatorSignedVersion: null };
}

function sample({ id, name, username, tier, avatar, followers, engagement, listing, message, type, status, collabStage, applied, platforms, listingImage, listingDetails, driveUrl }) {
  return {
    id, listing, listingId: null, status, type, applied,
    listingImage: listingImage || null,
    listingDetails: listingDetails || null,
    driveUrl: driveUrl || null,
    terminationRequestedBy: null,
    thread_key: `preview_${id}`,
    message,
    creator: {
      name, username, tier, avatar, followers, engagement,
      collab_count: 0, location: '', platforms, portfolio: username, verified: false,
    },
    contractHistory: [], signatures: emptySignatures(),
    locked: false, counterPending: null, contractId: null,
    hidden: false, isReal: false, convexId: null, convexCollabId: null,
    collabStage, isPreview: true,
  };
}

export const SAMPLE_PROPOSALS = [
  sample({
    id: 'preview_1',
    listingImage: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=400&q=70',
    listingDetails: { compensation: '$450 + 3-night stay', deliverables: '1\u00d7 Reel, 5\u00d7 Photo', nights: 3, turnaround_days: 14, location: 'Lake Tahoe, CA' }, name: 'Priya Nair', username: 'priya.wanders', tier: 'Influencer',
    avatar: 'https://i.pravatar.cc/80?img=47', followers: 84200, engagement: 9.4,
    listing: 'Glacier Prime Cabin', type: 'application', status: 'pending', collabStage: 'pending', applied: '2h ago',
    platforms: ['Instagram', 'TikTok'],
    message: "I've been documenting boutique mountain stays for 2 years and Glacier Prime is exactly the vibe my audience loves. My last cabin Reel got 2.3M views.",
  }),
  sample({
    id: 'preview_2',
    listingImage: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=70',
    listingDetails: { compensation: 'Hybrid + $300 cash', deliverables: '2\u00d7 Reel, 8\u00d7 Photo', nights: 4, turnaround_days: 10, location: 'Amalfi Coast, IT', payout_handling: 'platform', cash_amount: 300 }, name: 'Lena Park', username: 'lena.explores', tier: 'Micro Influencer',
    avatar: 'https://i.pravatar.cc/80?img=32', followers: 31500, engagement: 12.1,
    listing: 'Cliffside Villa', type: 'pitch', status: 'approved', collabStage: 'accepted', applied: '1d ago',
    platforms: ['TikTok', 'Instagram'],
    message: 'Coastal luxury is my niche — clean editorial style, fast turnaround. Happy to deliver ahead of schedule.',
  }),
  sample({
    id: 'preview_3',
    listingImage: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400&q=70',
    listingDetails: { compensation: '$600', deliverables: '1\u00d7 Reel, 10\u00d7 Photo', nights: 2, turnaround_days: 14, location: 'Joshua Tree, CA', payout_handling: 'in_person', cash_amount: 600 },
    driveUrl: 'https://drive.google.com/drive/folders/preview-maya-chen', name: 'Maya Chen', username: 'mayachen.travel', tier: 'Influencer',
    avatar: 'https://i.pravatar.cc/80?img=5', followers: 218000, engagement: 6.8,
    listing: 'Desert Solar House', type: 'application', status: 'approved', collabStage: 'updated', applied: '5d ago',
    platforms: ['Instagram', 'YouTube'],
    message: 'Sustainable design content is my thing — this solar house is exactly what my eco-conscious audience wants to see.',
  }),
  sample({
    id: 'preview_4',
    listingImage: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=400&q=70',
    listingDetails: { compensation: '$250 + 2-night stay', deliverables: '3\u00d7 Reel', nights: 2, turnaround_days: 7, location: 'Asheville, NC', payout_handling: 'platform', cash_amount: 250 },
    driveUrl: 'https://drive.google.com/drive/folders/preview-kai-yamamoto', name: 'Kai Yamamoto', username: 'kai.wilderness', tier: 'UGC Pro',
    avatar: 'https://i.pravatar.cc/80?img=68', followers: 9200, engagement: 18.7,
    listing: 'Treehouse Canopy Suite', type: 'application', status: 'approved', collabStage: 'uploaded_tagged', applied: '1wk ago',
    platforms: ['TikTok'],
    message: 'Nature and wellness creator — all content is uploaded and tagged, ready for your review.',
  }),
  sample({
    id: 'preview_5',
    listingImage: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=400&q=70',
    listingDetails: { compensation: '$300', deliverables: '1\u00d7 Reel, 4\u00d7 Photo', nights: 2, turnaround_days: 14, location: 'Seattle, WA' }, name: 'Ava Torres', username: 'ava.offshore', tier: 'Micro Influencer',
    avatar: 'https://i.pravatar.cc/80?img=21', followers: 43900, engagement: 7.3,
    listing: 'Floating Boathouse', type: 'application', status: 'declined', collabStage: 'pending', applied: '2wk ago',
    platforms: ['Instagram'],
    message: 'I do water-based travel content and this boathouse is incredible.',
  }),
];
