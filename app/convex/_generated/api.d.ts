/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminThreads from "../adminThreads.js";
import type * as ambassadors from "../ambassadors.js";
import type * as blog from "../blog.js";
import type * as blogResearch from "../blogResearch.js";
import type * as collaborations from "../collaborations.js";
import type * as collections from "../collections.js";
import type * as contracts from "../contracts.js";
import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as emailCopy from "../emailCopy.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as emails from "../emails.js";
import type * as fees from "../fees.js";
import type * as gates from "../gates.js";
import type * as geocode from "../geocode.js";
import type * as http from "../http.js";
import type * as lib_compensationPoints from "../lib/compensationPoints.js";
import type * as lib_geo from "../lib/geo.js";
import type * as lib_moderation from "../lib/moderation.js";
import type * as listings from "../listings.js";
import type * as marketplaceStats from "../marketplaceStats.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as pitches from "../pitches.js";
import type * as profiles from "../profiles.js";
import type * as prospects from "../prospects.js";
import type * as referrals from "../referrals.js";
import type * as reports from "../reports.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as social from "../social.js";
import type * as stripe from "../stripe.js";
import type * as styleGuide from "../styleGuide.js";
import type * as suggestions from "../suggestions.js";
import type * as threadMessages from "../threadMessages.js";
import type * as threads from "../threads.js";
import type * as uploads from "../uploads.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminThreads: typeof adminThreads;
  ambassadors: typeof ambassadors;
  blog: typeof blog;
  blogResearch: typeof blogResearch;
  collaborations: typeof collaborations;
  collections: typeof collections;
  contracts: typeof contracts;
  crons: typeof crons;
  email: typeof email;
  emailCopy: typeof emailCopy;
  emailTemplates: typeof emailTemplates;
  emails: typeof emails;
  fees: typeof fees;
  gates: typeof gates;
  geocode: typeof geocode;
  http: typeof http;
  "lib/compensationPoints": typeof lib_compensationPoints;
  "lib/geo": typeof lib_geo;
  "lib/moderation": typeof lib_moderation;
  listings: typeof listings;
  marketplaceStats: typeof marketplaceStats;
  messages: typeof messages;
  notifications: typeof notifications;
  pitches: typeof pitches;
  profiles: typeof profiles;
  prospects: typeof prospects;
  referrals: typeof referrals;
  reports: typeof reports;
  reviews: typeof reviews;
  seed: typeof seed;
  social: typeof social;
  stripe: typeof stripe;
  styleGuide: typeof styleGuide;
  suggestions: typeof suggestions;
  threadMessages: typeof threadMessages;
  threads: typeof threads;
  uploads: typeof uploads;
  waitlist: typeof waitlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
