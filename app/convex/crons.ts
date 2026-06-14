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

export default crons;
