// Google Wallet "push notification" pass — hosts/creators add a Collabnb
// pass to their phone's Google Wallet; notifications.create then pushes a
// message onto that pass, which surfaces as a lock-screen notification, with
// no native app required. Apple Wallet is a planned follow-up once this is
// validated (see requireOwnerOrAdminAction usage below for the auth model).
//
// Setup (once you have a Google Cloud project with the Wallet API enabled and
// a Google Wallet Business Console issuer account):
//   npx convex env set GOOGLE_WALLET_ISSUER_ID <issuer id>
//   npx convex env set GOOGLE_WALLET_CLIENT_EMAIL <service account email>
//   npx convex env set GOOGLE_WALLET_PRIVATE_KEY "<service account private key PEM>"
//   npx convex env set GOOGLE_WALLET_LOGO_URL <public https url, square, >=660x660>
//   npx convex env set GOOGLE_WALLET_HERO_IMAGE_URL <optional public https url — banner across the bottom of the pass>
// The service account needs "Wallet Object Issuer" access on the issuer
// account (Google Wallet Business Console -> Users).
import { v, ConvexError } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { requireOwnerOrAdminAction } from "./lib/auth";

const WALLET_API = "https://walletobjects.googleapis.com/walletobjects/v1";
const CLASS_SUFFIX = "collabnb_member";

// ─── RS256 JWT signing (Web Crypto, no npm SDK — same approach http.ts
// already uses for Svix/Meta HMAC verification) ─────────────────────────────
function base64UrlFromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlFromString(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToBytes(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signJwtRS256(payload: Record<string, unknown>, privateKeyPem: string): Promise<string> {
  const signingInput = `${base64UrlFromString(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64UrlFromString(JSON.stringify(payload))}`;
  const key = await importPrivateKey(privateKeyPem);
  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput))
  );
  return `${signingInput}.${base64UrlFromBytes(signature)}`;
}

// ─── Credentials + REST helpers ─────────────────────────────────────────────
type WalletCreds = {
  clientEmail: string;
  privateKey: string;
  issuerId: string;
  logoUrl: string;
  heroImageUrl?: string;
};

function walletCredentials(): WalletCreds | null {
  const clientEmail = process.env.GOOGLE_WALLET_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY;
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  if (!clientEmail || !privateKey || !issuerId) return null;
  return {
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
    issuerId,
    logoUrl: process.env.GOOGLE_WALLET_LOGO_URL || "https://www.collabnb.com/assets/favicon.png",
    // Optional banner photo across the bottom of the pass (see ensureObject) —
    // no default, since guessing a URL that isn't actually hosted would just
    // render as a broken image on the pass.
    heroImageUrl: process.env.GOOGLE_WALLET_HERO_IMAGE_URL || undefined,
  };
}

async function getAccessToken(creds: WalletCreds): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwtRS256(
    {
      iss: creds.clientEmail,
      scope: "https://www.googleapis.com/auth/wallet_object.issuer",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    creds.privateKey
  );
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`Google OAuth failed: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function classId(creds: WalletCreds): string {
  return `${creds.issuerId}.${CLASS_SUFFIX}`;
}

function objectIdFor(creds: WalletCreds, profileId: string): string {
  const safe = String(profileId).replace(/[^A-Za-z0-9_.-]/g, "");
  return `${creds.issuerId}.member_${safe}`;
}

async function ensureClass(creds: WalletCreds, token: string): Promise<string> {
  const id = classId(creds);
  const res = await fetch(`${WALLET_API}/genericClass`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  // 409 = already created on a previous call — fine, this is idempotent setup.
  if (!res.ok && res.status !== 409) throw new Error(`Wallet class create failed: ${await res.text()}`);
  return id;
}

async function ensureObject(creds: WalletCreds, token: string, profile: any): Promise<string> {
  const id = objectIdFor(creds, String(profile._id));
  const roleLabel = profile.role === "host" ? "Host" : "Creator";
  const memberSince = new Date(profile._creationTime).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  // Personalized to this person's own referral link (Settings > Referrals —
  // extra free time for whoever they refer) so a scan/tap attributes back to
  // them. Deliberately NOT the paid Ambassador program, which is invite-only
  // and unrelated to this pass. Falls back to the plain homepage if this
  // profile has no referral_code (e.g. pre-referral-system accounts).
  const referralUrl = profile.referral_code
    ? `https://collabnb.com/join?ref=${profile.referral_code}`
    : "https://collabnb.com";

  const body: Record<string, unknown> = {
    id,
    classId: classId(creds),
    state: "ACTIVE",
    cardTitle: { defaultValue: { language: "en", value: "Collabnb" } },
    subheader: { defaultValue: { language: "en", value: roleLabel } },
    header: { defaultValue: { language: "en", value: profile.full_name || "Member" } },
    hexBackgroundColor: "#19312d",
    logo: { sourceUri: { uri: creds.logoUrl } },
    textModulesData: [
      { id: "role", header: "Role", body: roleLabel },
      { id: "member_since", header: "Member since", body: memberSince },
    ],
    barcode: {
      type: "QR_CODE",
      value: referralUrl,
      alternateText: profile.referral_code ? `Referral: ${profile.referral_code}` : "Open Collabnb",
    },
    linksModuleData: {
      uris: [{ uri: referralUrl, description: "Open Collabnb", id: "open_collabnb" }],
    },
  };
  if (creds.heroImageUrl) {
    (body as any).imageModulesData = [{ id: "hero", mainImage: { sourceUri: { uri: creds.heroImageUrl } } }];
  }

  const existing = await fetch(`${WALLET_API}/genericObject/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (existing.ok) {
    const res = await fetch(`${WALLET_API}/genericObject/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Wallet object update failed: ${await res.text()}`);
    return id;
  }

  await ensureClass(creds, token);
  const res = await fetch(`${WALLET_API}/genericObject`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Wallet object create failed: ${await res.text()}`);
  return id;
}

async function addMessage(token: string, objectId: string, title: string, body?: string): Promise<void> {
  const res = await fetch(`${WALLET_API}/genericObject/${objectId}/addMessage`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: { header: title, body: body || "", id: `msg_${Date.now()}`, messageType: "TEXT" },
    }),
  });
  if (!res.ok) throw new Error(`Wallet push failed: ${await res.text()}`);
}

// Shared by the public action below and the CLI/admin-testing action further
// down — builds (creating the pass object on first call) the one-time
// "Save to Google Wallet" link for a given profile.
async function buildSaveLink(creds: WalletCreds, token: string, profile: any): Promise<{ saveUrl: string; objectId: string }> {
  // Always (re)ensures the object so it stays current — e.g. a referral code
  // that didn't exist when the pass was first created gets picked up here too.
  const objectId = await ensureObject(creds, token, profile);

  const now = Math.floor(Date.now() / 1000);
  const saveJwt = await signJwtRS256(
    {
      iss: creds.clientEmail,
      aud: "google",
      typ: "savetowallet",
      iat: now,
      payload: { genericObjects: [{ id: objectId }] },
    },
    creds.privateKey
  );
  return { saveUrl: `https://pay.google.com/gp/v/save/${saveJwt}`, objectId };
}

// ─── Public: Settings > Notifications > "Add to Google Wallet" ─────────────
export const generateSaveLink = action({
  args: { profileId: v.string() },
  handler: async (ctx, { profileId }): Promise<{ saveUrl: string }> => {
    await requireOwnerOrAdminAction(ctx, profileId, api.profiles.getByClerkUserId);
    const creds = walletCredentials();
    if (!creds) throw new ConvexError("Google Wallet isn't set up yet — try again shortly.");

    const profile: any = await ctx.runQuery(api.profiles.getById, { id: profileId });
    if (!profile) throw new ConvexError("Profile not found.");

    const token = await getAccessToken(creds);
    const { saveUrl, objectId } = await buildSaveLink(creds, token, profile);
    if (!profile.google_wallet_object_id) {
      await ctx.runMutation(internal.googleWallet.setWalletObjectId, { profileId, objectId });
    }
    return { saveUrl };
  },
});

// CLI/admin-only escape hatch — `internal.*` functions aren't reachable from
// the client SDK, only from `npx convex run` (deploy-key authority) or other
// server code, so this intentionally skips the owner-auth check above. Useful
// for generating a save link (e.g. to turn into a QR code) before the
// Settings UI ships, or for handing one to someone outside the normal flow.
export const generateSaveLinkForTesting = internalAction({
  args: { profileId: v.string() },
  handler: async (ctx, { profileId }): Promise<{ saveUrl: string }> => {
    const creds = walletCredentials();
    if (!creds) throw new Error("Google Wallet isn't configured.");

    const profile: any = await ctx.runQuery(api.profiles.getById, { id: profileId });
    if (!profile) throw new Error("Profile not found.");

    const token = await getAccessToken(creds);
    const { saveUrl, objectId } = await buildSaveLink(creds, token, profile);
    if (!profile.google_wallet_object_id) {
      await ctx.runMutation(internal.googleWallet.setWalletObjectId, { profileId, objectId });
    }
    return { saveUrl };
  },
});

export const setWalletObjectId = internalMutation({
  args: { profileId: v.string(), objectId: v.string() },
  handler: async (ctx, { profileId, objectId }) => {
    await ctx.db.patch(profileId as any, {
      google_wallet_object_id: objectId,
      google_wallet_linked_at: Date.now(),
    });
  },
});

// ─── Internal: fired from notifications.create for every in-app notification ─
// Maps the notification `type` onto the same Settings > Notifications
// categories the email/in-app toggles already use, so linking a wallet pass
// doesn't need its own separate preference model.
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
    const creds = walletCredentials();
    if (!creds) return; // not configured — silently a no-op, same as an unlinked pass

    const profile: any = await ctx.runQuery(api.profiles.getById, { id: args.userId });
    if (!profile?.google_wallet_object_id) return;

    const prefKey = PREF_KEY_BY_TYPE[args.type] ?? "contractUpdates";
    if (profile.notification_prefs?.[prefKey] === false) return;

    try {
      const token = await getAccessToken(creds);
      await addMessage(token, profile.google_wallet_object_id, args.title, args.body);
    } catch (err) {
      // Fire-and-forget, same convention as autoreply.ts / the /track beacon —
      // a wallet push failing must never surface as an error to the caller.
      console.error("Google Wallet push failed for", args.userId, err);
    }
  },
});
