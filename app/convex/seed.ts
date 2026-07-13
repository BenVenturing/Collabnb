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
        compensation: "$250 + 3-night stay",
        compensation_type: "hybrid",
        cash_amount: 250,
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
          "Glacier Prime is a hand-crafted old-growth forest cabin built into a granite ridge above the western shore of Lake Tahoe. The structure is made almost entirely from reclaimed Douglas fir and stone sourced on-site, with floor-to-ceiling windows that frame unobstructed views of the lake and the Sierra Nevada range beyond.\n\nInside, the cabin blends raw wilderness with considered comfort — a cast-iron wood stove anchors the main living space, while the lofted sleeping area opens to a private deck where you can watch alpenglow turn the mountains pink at dusk. The private hot tub sits cantilevered over the tree line, giving you the sensation of floating above the forest.\n\nThe surrounding 12 acres of old-growth pine and cedar are entirely private. Deer pass through most mornings. The trailhead to Eagle Falls and Desolation Wilderness is a 10-minute drive, and the nearest ski resort is under 20 minutes. This is a property that rewards a slow pace — one that's designed to be felt as much as photographed.",
        amenities: [
          { icon: "♨️", label: "Private hot tub" },
          { icon: "🔥", label: "Stone fireplace" },
          { icon: "⛷️", label: "Ski storage" },
          { icon: "🏔️", label: "Mountain views" },
        ],
        what_you_get: [
          "3 nights hosted stay experience",
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
        subtitle: "Patagonian lakefront villa with private infinity pool",
        location: "Bariloche, Argentina",
        property_type: "Villa",
        is_featured: true,
        rating: 4.93,
        review_count: 112,
        compensation: "$200 + 2-night stay",
        compensation_type: "hybrid",
        cash_amount: 200,
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
          "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
          "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80",
          "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
          "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&q=80",
        ],
        about:
          "Set directly on the shore of Nahuel Huapi Lake in Argentine Patagonia, this lakefront villa is surrounded by old-growth lenga beech forest on three sides and open water on the fourth. The Andes rise dramatically behind the property — snow-capped peaks reflected in a lake so clear it reads almost teal in afternoon light.\n\nThe villa was designed by a Buenos Aires architect who grew up in Bariloche, and it shows. The interiors lean into the landscape rather than competing with it — raw concrete, local slate floors, and Douglas fir ceilings frame views that shift from alpine blue to deep orange depending on the hour. The infinity pool is positioned to create a seamless visual merge with the lake beyond, a shot that photographs unlike almost anything else in South America.\n\nFrom the private dock you can kayak into sheltered coves, or simply sit on the jetty at golden hour while the lake goes still. Bariloche's chocolate shops, craft beer scene, and hiking trails are 20 minutes away — but this property makes it easy to never leave.",
        amenities: [
          { icon: "🏊", label: "Infinity pool" },
          { icon: "🏔️", label: "Andean lake views" },
          { icon: "👨‍🍳", label: "Chef's kitchen" },
          { icon: "🛶", label: "Private dock & kayaks" },
        ],
        what_you_get: [
          "2 nights hosted stay experience",
          "Infinity pool exclusive access",
          "Private dock & kayak access",
          "Welcome Argentine wine & provisions",
        ],
        what_you_deliver: "10 total deliverables across 2 formats (Moderate load)",
        requirements: [
          "Minimum 5,000 followers on Instagram",
          "Micro Influencer or higher creator tier",
        ],
        location_full: "Bariloche, Río Negro Province, Argentina",
        lat: -41.1335,
        lng: -71.3103,
        host_name: "Ben Venturing",
      },
      {
        title: "Mountain Lodge Escape",
        subtitle: "Jungle mountain luxury with panoramic views",
        location: "Chiang Mai, Thailand",
        property_type: "Lodge",
        is_featured: true,
        rating: 4.95,
        review_count: 203,
        compensation: "$500 Cash",
        compensation_type: "paid",
        cash_amount: 500,
        collab_type: "YouTube Vlog",
        creator_tier: "UGC Pro",
        deliverables: "5 Reels, 12 Photos, 1 YouTube Vlog",
        deliverable_count: 18,
        deliverable_load: "Heavy",
        dates_available: "Nov–Feb 2026",
        due_days: 21,
        image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
        gallery_images: [
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=85",
          "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80",
          "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
          "https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=800&q=80",
        ],
        about:
          "Perched 900 meters above Chiang Mai in the Doi Suthep-Pui National Park buffer zone, this jungle mountain lodge is carved into a ridge overlooking layered rice terraces, teak forest, and the valley city below. On clear mornings, you can see all the way to the Burmese border — on misty ones, the property floats above a sea of white cloud.\n\nThe lodge was built using a traditional Northern Thai construction method called 'sala' architecture — open-air pavilions connected by elevated walkways through the canopy. The main living pavilion has no fourth wall, just a view that opens directly onto the jungle and the valley beyond. The infinity pool hangs at the edge of the ridge and at certain angles appears to pour directly into the cityscape below.\n\nThis is a heavy-content stay by design. The property has a dedicated yoga sala that catches the sunrise, an outdoor fire pit that draws in fireflies after dark, and an on-site guide who can arrange a private pre-dawn trek to Doi Suthep temple before the tourists arrive. The host provides daily chef-prepared meals using ingredients from the on-site garden. It's a place built for creators who want depth, not just aesthetics.",
        amenities: [
          { icon: "🏊", label: "Infinity pool" },
          { icon: "🌿", label: "Jungle mountain views" },
          { icon: "🧘", label: "Yoga sala" },
          { icon: "🔥", label: "Outdoor fire pit" },
        ],
        what_you_get: [
          "$500 cash payment upon content approval",
          "Complimentary 3-night stay included",
          "Daily private chef meals",
          "Guided Doi Suthep sunrise trek",
        ],
        what_you_deliver: "18 total deliverables across 3 formats (Heavy load)",
        requirements: [
          "Minimum 25,000 followers across platforms",
          "UGC Pro or higher creator tier",
        ],
        location_full: "Chiang Mai, Thailand",
        lat: 18.7883,
        lng: 98.9853,
        host_name: "Ben Venturing",
      },
      {
        title: "Vineyard Wine Estate",
        subtitle: "Private villa on a working South African estate",
        location: "Stellenbosch, South Africa",
        property_type: "Estate",
        is_featured: true,
        rating: 4.96,
        review_count: 129,
        compensation: "$800 Cash",
        compensation_type: "paid",
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
          "https://images.unsplash.com/photo-1566042351553-52fb6fc0a880?w=800&q=80",
          "https://images.unsplash.com/photo-1573246123716-6b178079bfb0?w=800&q=80",
          "https://images.unsplash.com/photo-1504376379689-8d54347b4f08?w=800&q=80",
          "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800&q=80",
        ],
        about:
          "This Cape Dutch-style villa sits on a working wine estate in the Jonkershoek Valley, one of the most photographed wine corridors in South Africa. The property dates to 1743 — the thick whitewashed walls, carved gable, and original yellowwood floors have been immaculately preserved — but the interior has been updated with the kind of quiet luxury that makes for effortless content: linen drapes, raw plaster walls, and antique wine presses repurposed as sculpture.\n\nThe estate produces its own Chenin Blanc, Syrah, and red blend from 28 hectares of vines that frame the property on every side. Your stay includes a private tour of the barrel room with the winemaker, and a hosted tasting for up to four guests — not the standard tourist circuit, but a genuine behind-the-scenes access that most visitors never see. The heated estate pool is positioned between the vine rows, looking out to the Stellenbosch Mountain range.\n\nStellenbosch itself is a 10-minute drive — one of South Africa's most walkable university towns, with world-class restaurants, a vibrant street food scene, and the Franschhoek wine corridor within easy reach. For macro creators looking for a property that photographs like editorial and performs like travel content, this is one of the strongest collab opportunities on the platform.",
        amenities: [
          { icon: "🍷", label: "Private wine tasting" },
          { icon: "🌿", label: "Vineyard access" },
          { icon: "🏊", label: "Heated estate pool" },
          { icon: "👨‍🍳", label: "Chef's kitchen" },
        ],
        what_you_get: [
          "$800 cash payment upon content approval",
          "Complimentary 2-night estate stay",
          "Private vineyard & barrel room tour",
          "Hosted wine tasting (up to 4 guests)",
        ],
        what_you_deliver: "12 total deliverables across 3 formats (Moderate load)",
        requirements: [
          "Minimum 100,000 followers on primary platform",
          "Macro creator tier required",
        ],
        location_full: "Stellenbosch, Western Cape, South Africa",
        lat: -33.9364,
        lng: 18.8605,
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
        compensation_type: "paid",
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
          "The Lakeside Forest Treehouse sits 30 feet up in a cluster of old-growth white oaks at the edge of a private 4-acre lake in the Blue Ridge Mountains outside Asheville. The structure is suspended on living trees — no concrete footings, no earthworks — and the platform sways slightly in the wind the way a boat does at anchor. At night, the lake reflects the stars directly below your feet through the glass floor panels.\n\nThe interior is compact and intentional: a queen sleeping platform, a clawfoot soaking tub positioned at the window, and a reading nook built into the bow of the tree. The wrap-around deck is the real living space — hammock, fire table, and a direct staircase down to the dock where two kayaks are always ready. The lake is entirely private, no other structures visible from the water.\n\nThis is a light-deliverable collab designed for photographers and visual creators who produce exceptional single images rather than high-volume content. The property offers golden-hour lake light in both morning and evening, which is rare. The host is a landscape photographer himself and can share optimal shot locations on the property that aren't visible from the standard guest areas.",
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
        subtitle: "Geodesic dome on the Mediterranean coast",
        location: "Paphos, Cyprus",
        property_type: "Glamping",
        is_featured: false,
        rating: 4.91,
        review_count: 78,
        compensation: "$500 Cash",
        compensation_type: "paid",
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
          "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&q=80",
        ],
        about:
          "Perched on a hillside above the Paphos coastline on the southwest tip of Cyprus, this geodesic glass dome is designed to disappear into the landscape during the day and become a lantern at night. The structure is 7 meters in diameter with a 270-degree glass panel roof — at night, you fall asleep looking directly at the Milky Way, with the Mediterranean glittering below the hill line.\n\nThe dome sits on a private terraced plot with a stone meditation terrace facing west, a traditional ceramic fire bowl for evening fires, and an outdoor rain shower fed by a cistern of collected rainwater. The nearest neighboring structure is 400 meters away. The light on this hillside is extraordinary — harsh and sculptural at noon, warm and directional in the final hour before sunset when the limestone cliffs glow amber.\n\nPaphos itself is a UNESCO World Heritage city with 4,000-year-old mosaics, a working harbor, and a craft food scene that has developed significantly over the past decade. The property is 12 minutes from the old harbor and 8 minutes from the Akamas Peninsula National Park. For creators with a more minimal, meditative aesthetic, this is one of the most visually distinctive stays on the platform.",
        amenities: [
          { icon: "🌌", label: "Mediterranean stargazing" },
          { icon: "🔥", label: "Private fire pit" },
          { icon: "🧘", label: "Stone meditation terrace" },
          { icon: "🚿", label: "Outdoor rain shower" },
        ],
        what_you_get: [
          "$500 cash payment upon content approval",
          "Complimentary 1-night dome stay",
          "Guided stargazing session",
          "Mediterranean provisions & fire kit",
        ],
        what_you_deliver: "5 total deliverables across 2 formats (Light load)",
        requirements: [
          "Minimum 5,000 followers on Instagram",
          "Micro Influencer or higher creator tier",
        ],
        location_full: "Paphos, Cyprus",
        lat: 34.7754,
        lng: 32.4218,
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
      location: "Bariloche, Argentina",
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
      location: "Chiang Mai, Thailand",
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

export const patchAbouts = mutation({
  args: {},
  handler: async (ctx) => {
    const abouts: Record<string, string> = {
      "Glacier Prime Cabin":
        "Glacier Prime is a hand-crafted old-growth forest cabin built into a granite ridge above the western shore of Lake Tahoe. The structure is made almost entirely from reclaimed Douglas fir and stone sourced on-site, with floor-to-ceiling windows that frame unobstructed views of the lake and the Sierra Nevada range beyond.\n\nInside, the cabin blends raw wilderness with considered comfort — a cast-iron wood stove anchors the main living space, while the lofted sleeping area opens to a private deck where you can watch alpenglow turn the mountains pink at dusk. The private hot tub sits cantilevered over the tree line, giving you the sensation of floating above the forest.\n\nThe surrounding 12 acres of old-growth pine and cedar are entirely private. Deer pass through most mornings. The trailhead to Eagle Falls and Desolation Wilderness is a 10-minute drive, and the nearest ski resort is under 20 minutes. This is a property that rewards a slow pace — one that's designed to be felt as much as photographed.",
      "Tranquil Waterfront Retreat":
        "Set directly on the shore of Nahuel Huapi Lake in Argentine Patagonia, this lakefront villa is surrounded by old-growth lenga beech forest on three sides and open water on the fourth. The Andes rise dramatically behind the property — snow-capped peaks reflected in a lake so clear it reads almost teal in afternoon light.\n\nThe villa was designed by a Buenos Aires architect who grew up in Bariloche, and it shows. The interiors lean into the landscape rather than competing with it — raw concrete, local slate floors, and Douglas fir ceilings frame views that shift from alpine blue to deep orange depending on the hour. The infinity pool is positioned to create a seamless visual merge with the lake beyond, a shot that photographs unlike almost anything else in South America.\n\nFrom the private dock you can kayak into sheltered coves, or simply sit on the jetty at golden hour while the lake goes still. Bariloche's chocolate shops, craft beer scene, and hiking trails are 20 minutes away — but this property makes it easy to never leave.",
      "Mountain Lodge Escape":
        "Perched 900 meters above Chiang Mai in the Doi Suthep-Pui National Park buffer zone, this jungle mountain lodge is carved into a ridge overlooking layered rice terraces, teak forest, and the valley city below. On clear mornings, you can see all the way to the Burmese border — on misty ones, the property floats above a sea of white cloud.\n\nThe lodge was built using a traditional Northern Thai construction method called 'sala' architecture — open-air pavilions connected by elevated walkways through the canopy. The main living pavilion has no fourth wall, just a view that opens directly onto the jungle and the valley beyond. The infinity pool hangs at the edge of the ridge and at certain angles appears to pour directly into the cityscape below.\n\nThis is a heavy-content stay by design. The property has a dedicated yoga sala that catches the sunrise, an outdoor fire pit that draws in fireflies after dark, and an on-site guide who can arrange a private pre-dawn trek to Doi Suthep temple before the tourists arrive. The host provides daily chef-prepared meals using ingredients from the on-site garden. It's a place built for creators who want depth, not just aesthetics.",
      "Vineyard Wine Estate":
        "This Cape Dutch-style villa sits on a working wine estate in the Jonkershoek Valley, one of the most photographed wine corridors in South Africa. The property dates to 1743 — the thick whitewashed walls, carved gable, and original yellowwood floors have been immaculately preserved — but the interior has been updated with the kind of quiet luxury that makes for effortless content: linen drapes, raw plaster walls, and antique wine presses repurposed as sculpture.\n\nThe estate produces its own Chenin Blanc, Syrah, and red blend from 28 hectares of vines that frame the property on every side. Your stay includes a private tour of the barrel room with the winemaker, and a hosted tasting for up to four guests — not the standard tourist circuit, but a genuine behind-the-scenes access that most visitors never see. The heated estate pool is positioned between the vine rows, looking out to the Stellenbosch Mountain range.\n\nStellenbosch itself is a 10-minute drive — one of South Africa's most walkable university towns, with world-class restaurants, a vibrant street food scene, and the Franschhoek wine corridor within easy reach. For macro creators looking for a property that photographs like editorial and performs like travel content, this is one of the strongest collab opportunities on the platform.",
      "Lakeside Forest Treehouse":
        "The Lakeside Forest Treehouse sits 30 feet up in a cluster of old-growth white oaks at the edge of a private 4-acre lake in the Blue Ridge Mountains outside Asheville. The structure is suspended on living trees — no concrete footings, no earthworks — and the platform sways slightly in the wind the way a boat does at anchor. At night, the lake reflects the stars directly below your feet through the glass floor panels.\n\nThe interior is compact and intentional: a queen sleeping platform, a clawfoot soaking tub positioned at the window, and a reading nook built into the bow of the tree. The wrap-around deck is the real living space — hammock, fire table, and a direct staircase down to the dock where two kayaks are always ready. The lake is entirely private, no other structures visible from the water.\n\nThis is a light-deliverable collab designed for photographers and visual creators who produce exceptional single images rather than high-volume content. The property offers golden-hour lake light in both morning and evening, which is rare. The host is a landscape photographer himself and can share optimal shot locations on the property that aren't visible from the standard guest areas.",
      "Desert Dome Glamping":
        "Perched on a hillside above the Paphos coastline on the southwest tip of Cyprus, this geodesic glass dome is designed to disappear into the landscape during the day and become a lantern at night. The structure is 7 meters in diameter with a 270-degree glass panel roof — at night, you fall asleep looking directly at the Milky Way, with the Mediterranean glittering below the hill line.\n\nThe dome sits on a private terraced plot with a stone meditation terrace facing west, a traditional ceramic fire bowl for evening fires, and an outdoor rain shower fed by a cistern of collected rainwater. The nearest neighboring structure is 400 meters away. The light on this hillside is extraordinary — harsh and sculptural at noon, warm and directional in the final hour before sunset when the limestone cliffs glow amber.\n\nPaphos itself is a UNESCO World Heritage city with 4,000-year-old mosaics, a working harbor, and a craft food scene that has developed significantly over the past decade. The property is 12 minutes from the old harbor and 8 minutes from the Akamas Peninsula National Park. For creators with a more minimal, meditative aesthetic, this is one of the most visually distinctive stays on the platform.",
    };

    const listings = await ctx.db.query("listings").collect();
    let updated = 0;
    for (const listing of listings) {
      const newAbout = abouts[listing.title];
      if (newAbout && listing.about !== newAbout) {
        await ctx.db.patch(listing._id, { about: newAbout });
        updated++;
      }
    }
    return { updated };
  },
});
