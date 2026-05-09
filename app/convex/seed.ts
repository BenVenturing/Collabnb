import { mutation } from "./_generated/server";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if data already exists
    const existingProfiles = await ctx.db.query("profiles").collect();
    if (existingProfiles.length > 0) return { alreadySeeded: true };

    // Seed profile
    const profileId = await ctx.db.insert("profiles", {
      full_name: "Ben Venturing",
      username: "ben.venturing",
      email: "benventuring@gmail.com",
      role: "creator",
      tier: "UGC Pro",
      bio: "Travel & lifestyle creator documenting unique stays and hidden gems around the world.",
      avatar_url: "/assets/ben-venturing.png",
      follower_count: 413500,
      engagement_rate: 8.2,
      collab_count: 47,
      instagram_handle: "ben.venturing",
      tiktok_handle: "ben.venturing",
      youtube_handle: "ben.venturing",
      portfolio: "beacons.ai/benventuring",
      is_founder: true,
      beta: true,
      city: "Asheville",
      region: "NC",
    });

    // Seed listings
    const listings = [
      {
        title: "Glacier Prime Cabin",
        subtitle: "Rustic cabin in old-growth forest",
        location: "Lake Tahoe, CA",
        property_type: "Cabin",
        is_featured: true,
        rating: 4.97,
        review_count: 84,
        compensation: "Free Stay · 3 nights",
        compensation_type: "free",
        collab_type: "UGC Video",
        creator_tier: "UGC Pro",
        deliverables: "3 Reels, 5 Photos, 1 Blog Post",
        deliverable_count: 9,
        deliverable_load: "Moderate",
        dates_available: "Feb–Apr 2026",
        due_days: 14,
        image: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80",
        gallery_images: [
          "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=1200&q=85",
          "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80",
          "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80",
          "https://images.unsplash.com/photo-1480497490787-505ec076689f?w=800&q=80",
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
        ],
        about:
          "A stunning old-growth forest cabin perched above Lake Tahoe with sweeping mountain and lake views.",
        amenities: [
          { icon: "♨️", label: "Private hot tub" },
          { icon: "🔥", label: "Stone fireplace" },
          { icon: "⛷️", label: "Ski storage" },
          { icon: "🏔️", label: "Mountain views" },
        ],
        what_you_get: [
          "3 nights complimentary stay",
          "Private hot tub access",
          "Ski equipment storage",
          "Welcome provisions basket",
        ],
        what_you_deliver: "9 total deliverables across 3 formats (Moderate load)",
        requirements: [
          "Minimum 10,000 followers on primary platform",
          "UGC Pro or higher creator tier",
        ],
        location_full: "Lake Tahoe, El Dorado County, California",
        lat: 38.9399,
        lng: -119.9772,
        host_name: "Ben Venturing",
      },
      {
        title: "Tranquil Waterfront Retreat",
        subtitle: "Cliffside villa with private infinity pool",
        location: "Malibu, CA",
        property_type: "Villa",
        is_featured: true,
        rating: 4.93,
        review_count: 112,
        compensation: "Free Stay · 2 nights",
        compensation_type: "free",
        collab_type: "Instagram Reels",
        creator_tier: "Micro Influencer",
        deliverables: "2 Reels, 8 Photos",
        deliverable_count: 10,
        deliverable_load: "Moderate",
        dates_available: "Jan–Mar 2026",
        due_days: 10,
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
        gallery_images: [
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=85",
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
        ],
        about:
          "A breathtaking cliffside villa perched above the Pacific Ocean with unobstructed views from every room.",
        amenities: [
          { icon: "🏊", label: "Infinity pool" },
          { icon: "🌊", label: "Ocean views" },
        ],
        what_you_get: [
          "2 nights complimentary stay",
          "Infinity pool exclusive access",
          "Private beach stairs access",
        ],
        what_you_deliver: "10 total deliverables across 2 formats (Moderate load)",
        requirements: [
          "Minimum 5,000 followers on Instagram",
          "Micro Influencer or higher creator tier",
        ],
        location_full: "Malibu, Los Angeles County, California",
        lat: 34.0259,
        lng: -118.7798,
        host_name: "Ben Venturing",
      },
      {
        title: "Mountain Lodge Escape",
        subtitle: "Slope-side luxury with panoramic views",
        location: "Aspen, CO",
        property_type: "Lodge",
        is_featured: true,
        rating: 4.95,
        review_count: 203,
        compensation: "$500 Cash",
        compensation_type: "cash",
        cash_amount: 500,
        collab_type: "YouTube Vlog",
        creator_tier: "UGC Pro",
        deliverables: "5 Reels, 12 Photos, 1 YouTube Vlog",
        deliverable_count: 18,
        deliverable_load: "Heavy",
        dates_available: "Dec 2025–Feb 2026",
        due_days: 21,
        image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
        gallery_images: [
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=85",
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
        ],
        about:
          "Ski-in, ski-out luxury lodge at the base of Aspen Mountain. Soaring ceilings and panoramic views.",
        amenities: [
          { icon: "⛷️", label: "Ski-in / ski-out" },
          { icon: "♨️", label: "Private hot tub" },
        ],
        what_you_get: [
          "$500 cash payment upon content approval",
          "Complimentary 3-night stay included",
        ],
        what_you_deliver: "18 total deliverables across 3 formats (Heavy load)",
        requirements: [
          "Minimum 25,000 followers across platforms",
          "UGC Pro or higher creator tier",
        ],
        location_full: "Aspen, Pitkin County, Colorado",
        lat: 39.1911,
        lng: -106.8175,
        host_name: "Ben Venturing",
      },
      {
        title: "Vineyard Wine Estate",
        subtitle: "Private villa on a working estate",
        location: "Napa Valley, CA",
        property_type: "Estate",
        is_featured: true,
        rating: 4.96,
        review_count: 129,
        compensation: "$800 Cash",
        compensation_type: "cash",
        cash_amount: 800,
        collab_type: "Full Package",
        creator_tier: "Macro",
        deliverables: "3 Reels, 8 Photos, 1 YouTube Video",
        deliverable_count: 12,
        deliverable_load: "Moderate",
        dates_available: "Mar–Nov 2026",
        due_days: 14,
        image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
        gallery_images: [
          "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=85",
          "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80",
        ],
        about:
          "An opulent private villa set within 40 acres of working Napa Valley vineyard.",
        amenities: [
          { icon: "🍷", label: "Private wine tasting" },
          { icon: "🌿", label: "Vineyard access" },
        ],
        what_you_get: [
          "$800 cash payment upon content approval",
          "Complimentary 2-night estate stay",
        ],
        what_you_deliver: "12 total deliverables across 3 formats (Moderate load)",
        requirements: [
          "Minimum 100,000 followers on primary platform",
          "Macro creator tier required",
        ],
        location_full: "Napa Valley, Napa County, California",
        lat: 38.5025,
        lng: -122.2654,
        host_name: "Ben Venturing",
      },
      {
        title: "Lakeside Forest Treehouse",
        subtitle: "Elevated treehouse above a private lake",
        location: "Asheville, NC",
        property_type: "Treehouse",
        is_featured: false,
        rating: 4.99,
        review_count: 41,
        compensation: "$1,000 Cash",
        compensation_type: "cash",
        cash_amount: 1000,
        collab_type: "Photography",
        creator_tier: "UGC Pro",
        deliverables: "2 Reels, 6 Photos, 2 Stories",
        deliverable_count: 10,
        deliverable_load: "Light",
        dates_available: "Apr–Jun 2026",
        due_days: 7,
        image: "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800&q=80",
        gallery_images: [
          "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1200&q=85",
          "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80",
        ],
        about:
          "A one-of-a-kind treehouse elevated 30 feet above a glassy private lake in the Blue Ridge Mountains.",
        amenities: [
          { icon: "🛣️", label: "Kayaks included" },
          { icon: "🌲", label: "Private lake access" },
        ],
        what_you_get: [
          "$1,000 cash payment upon content approval",
          "Complimentary 2-night treehouse stay",
        ],
        what_you_deliver: "10 total deliverables across 3 formats (Light load)",
        requirements: [
          "Minimum 10,000 followers on primary platform",
          "Strong photography portfolio required",
        ],
        location_full: "Asheville, Buncombe County, North Carolina",
        lat: 35.5951,
        lng: -82.5515,
        host_name: "Ben Venturing",
      },
      {
        title: "Desert Dome Glamping",
        subtitle: "Geodesic dome under the Milky Way",
        location: "Sedona, AZ",
        property_type: "Glamping",
        is_featured: false,
        rating: 4.91,
        review_count: 78,
        compensation: "$500 Cash",
        compensation_type: "cash",
        cash_amount: 500,
        collab_type: "Instagram Reels",
        creator_tier: "Micro Influencer",
        deliverables: "1 Reel, 4 Photos",
        deliverable_count: 5,
        deliverable_load: "Light",
        dates_available: "Year-round",
        due_days: 7,
        image: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800&q=80",
        gallery_images: [
          "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1200&q=85",
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80",
        ],
        about:
          "A stunning geodesic glass dome perched on the red rock mesa outside Sedona.",
        amenities: [
          { icon: "🌌", label: "Milky Way stargazing" },
          { icon: "🔥", label: "Private fire pit" },
        ],
        what_you_get: [
          "$500 cash payment upon content approval",
          "Complimentary 1-night dome stay",
        ],
        what_you_deliver: "5 total deliverables across 2 formats (Light load)",
        requirements: [
          "Minimum 5,000 followers on Instagram",
          "Micro Influencer or higher creator tier",
        ],
        location_full: "Sedona, Yavapai County, Arizona",
        lat: 34.8697,
        lng: -111.7609,
        host_name: "Ben Venturing",
      },
    ];

    for (const listing of listings) {
      await ctx.db.insert("listings", listing);
    }

    // Seed collaborations
    const stageKeys = [
      "pending",
      "accepted",
      "updated",
      "uploaded_tagged",
      "closed",
      "archived",
    ];
    const makeStages = (completedUpTo: string, notes?: Record<string, any>) => {
      const stages: Record<string, any> = {};
      stageKeys.forEach((k, i) => {
        stages[k] = {
          completed: i <= stageKeys.indexOf(completedUpTo),
          date: i <= stageKeys.indexOf(completedUpTo) ? notes?.[k]?.date || "—" : null,
          note: notes?.[k]?.note || "",
        };
      });
      return JSON.stringify(stages);
    };

    await ctx.db.insert("collaborations", {
      listing_id: "1",
      property_name: "Glacier Prime Cabin",
      location: "Lake Tahoe, CA",
      host_name: "Ben Venturing",
      image:
        "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80",
      status: "pending",
      status_text: "Pending Upload",
      dates: "Feb 15–18, 2026",
      deliverables: "3 Reels, 5 Photos, 1 Blog Post",
      days_left: 12,
      is_active: true,
      current_stage: "pending",
      stages: makeStages("pending", {
        pending: { date: "Feb 1, 2026", note: "Application submitted" },
      }),
      creator_id: profileId.toString(),
    });

    await ctx.db.insert("collaborations", {
      listing_id: "2",
      property_name: "Tranquil Waterfront Retreat",
      location: "Malibu, CA",
      host_name: "Ben Venturing",
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
      status: "uploaded",
      status_text: "Uploaded",
      dates: "Jan 28–31, 2026",
      deliverables: "2 Reels, 8 Photos",
      days_left: 0,
      is_active: true,
      current_stage: "uploaded_tagged",
      stages: makeStages("uploaded_tagged", {
        pending: { date: "Jan 5, 2026", note: "Application submitted" },
        accepted: { date: "Jan 8, 2026", note: "Host confirmed" },
        updated: { date: "Jan 15, 2026", note: "Content plan reviewed" },
        uploaded_tagged: { date: "Feb 1, 2026", note: "All content uploaded" },
      }),
      creator_id: profileId.toString(),
    });

    await ctx.db.insert("collaborations", {
      listing_id: "4",
      property_name: "Mountain Lodge Escape",
      location: "Aspen, CO",
      host_name: "Ben Venturing",
      image:
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
      status: "archived",
      status_text: "Archived",
      dates: "Jan 10–13, 2026",
      deliverables: "5 Reels, 12 Photos, 1 YouTube Vlog",
      payment: "$500",
      is_active: false,
      current_stage: "archived",
      stages: makeStages("archived", {
        pending: { date: "Dec 20, 2025", note: "Application submitted" },
        accepted: { date: "Dec 22, 2025", note: "Host confirmed" },
        updated: { date: "Dec 28, 2025", note: "Content plan reviewed" },
        uploaded_tagged: { date: "Jan 15, 2026", note: "All content uploaded" },
        closed: { date: "Jan 20, 2026", note: "Content approved" },
        archived: { date: "Jan 25, 2026", note: "Completed" },
      }),
      creator_id: profileId.toString(),
    });

    // Seed threads
    await ctx.db.insert("threads", {
      listing_title: "Glacier Prime Cabin",
      host_name: "Ben Venturing",
      tag: "Collab",
      last_message: "Looking forward to the shoot next week!",
      timestamp: "Apr 19",
      unread: 0,
      is_founder: true,
      collab_id: "1",
    });

    await ctx.db.insert("threads", {
      listing_title: "Mountain Lodge Escape",
      host_name: "Ben Venturing",
      tag: "Application",
      last_message: "I'd love to collaborate on this property...",
      timestamp: "Apr 18",
      unread: 1,
      collab_id: "3",
    });

    await ctx.db.insert("threads", {
      listing_title: "Vineyard Wine Estate",
      host_name: "Ben Venturing",
      tag: "Pitch",
      last_message: "I have some ideas for unique content angles...",
      timestamp: "Apr 17",
      unread: 3,
    });

    // Seed default collection
    await ctx.db.insert("collections", {
      name: "Saved",
      listing_ids: [],
    });

    return { seeded: true, profileId: profileId.toString() };
  },
});
