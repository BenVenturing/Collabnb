// AES-GCM encryption for per-user secrets (BYO AI provider keys) at rest.
// The symmetric key is derived from the AI_KEY_ENCRYPTION_SECRET env var —
// set via `npx convex env set AI_KEY_ENCRYPTION_SECRET <random-value>`.
// Decrypt only inside an action, in memory, immediately before the provider
// API call — never return the raw key to the client or log it.

import { ConvexError } from "convex/values";

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new ConvexError(
      "AI_KEY_ENCRYPTION_SECRET is not configured on this Convex deployment."
    );
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSecret(
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const key = await getKey();
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    new TextEncoder().encode(plaintext)
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(ivBytes),
  };
}

export async function decryptSecret(ciphertext: string, iv: string): Promise<string> {
  const key = await getKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext)
  );
  return new TextDecoder().decode(decrypted);
}
