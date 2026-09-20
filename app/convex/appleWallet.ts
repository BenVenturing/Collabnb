// Apple Wallet counterpart to googleWallet.ts — same job (an optional pass
// that gives hosts/creators phone-lock-screen alerts, no native app), built
// against Apple's PassKit protocol instead of Google's Wallet Objects API.
// Architecturally different in a few unavoidable ways:
//   - We generate and sign the pass file ourselves (a .pkpass — a zip of
//     pass.json + images + a manifest + a PKCS#7 signature) rather than
//     calling a "create object" API.
//   - Apple pushes updates via APNs to devices WE must track (register/
//     unregister), rather than Google tracking that for us — hence the new
//     apple_pass_registrations table.
//   - Apple lets the push banner show real custom text (pass.json's
//     changeMessage), unlike Google's generic "New message."
//
// Nothing here does anything until all of the env vars below are set — every
// entry point fails soft (no-ops or throws a friendly "not set up" error),
// same as googleWallet.ts before its credentials existed.
//
// Setup, once you have an Apple Developer Program account ($99/yr):
//   1. Certificates, Identifiers & Profiles -> Identifiers -> Pass Type IDs
//      -> create one (e.g. pass.com.collabnb.member). Note it.
//   2. Click that Pass Type ID -> Create Certificate -> follow the CSR flow
//      -> download the .cer, then convert cert + key to PEM:
//        openssl x509 -inform DER -in pass.cer -out pass_cert.pem
//        (export the matching private key from Keychain Access as a .p12,
//        then: openssl pkcs12 -in pass.p12 -nocerts -out pass_key.pem -nodes)
//   3. Download Apple's WWDR G4 intermediate certificate from Apple's PKI
//      page (developer.apple.com/support -> Certificate Authority) and
//      convert it to PEM the same way if it's DER.
//   4. Certificates, Identifiers & Profiles -> Keys -> create a new key with
//      "Apple Wallet" enabled -> download the .p8 (this is APPLE_APNS_KEY;
//      it can only be downloaded once) -> note its Key ID.
//   5. Note your 10-character Team ID (top right of the developer portal).
//   6. npx convex env set APPLE_TEAM_ID <team id>
//      npx convex env set APPLE_PASS_TYPE_IDENTIFIER pass.com.collabnb.member
//      npx convex env set APPLE_PASS_SIGNING_CERT "$(cat pass_cert.pem)"
//      npx convex env set APPLE_PASS_SIGNING_KEY "$(cat pass_key.pem)"
//      npx convex env set APPLE_WWDR_CERT "$(cat wwdr.pem)"
//      npx convex env set APPLE_APNS_KEY_ID <key id>
//      npx convex env set APPLE_APNS_KEY "$(cat AuthKey_XXXX.p8)"
// Once those are set, the "Add to Apple Wallet" button appears in Settings
// automatically (gated on appleWallet.isConfigured) — no further code needed.

import { v, ConvexError } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { requireOwnerOrAdminAction } from "./lib/auth";
import * as forge from "node-forge";
import { zipSync } from "fflate";

const PASS_TYPE_STYLE = "generic" as const;

type AppleCreds = {
  teamId: string;
  passTypeIdentifier: string;
  signingCert: string;
  signingKey: string;
  wwdrCert: string;
  apnsKeyId: string;
  apnsKey: string;
  webServiceUrl: string;
  logoUrl: string;
};

function appleWalletCredentials(): AppleCreds | null {
  const teamId = process.env.APPLE_TEAM_ID;
  const passTypeIdentifier = process.env.APPLE_PASS_TYPE_IDENTIFIER;
  const signingCert = process.env.APPLE_PASS_SIGNING_CERT;
  const signingKey = process.env.APPLE_PASS_SIGNING_KEY;
  const wwdrCert = process.env.APPLE_WWDR_CERT;
  const apnsKeyId = process.env.APPLE_APNS_KEY_ID;
  const apnsKey = process.env.APPLE_APNS_KEY;
  if (!teamId || !passTypeIdentifier || !signingCert || !signingKey || !wwdrCert || !apnsKeyId || !apnsKey) {
    return null;
  }
  return {
    teamId,
    passTypeIdentifier,
    signingCert,
    signingKey,
    wwdrCert,
    apnsKeyId,
    apnsKey,
    webServiceUrl: process.env.APPLE_PASS_WEB_SERVICE_URL || "https://outgoing-anaconda-357.convex.site",
    logoUrl: process.env.APPLE_PASS_LOGO_URL || "https://www.collabnb.com/assets/favicon.png",
  };
}

// Public: Settings renders the "Add to Apple Wallet" button only once this
// is true — nobody sees a button that would just error until it's ready.
export const isConfigured = query({
  args: {},
  handler: async () => appleWalletCredentials() !== null,
});

// ─── Crypto helpers (Web Crypto — same convention as googleWallet.ts) ──────
async function sha1Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// One stable HMAC key derived from the pass-signing private key, used for
// two unrelated but equally stateless purposes: (1) each pass's
// authenticationToken, which Apple echoes back on every web-service call so
// we can verify it's really that pass without a lookup table, and (2) our
// own "add to wallet" download links, so they don't need a database row
// either — same pattern googleWallet.ts's JWTs use for statelessness.
async function hmacKey(creds: AppleCreds): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(creds.signingKey));
  return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function hmacHex(creds: AppleCreds, message: string): Promise<string> {
  const key = await hmacKey(creds);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function authTokenFor(creds: AppleCreds, serial: string): Promise<string> {
  return hmacHex(creds, `auth:${serial}`);
}

function base64UrlFromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64UrlFromString(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ─── Download-link tokens (our own "Add to Apple Wallet" distribution, not
// part of Apple's spec — Apple only specifies the web service protocol
// below, not how a user first gets the pass). Stateless: profileId + expiry,
// HMAC-signed, verified without a database lookup.
async function signDownloadToken(creds: AppleCreds, profileId: string): Promise<string> {
  const exp = Date.now() + 15 * 60 * 1000;
  const payload = `${profileId}.${exp}`;
  const sig = await hmacHex(creds, `download:${payload}`);
  return base64UrlFromString(payload) + "." + sig;
}

async function verifyDownloadToken(creds: AppleCreds, token: string): Promise<string | null> {
  const [encodedPayload, sig] = token.split(".");
  if (!encodedPayload || !sig) return null;
  let payload: string;
  try {
    payload = atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return null;
  }
  const expected = await hmacHex(creds, `download:${payload}`);
  if (expected !== sig) return null;
  const [profileId, expStr] = payload.split(".");
  const exp = Number(expStr);
  if (!profileId || !exp || Date.now() > exp) return null;
  return profileId;
}

// ─── PKCS#7 signing (node-forge — pure JS, no native bindings, same reason
// qrcode was safe to add: it just runs, no "use node" needed) ───────────────
function signManifest(manifestJson: string, creds: AppleCreds): Uint8Array {
  const cert = forge.pki.certificateFromPem(creds.signingCert);
  const key = forge.pki.privateKeyFromPem(creds.signingKey);
  const wwdr = forge.pki.certificateFromPem(creds.wwdrCert);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifestJson, "utf8");
  p7.addCertificate(cert);
  p7.addCertificate(wwdr);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha1,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as any },
    ],
  });
  p7.sign({ detached: true });

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const bytes = new Uint8Array(der.length);
  for (let i = 0; i < der.length; i++) bytes[i] = der.charCodeAt(i) & 0xff;
  return bytes;
}

// ─── pass.json + .pkpass assembly ──────────────────────────────────────────
function serialFor(profileId: string): string {
  return `collabnb-${String(profileId).replace(/[^A-Za-z0-9]/g, "")}`;
}

function buildPassJson(
  creds: AppleCreds,
  profile: any,
  serial: string,
  authToken: string,
  referralUrl: string,
  referralCode: string | undefined,
  latestMessage: string
) {
  const roleLabel = profile.role === "host" ? "Host" : "Creator";
  const memberSince = new Date(profile._creationTime).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return {
    formatVersion: 1,
    passTypeIdentifier: creds.passTypeIdentifier,
    serialNumber: serial,
    teamIdentifier: creds.teamId,
    organizationName: "Collabnb",
    description: "Collabnb member pass",
    logoText: "Collabnb",
    foregroundColor: "rgb(255,255,255)",
    backgroundColor: "rgb(25,49,45)",
    labelColor: "rgb(180,200,196)",
    webServiceURL: `${creds.webServiceUrl}/apple-wallet`,
    authenticationToken: authToken,
    [PASS_TYPE_STYLE]: {
      primaryFields: [{ key: "name", label: "", value: profile.full_name || "Member" }],
      secondaryFields: [
        { key: "role", label: "Role", value: roleLabel },
        { key: "since", label: "Member since", value: memberSince },
      ],
      // Not shown on the pass face — flip side only. Its value is what
      // changes on every push, and changeMessage: "%@" is what makes the
      // push banner show that exact text (Apple's one real edge over
      // Google Wallet, which can only ever show a generic "New message").
      backFields: [{ key: "update", label: "Latest update", value: latestMessage, changeMessage: "%@" }],
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: referralUrl,
        messageEncoding: "iso-8859-1",
        altText: referralCode ? `Join Collabnb · ${referralCode}` : "Join Collabnb",
      },
    ],
  };
}

async function buildPkpass(
  creds: AppleCreds,
  profile: any,
  serial: string,
  referralCode: string | undefined,
  latestMessage: string
): Promise<ArrayBuffer> {
  const referralUrl = referralCode
    ? `https://collabnb.com/join.html?ref=${encodeURIComponent(referralCode)}&join=true`
    : "https://collabnb.com/join.html?join=true";
  const authToken = await authTokenFor(creds, serial);
  const passJson = buildPassJson(creds, profile, serial, authToken, referralUrl, referralCode, latestMessage);
  const passBytes = new TextEncoder().encode(JSON.stringify(passJson));

  // Same self-hosted logo Google's pass uses. NOTE: Apple wants exact sizes
  // (icon 29/58/87px, logo ~160x50px @1x/2x/3x) — this square favicon isn't
  // that, so it'll likely render a little rough until properly-sized assets
  // are added. Good enough to get a working, installable pass today.
  const logoRes = await fetch(creds.logoUrl);
  const logoBytes = new Uint8Array(await logoRes.arrayBuffer());

  const files: Record<string, Uint8Array> = {
    "pass.json": passBytes,
    "icon.png": logoBytes,
    "icon@2x.png": logoBytes,
    "logo.png": logoBytes,
    "logo@2x.png": logoBytes,
  };

  const manifest: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(files)) {
    manifest[name] = await sha1Hex(bytes);
  }
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));
  const signatureBytes = signManifest(new TextDecoder().decode(manifestBytes), creds);

  const zipped = zipSync(
    { ...files, "manifest.json": manifestBytes, signature: signatureBytes },
    { level: 0 } // store, not deflate — passes are tiny and this avoids any compression edge case
  );
  // Convex's action-call boundary (ctx.runAction, including from httpAction
  // handlers) only accepts its own "bytes" value type, which is backed by a
  // plain ArrayBuffer — a Uint8Array view (what zipSync returns) isn't one of
  // Convex's supported value types and fails at the call boundary.
  return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength);
}

// ─── APNs push (token-based auth — ES256 JWT, Web Crypto handles the raw
// r||s signature format JWTs expect natively, no DER conversion needed) ────
async function apnsJwt(creds: AppleCreds): Promise<string> {
  const pem = creds.apnsKey.replace(/\\n/g, "\n");
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s+/g, "");
  const binary = atob(b64);
  const der = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) der[i] = binary.charCodeAt(i);
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);

  const header = { alg: "ES256", kid: creds.apnsKeyId };
  const payload = { iss: creds.teamId, iat: Math.floor(Date.now() / 1000) };
  const signingInput = `${base64UrlFromString(JSON.stringify(header))}.${base64UrlFromString(JSON.stringify(payload))}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(signingInput))
  );
  return `${signingInput}.${base64UrlFromBytes(sig)}`;
}

async function sendApnsPush(creds: AppleCreds, pushToken: string): Promise<{ ok: boolean; gone: boolean }> {
  const jwt = await apnsJwt(creds);
  const res = await fetch(`https://api.push.apple.com/3/device/${pushToken}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": creds.passTypeIdentifier,
      "content-type": "application/json",
    },
    body: "{}",
  });
  // 410 Gone / 400 BadDeviceToken = the device unregistered the app or the
  // token rotated — the registration row is now stale, caller should drop it.
  const gone = res.status === 410 || res.status === 400;
  return { ok: res.ok, gone };
}

// ─── Public: Settings > Notifications > "Add to Apple Wallet" ─────────────
// Mirrors googleWallet.generateSaveLink's shape, but Apple has no signed-URL
// "save" flow — distribution is just serving the .pkpass file itself, which
// Safari/iOS recognizes by content-type and offers to add. This action just
// ensures a serial exists and hands back a download link to that file.
export const generateDownloadLink = action({
  args: { profileId: v.string() },
  handler: async (ctx, { profileId }): Promise<{ downloadUrl: string }> => {
    await requireOwnerOrAdminAction(ctx, profileId, api.profiles.getByClerkUserId);
    const creds = appleWalletCredentials();
    if (!creds) throw new ConvexError("Apple Wallet isn't set up yet.");

    const profile: any = await ctx.runQuery(api.profiles.getById, { id: profileId });
    if (!profile) throw new ConvexError("Profile not found.");

    let serial = profile.apple_pass_serial;
    if (!serial) {
      serial = serialFor(profileId);
      await ctx.runMutation(internal.appleWallet.setPassSerial, { profileId, serial });
    }

    const token = await signDownloadToken(creds, profileId);
    return { downloadUrl: `${creds.webServiceUrl}/apple-wallet/download/${token}` };
  },
});

export const setPassSerial = internalMutation({
  args: { profileId: v.string(), serial: v.string() },
  handler: async (ctx, { profileId, serial }) => {
    await ctx.db.patch(profileId as any, { apple_pass_serial: serial, apple_pass_updated_at: Date.now() });
  },
});

// ─── HTTP-action-facing helpers (called from http.ts, which has no ctx.db) ─
// All exported so http.ts's httpActions can runQuery/runMutation/runAction
// into them; kept internal (not `api.*`) since none of this is meant to be
// called from the client SDK — only from Apple's own devices via the routes
// in http.ts, or from our own download link above.

export const buildPkpassForDownloadToken = internalAction({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<ArrayBuffer | null> => {
    const creds = appleWalletCredentials();
    if (!creds) return null;
    const profileId = await verifyDownloadToken(creds, token);
    if (!profileId) return null;
    const profile: any = await ctx.runQuery(api.profiles.getById, { id: profileId });
    if (!profile?.apple_pass_serial) return null;
    const referralCode = await referralCodeFor(ctx, profileId, profile);
    return await buildPkpass(creds, profile, profile.apple_pass_serial, referralCode, profile.apple_pass_latest_message || "Welcome to Collabnb!");
  },
});

export const buildPkpassForSerial = internalAction({
  args: { passTypeIdentifier: v.string(), serialNumber: v.string() },
  handler: async (ctx, { passTypeIdentifier, serialNumber }): Promise<ArrayBuffer | null> => {
    const creds = appleWalletCredentials();
    if (!creds || passTypeIdentifier !== creds.passTypeIdentifier) return null;
    const profile: any = await ctx.runQuery(internal.appleWallet.getBySerialInternal, { serial: serialNumber });
    if (!profile) return null;
    const referralCode = await referralCodeFor(ctx, String(profile._id), profile);
    return await buildPkpass(creds, profile, serialNumber, referralCode, profile.apple_pass_latest_message || "Welcome to Collabnb!");
  },
});

export const verifyAuthHeader = internalAction({
  args: { serialNumber: v.string(), authHeader: v.optional(v.string()) },
  handler: async (_ctx, { serialNumber, authHeader }): Promise<boolean> => {
    const creds = appleWalletCredentials();
    if (!creds || !authHeader) return false;
    const token = authHeader.replace(/^ApplePass\s+/i, "");
    return token === (await authTokenFor(creds, serialNumber));
  },
});

export const getBySerialInternal = internalQuery({
  args: { serial: v.string() },
  handler: async (ctx, { serial }) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_apple_pass_serial", (q) => q.eq("apple_pass_serial", serial))
      .unique();
  },
});

// ─── Device registration (Apple's PassKit web service protocol) ───────────
export const registerDevice = internalMutation({
  args: {
    deviceLibraryIdentifier: v.string(),
    serialNumber: v.string(),
    passTypeIdentifier: v.string(),
    pushToken: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("apple_pass_registrations")
      .withIndex("by_device_and_serial", (q) =>
        q.eq("device_library_identifier", args.deviceLibraryIdentifier).eq("serial_number", args.serialNumber)
      )
      .unique();
    if (existing) {
      if (existing.push_token !== args.pushToken) await ctx.db.patch(existing._id, { push_token: args.pushToken });
      return { created: false };
    }
    await ctx.db.insert("apple_pass_registrations", {
      device_library_identifier: args.deviceLibraryIdentifier,
      pass_type_identifier: args.passTypeIdentifier,
      serial_number: args.serialNumber,
      push_token: args.pushToken,
    });
    return { created: true };
  },
});

export const unregisterDevice = internalMutation({
  args: { deviceLibraryIdentifier: v.string(), serialNumber: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("apple_pass_registrations")
      .withIndex("by_device_and_serial", (q) =>
        q.eq("device_library_identifier", args.deviceLibraryIdentifier).eq("serial_number", args.serialNumber)
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// Serials updated since `tag` (a millisecond timestamp) for a device — the
// PassKit protocol's polling mechanism for "what changed since I last asked."
export const updatedSerialsForDevice = internalQuery({
  args: { deviceLibraryIdentifier: v.string(), passTypeIdentifier: v.string(), since: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ serialNumbers: string[]; lastUpdated: string } | null> => {
    const registrations = await ctx.db
      .query("apple_pass_registrations")
      .withIndex("by_device", (q) => q.eq("device_library_identifier", args.deviceLibraryIdentifier))
      .collect();
    const relevant = registrations.filter((r) => r.pass_type_identifier === args.passTypeIdentifier);
    if (relevant.length === 0) return null;

    const sinceMs = args.since ? Number(args.since) : 0;
    const updated: string[] = [];
    let maxUpdatedAt = sinceMs;
    for (const r of relevant) {
      const profile: any = await ctx.db
        .query("profiles")
        .withIndex("by_apple_pass_serial", (q) => q.eq("apple_pass_serial", r.serial_number))
        .unique();
      const updatedAt = profile?.apple_pass_updated_at ?? 0;
      if (updatedAt > sinceMs) updated.push(r.serial_number);
      if (updatedAt > maxUpdatedAt) maxUpdatedAt = updatedAt;
    }
    return { serialNumbers: updated, lastUpdated: String(maxUpdatedAt) };
  },
});

export const removeRegistrationsForToken = internalMutation({
  args: { serialNumber: v.string(), pushToken: v.string() },
  handler: async (ctx, { serialNumber, pushToken }) => {
    const rows = await ctx.db
      .query("apple_pass_registrations")
      .withIndex("by_serial", (q) => q.eq("serial_number", serialNumber))
      .collect();
    for (const r of rows) {
      if (r.push_token === pushToken) await ctx.db.delete(r._id);
    }
  },
});

export const logDeviceMessages = internalMutation({
  args: { logs: v.array(v.string()) },
  handler: async (_ctx, { logs }) => {
    // PassKit device-side error log — surfaced in `npx convex logs --prod`,
    // no separate storage needed for this low-volume debugging channel.
    for (const line of logs) console.log("Apple Wallet device log:", line);
  },
});

// ─── Internal: fired from notifications.create alongside the Google push ──
async function referralCodeFor(ctx: any, profileId: string, profile: any): Promise<string | undefined> {
  try {
    const code: string = await ctx.runMutation(internal.referrals.ensureCodeInternal, {
      profileId,
      username: profile.username || profile.full_name || "user",
    });
    return code;
  } catch (err) {
    console.error("Referral code for Apple pass failed", profileId, err);
    return undefined;
  }
}

const WALLET_NOTIFY_ELIGIBLE = new Set([
  "new_application",
  "pitch_approved",
  "pitch_declined",
  "new_message",
  "host_reply",
]);

const PREF_KEY_BY_TYPE: Record<string, "messages" | "contractUpdates" | "collabReminders"> = {
  new_message: "messages",
  host_reply: "messages",
  new_application: "contractUpdates",
  pitch_approved: "contractUpdates",
  pitch_declined: "contractUpdates",
  contract_reminder: "collabReminders",
  application_reminder: "collabReminders",
  collab_reminder: "collabReminders",
  awaiting_reply: "collabReminders",
  host_unresponsive: "collabReminders",
};

export const pushForUser = internalAction({
  args: { userId: v.string(), type: v.string(), title: v.string(), body: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const creds = appleWalletCredentials();
    if (!creds) return;

    const profile: any = await ctx.runQuery(api.profiles.getById, { id: args.userId });
    if (!profile?.apple_pass_serial) return;
    if (profile.apple_pass_push_enabled === false) return;

    const prefKey = PREF_KEY_BY_TYPE[args.type] ?? "contractUpdates";
    if (profile.notification_prefs?.[prefKey] === false) return;
    if (!WALLET_NOTIFY_ELIGIBLE.has(args.type)) return;

    // Unlike Google's server-tracked 3/day cap, Apple has no equivalent
    // documented limit — the type filter above is what keeps this to
    // high-value events only, same restraint applied for the same reason.
    const message = args.body ? `${args.title}: ${args.body}` : args.title;
    await ctx.runMutation(internal.appleWallet.setLatestMessage, { profileId: args.userId, message });

    const registrations = await ctx.runQuery(internal.appleWallet.registrationsForSerialInternal, {
      serial: profile.apple_pass_serial,
    });
    for (const reg of registrations) {
      try {
        const { gone } = await sendApnsPush(creds, reg.push_token);
        if (gone) {
          await ctx.runMutation(internal.appleWallet.removeRegistrationsForToken, {
            serialNumber: reg.serial_number,
            pushToken: reg.push_token,
          });
        }
      } catch (err) {
        console.error("APNs push failed for", args.userId, err);
      }
    }
  },
});

export const setLatestMessage = internalMutation({
  args: { profileId: v.string(), message: v.string() },
  handler: async (ctx, { profileId, message }) => {
    await ctx.db.patch(profileId as any, {
      apple_pass_latest_message: message.slice(0, 180),
      apple_pass_updated_at: Date.now(),
    });
  },
});

export const registrationsForSerialInternal = internalQuery({
  args: { serial: v.string() },
  handler: async (ctx, { serial }) => {
    return await ctx.db
      .query("apple_pass_registrations")
      .withIndex("by_serial", (q) => q.eq("serial_number", serial))
      .collect();
  },
});
