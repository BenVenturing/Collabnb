import { cronJobs } from "convex/server";
import { internal, api } from "./_generated/api";

const crons = cronJobs();

// Runs on the 1st of each month at midnight UTC.
crons.monthly(
  "decrement free months balance",
  { day: 1, hourUTC: 0, minuteUTC: 0 },
  internal.profiles.decrementFreeMonth,
  {}
);

// Daily at 7am UTC — auto-discover creators for the admin-configured
// location/niche (runs before the 8am queue build so fresh finds can enter
// today's queue). No-op unless the Auto-discovery toggle is on in Discovery.
crons.daily(
  "daily creator discovery",
  { hourUTC: 7, minuteUTC: 0 },
  internal.prospects.runDailyDiscovery,
  {}
);

// Daily at 8am UTC — auto-fill the outreach queue (20 creators + 20 hosts)
// so it's ready before the day starts; the button in Discovery still works.
crons.daily(
  "build daily prospect queue",
  { hourUTC: 8, minuteUTC: 0 },
  api.prospects.buildTodayQueue,
  { perKind: 20 }
);

// Daily at 9am UTC — generate a new blog post draft for admin review.
crons.daily(
  "generate daily blog post",
  { hourUTC: 9, minuteUTC: 0 },
  api.blog.generatePost,
  { isStatsPost: false }
);

// Monthly on the 1st at 10am UTC — generate a platform stats roundup post.
crons.monthly(
  "generate monthly stats post",
  { day: 1, hourUTC: 10, minuteUTC: 0 },
  api.blog.generatePost,
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

export default crons;
