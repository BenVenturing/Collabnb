// Floor math unit tests. Run with: node convex/lib/compensationPoints.test.mjs
import {
  totalPoints, calcMidpoint, calcRange, calcStayOffset, calcHardFloor,
  evaluateZone, computeLoadTier, findPackagesForBudget,
} from "./compensationPoints.ts";

let failed = 0;
function assertEq(actual, expected, label) {
  if (actual !== expected) {
    console.error(`FAIL ${label}: expected ${expected}, got ${actual}`);
    failed++;
  } else {
    console.log(`ok   ${label} = ${actual}`);
  }
}

// Content Day (36 pts) x UGC Pro, Hybrid with $350 declared stay value.
const contentDay = [
  { type: "ugcReel", quantity: 2 },
  { type: "photo", quantity: 10 },
  { type: "storyFrame", quantity: 3 },
];
const points = totalPoints(contentDay);
assertEq(points, 36, "Content Day total points");

const midpoint = calcMidpoint(points, "ugc_pro");
assertEq(midpoint, 540, "midpoint = points x UGC Pro rate ($15)");

const range = calcRange(midpoint);
assertEq(range.low, 432, "recommended range low (0.8x)");
assertEq(range.high, 648, "recommended range high (1.2x)");

const stayOffset = calcStayOffset(350, "ugc_pro", midpoint);
assertEq(stayOffset, 270, "stay offset (min($350, 50% of midpoint))");

const hardFloor = calcHardFloor(midpoint, stayOffset);
assertEq(hardFloor, 54, "hard floor (max($50, 0.6x midpoint - stayOffset))");

assertEq(evaluateZone(30, midpoint, stayOffset), "red", "$30 cash -> red (server rejects)");
assertEq(evaluateZone(150, midpoint, stayOffset), "amber", "$150 cash -> amber (publishes with warning)");
assertEq(evaluateZone(200, midpoint, stayOffset), "green", "$200 cash -> green (publishes freely)");

// Load tier is derived, never manually picked; YouTube always forces Custom.
assertEq(computeLoadTier(contentDay), "heavy", "36 pts -> heavy load");
assertEq(computeLoadTier([{ type: "ugcReel", quantity: 1 }]), "light", "10 pts (1 reel) -> light load");
assertEq(computeLoadTier([{ type: "ugcReel", quantity: 2 }, { type: "photo", quantity: 5 }]), "moderate", "25 pts -> moderate load");
assertEq(computeLoadTier([{ type: "youtubeVideo", quantity: 1 }]), "custom", "any YouTube deliverable -> custom load");
assertEq(computeLoadTier([{ type: "ugcReel", quantity: 7 }]), "custom", "70 pts (beyond heavy max) -> custom load");

// Budget mode: $250 budget x UGC Pro returns every fitting preset, sorted by points.
const { fitting } = findPackagesForBudget({ budget: 250, tierId: "ugc_pro", track: "ugc" });
if (fitting.length < 1 || fitting.some((p) => p.midpoint > 250)) {
  console.error(`FAIL $250 budget fitting presets: got ${JSON.stringify(fitting.map((p) => [p.name, p.midpoint]))}`);
  failed++;
} else {
  console.log(`ok   $250 budget returns ${fitting.length} fitting preset(s), all <= $250 midpoint`);
}

if (failed) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log("\nAll compensationPoints tests passed.");
