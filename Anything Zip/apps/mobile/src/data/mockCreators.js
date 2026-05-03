// Mock creator data for host discovery
export const mockCreators = [
  {
    id: "c1",
    name: "Emma Rodriguez",
    avatarUri:
      "https://raw.createusercontent.com/f9b9457a-2a88-4e5c-a2b9-0ef9d951d7e8/",
    tier: "UGC Pro",
    followers: "8.5K",
    tags: ["Travel", "Lifestyle"],
    availability: "Available now",
    travelPlans: [
      { location: "California", start: "2026-03-15", end: "2026-03-22" },
      { location: "Colorado", start: "2026-04-10", end: "2026-04-17" },
    ],
    bio: "UGC creator specializing in authentic travel and lifestyle content. Love showcasing hidden gems and unique stays.",
  },
  {
    id: "c2",
    name: "Marcus Chen",
    avatarUri:
      "https://raw.createusercontent.com/74a5c83c-b289-45c5-a295-457e475a9d8e/",
    tier: "Micro Influencer",
    followers: "42K",
    tags: ["Adventure", "Photography"],
    availability: "Available in 2 weeks",
    travelPlans: [{ location: "Utah", start: "2026-03-01", end: "2026-03-08" }],
    bio: "Adventure photographer and content creator. Passionate about outdoor experiences and storytelling through visuals.",
  },
  {
    id: "c3",
    name: "Sophia Martinez",
    avatarUri:
      "https://raw.createusercontent.com/f6b14a5d-fb54-484d-a5a8-71e7886a6b19/",
    tier: "UGC Beginner",
    followers: "2.1K",
    tags: ["Food", "Cozy Vibes"],
    availability: "Available now",
    travelPlans: [
      { location: "Pacific Northwest", start: "2026-03-20", end: "2026-03-25" },
    ],
    bio: "New to UGC but passionate about creating cozy, authentic content. Specializing in food and lifestyle photography.",
  },
  {
    id: "c4",
    name: "Alex Kim",
    avatarUri:
      "https://raw.createusercontent.com/bf0473fa-2c78-4ea7-930f-19edfdf078b7/",
    tier: "Influencer",
    followers: "125K",
    tags: ["Luxury", "Travel"],
    availability: "Booked until April",
    travelPlans: [
      { location: "Europe", start: "2026-04-01", end: "2026-04-30" },
    ],
    bio: "Luxury travel influencer with focus on high-end accommodations and experiences. Strong engagement with affluent audience.",
  },
  {
    id: "c5",
    name: "Jordan Williams",
    avatarUri:
      "https://raw.createusercontent.com/92b5a118-931c-457b-aa46-b4ad52d2edf6/",
    tier: "UGC Pro",
    followers: "15K",
    tags: ["Travel", "Wellness"],
    availability: "Available now",
    travelPlans: [
      { location: "Arizona", start: "2026-03-25", end: "2026-04-02" },
      { location: "New Mexico", start: "2026-04-15", end: "2026-04-20" },
    ],
    bio: "Travel and wellness content creator focused on boutique stays and authentic experiences. Passionate about storytelling through visual content.",
  },
];

// Mock recent reviews data
export const mockReviews = [
  {
    id: "r1",
    creatorId: "c1",
    creatorName: "Emma Rodriguez",
    creatorAvatarUri:
      "https://raw.createusercontent.com/f9b9457a-2a88-4e5c-a2b9-0ef9d951d7e8/",
    listingName: "Mountain View Lodge",
    listingAvatarUri:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400",
    rating: 5,
    snippet:
      "Emma delivered incredible content! Her photos captured the cabin's cozy vibe perfectly. Highly recommend.",
    date: "2026-02-15",
  },
  {
    id: "r2",
    creatorId: "c2",
    creatorName: "Marcus Chen",
    creatorAvatarUri:
      "https://raw.createusercontent.com/74a5c83c-b289-45c5-a295-457e475a9d8e/",
    listingName: "Desert Oasis Villa",
    listingAvatarUri:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400",
    rating: 5,
    snippet:
      "Marcus's adventure-focused content was exactly what we needed. Professional, creative, and delivered on time.",
    date: "2026-02-10",
  },
  {
    id: "r3",
    creatorId: "c3",
    creatorName: "Sophia Martinez",
    creatorAvatarUri:
      "https://raw.createusercontent.com/f6b14a5d-fb54-484d-a5a8-71e7886a6b19/",
    listingName: "Coastal Cottage",
    listingAvatarUri:
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400",
    rating: 4,
    snippet:
      "Great first collaboration! Sophia's cozy aesthetic matched our brand perfectly.",
    date: "2026-02-08",
  },
];

// Mock past collaborations per creator (for bottom sheet)
export const mockPastCollaborations = {
  c1: [
    {
      collaborationId: "col1",
      listingName: "Mountain View Lodge",
      date: "2026-02-15",
      rating: 5,
      shortReview: "Incredible content! Perfect cozy vibe.",
      longReview:
        "Emma delivered incredible content! Her photos captured the cabin's cozy vibe perfectly. Communication was excellent throughout the process, and she was very professional. The final deliverables exceeded our expectations and we saw a significant increase in bookings after posting her content. Highly recommend working with Emma!",
      deliverableSummary: "10 Instagram posts, 5 Reels, 20 edited photos",
      analytics: {
        impressions: "Coming soon",
        engagement: "Coming soon",
        conversions: "Coming soon",
      },
    },
  ],
  c2: [
    {
      collaborationId: "col2",
      listingName: "Desert Oasis Villa",
      date: "2026-02-10",
      rating: 5,
      shortReview: "Professional and creative work.",
      longReview:
        "Marcus's adventure-focused content was exactly what we needed. Professional, creative, and delivered on time. His unique perspective highlighted features of our property we hadn't even considered. The video content performed exceptionally well on social media.",
      deliverableSummary: "3 Reels, 8 Instagram posts, 15 edited photos",
      analytics: {
        impressions: "Coming soon",
        engagement: "Coming soon",
        conversions: "Coming soon",
      },
    },
  ],
  c3: [
    {
      collaborationId: "col3",
      listingName: "Coastal Cottage",
      date: "2026-02-08",
      rating: 4,
      shortReview: "Great first collaboration!",
      longReview:
        "Great first collaboration! Sophia's cozy aesthetic matched our brand perfectly. As a newer creator, she was eager to learn and very responsive to feedback. The content quality was good, and we're excited to work with her again as she continues to grow.",
      deliverableSummary: "6 Instagram posts, 2 Reels, 12 edited photos",
      analytics: {
        impressions: "Coming soon",
        engagement: "Coming soon",
        conversions: "Coming soon",
      },
    },
  ],
  c4: [],
  c5: [],
};
