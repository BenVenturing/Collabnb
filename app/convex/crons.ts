import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Runs on the 1st of each month at midnight UTC.
// Consumes one free month from creators who have completed their first collab
// and earned referral credits but haven't subscribed yet.
crons.monthly(
  "decrement free months balance",
  { day: 1, hourUTC: 0, minuteUTC: 0 },
  internal.profiles.decrementFreeMonth,
  {}
);

export default crons;
