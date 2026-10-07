import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Runs on the 1st of each month at midnight UTC.
crons.monthly(
  "decrement free months balance",
  { day: 1, hourUTC: 0, minuteUTC: 0 },
  internal.profiles.decrementFreeMonth,
  {}
);

// Daily at 7am UTC — auto-discover creators for every enabled niche/location
// profile configured in Discovery (runs before the 8am queue build so fresh
// finds can enter today's queue). No-op if no profile is enabled. HikerAPI/
// Apify tier only — the free Agent-Reach tier runs from a local session on
// demand, not on this cron.
crons.daily(
  "daily creator discovery",
  { hourUTC: 7, minuteUTC: 0 },
  internal.prospects.runDailyDiscovery,
  {}
);

// Daily at 8am UTC — auto-fill the ready-to-confirm queue (50 creators + 50
// hosts, full confirm treatment — drafted DM/welcome email, live-search
// top-up if the pool's short) so it's ready before the day starts; the
// "Build fresh 50" button in Discovery does the same thing on demand. Actual
// Instagram DM volume stays capped separately at the safe ~20/day rate.
crons.daily(
  "build daily prospect queue",
  { hourUTC: 8, minuteUTC: 0 },
  internal.prospects.buildFreshQueueInternal,
  { perKind: 50 }
);

// Daily at 7:30am UTC — auto-search every enabled query profile for hosts
// (see HostAutoDiscoveryCard in Discovery.jsx). No-op if none are enabled.
// Runs before the 8am queue build, offset from the 7am creator run.
crons.daily(
  "daily host discovery",
  { hourUTC: 7, minuteUTC: 30 },
  internal.prospects.runDailyHostDiscovery,
  {}
);

// Daily at 9am UTC — generate a new blog post draft for admin review.
crons.daily(
  "generate daily blog post",
  { hourUTC: 9, minuteUTC: 0 },
  internal.blog.generatePostInternal,
  { isStatsPost: false }
);

// Monthly on the 1st at 10am UTC — generate a platform stats roundup post.
crons.monthly(
  "generate monthly stats post",
  { day: 1, hourUTC: 10, minuteUTC: 0 },
  internal.blog.generatePostInternal,
  { isStatsPost: true }
);

// Weekly on Monday at 9am UTC — remind creators whose metrics are 30–37 days stale.
crons.weekly(
  "metrics reminder notifications",
  { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 },
  internal.profiles.checkMetricsReminders,
  {}
);

// Daily at 9am UTC — nudge unsigned contract parties; recurs ~every 3 days via gate.
crons.daily(
  "contract signature reminders",
  { hourUTC: 9, minuteUTC: 0 },
  internal.contracts.checkContractReminders,
  {}
);

// Daily at 9am UTC — nudge creators ~3 days before their deliverable
// deadline (signed date + listing turnaround_days). Fires once per contract.
crons.daily(
  "collab deliverable reminders",
  { hourUTC: 9, minuteUTC: 0 },
  internal.contracts.checkCollabReminders,
  {}
);

// Daily at 10am UTC — nudge hosts sitting on undecided applications. First
// nudge at 48h, repeats every 3 days, gives up at 14 days. One email per
// host covering all their waiting applications.
crons.daily(
  "stale application reminders",
  { hourUTC: 10, minuteUTC: 0 },
  internal.pitches.checkStaleApplications,
  {}
);

// Daily at 10:30am UTC — digest for hosts with creator messages they haven't
// replied to in 24h+. Backstops sendMessage's per-message email throttle,
// which otherwise goes silent after the first unread ping.
crons.daily(
  "unanswered message digest",
  { hourUTC: 10, minuteUTC: 30 },
  internal.threadMessages.checkAwaitingReply,
  {}
);

// Daily at midnight UTC — expire creator trials and flip to limited access.
crons.daily(
  "expire creator trials",
  { hourUTC: 0, minuteUTC: 5 },
  internal.gates.expireTrials,
  {}
);

// Daily at 9am UTC — remind creators whose trial ends within 3 days (once each).
crons.daily(
  "trial ending reminders",
  { hourUTC: 9, minuteUTC: 0 },
  internal.gates.remindExpiringTrials,
  {}
);

// Daily at 11am UTC — nudge pending applicants who've gone quiet: no login
// yet, or a login but a bare profile/no published listing. First nudge at
// 3 days, repeats every 5 days, gives up at 21 days.
crons.daily(
  "incomplete application reminders",
  { hourUTC: 11, minuteUTC: 0 },
  internal.gates.checkIncompleteApplications,
  {}
);

// Daily at 11:30am UTC — 3/7/14-day drip nudging verified, fully-registered
// hosts who still have zero listings (listingReminders.ts). Distinct from
// "incomplete application reminders" above, which stops once a host is
// verified. No-op unless the "listing_reminders_enabled" admin setting is on.
crons.daily(
  "listing reminder drip",
  { hourUTC: 11, minuteUTC: 30 },
  internal.listingReminders.checkListingReminders,
  {}
);

// Weekly on Sunday at 9am UTC — one digest email per creator covering every
// listing their stay alerts matched during the week. Instant in-app/wallet
// pushes already went out at publish time (stayAlerts.notifyForListing); this
// is the email half, batched so a busy week isn't ten emails.
crons.weekly(
  "stay alert weekly digest",
  { dayOfWeek: "sunday", hourUTC: 9, minuteUTC: 0 },
  internal.stayAlerts.sendWeeklyDigests,
  {}
);

// Hourly — sends the Instagram auto-DM follow-up tiers: a no-click nudge
// (~24h after the first DM) and a clicked-but-no-signup nudge (~48-72h after
// the click). Tier 4 (welcome + follow-ask) fires on signup itself instead —
// see profiles.getOrCreate.
crons.hourly(
  "instagram autoreply follow-ups",
  { minuteUTC: 15 },
  internal.autoreply.checkFollowUps,
  {}
);

export default crons;
