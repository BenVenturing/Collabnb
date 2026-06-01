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
import type * as collaborations from "../collaborations.js";
import type * as collections from "../collections.js";
import type * as contracts from "../contracts.js";
import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as listings from "../listings.js";
import type * as messages from "../messages.js";
import type * as pitches from "../pitches.js";
import type * as profiles from "../profiles.js";
import type * as referrals from "../referrals.js";
import type * as seed from "../seed.js";
import type * as stripe from "../stripe.js";
import type * as suggestions from "../suggestions.js";
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
  collaborations: typeof collaborations;
  collections: typeof collections;
  contracts: typeof contracts;
  crons: typeof crons;
  email: typeof email;
  emails: typeof emails;
  http: typeof http;
  listings: typeof listings;
  messages: typeof messages;
  pitches: typeof pitches;
  profiles: typeof profiles;
  referrals: typeof referrals;
  seed: typeof seed;
  stripe: typeof stripe;
  suggestions: typeof suggestions;
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
