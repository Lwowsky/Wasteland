// Versioned AES-256-GCM envelope for static link-only views.
// One encrypted resource, a small wrapped data key per active link.
// Never put raw share codes, data keys, or plaintext protected records in Pages JSON.
const enc = new TextEncoder();
const dec = new TextDecoder();
const codePattern = /^[a-zA-Z0-9_-]{16}$/;

function encode64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function decode64(value) {
  if (typeof value !== "string" || !/^[\w-]+$/.test(value)) throw new Error("INVALID_SEALED_SNAPSHOT");
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
function random(length) { return crypto.getRandomValues(new Uint8Array(length)); }
async function deriveWrapKey(code, resource) {
  if (!codePattern.test(code) || !["players", "final_plan"].includes(resource)) {
    throw new Error("INVALID_SHARE_CODE");
  }
  const secret = await crypto.subtle.importKey("raw", enc.encode(code), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({
    name: "HKDF", hash: "SHA-256",
    salt: enc.encode("wasteland-static-snapshot-link-v1"),
    info: enc.encode(`wrap:${resource}`),
  }, secret, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
function aad(resource, use) { return enc.encode(`wasteland-static-v1:${resource}:${use}`); }
async function digest(code) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(code))))
    .map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function sealSnapshotForLinks(resource, payload, links) {
  if (!["players", "final_plan"].includes(resource)) throw new Error("INVALID_CONTENT_RESOURCE");
  const dataKeyRaw = random(32);
  const key = await crypto.subtle.importKey("raw", dataKeyRaw, "AES-GCM", false, ["encrypt"]);
  const iv = random(12);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad(resource, "data") },
    key, enc.encode(JSON.stringify(payload)));
  const shareLinks = [];
  for (const link of links || []) {
    if (!codePattern.test(link.code)) throw new Error("UNRECOVERABLE_STATIC_SHARE_CODE");
    const hash = await digest(link.code);
    if (link.hash && link.hash !== hash) throw new Error("INVALID_STATIC_SHARE_HASH");
    const wrappingKey = await deriveWrapKey(link.code, resource);
    const wrapIv = random(12);
    const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv: wrapIv,
      additionalData: aad(resource, "key") }, wrappingKey, dataKeyRaw);
    shareLinks.push({ hash, expiresAt: link.expiresAt || null,
      wrappedKey: { iv: encode64(wrapIv), ciphertext: encode64(new Uint8Array(wrapped)) } });
  }
  return { sealed: { version: 1, iv: encode64(iv), ciphertext: encode64(new Uint8Array(ciphertext)) }, shareLinks };
}

export async function openSnapshotFromLink(resource, sealed, entry, code) {
  if (!sealed || sealed.version !== 1 || !entry?.wrappedKey || !codePattern.test(code)) {
    throw new Error("INVALID_SEALED_SNAPSHOT");
  }
  if (entry.hash !== await digest(code)) throw new Error("CONTENT_ACCESS_REQUIRED");
  if (entry.expiresAt && !(Date.parse(entry.expiresAt) > Date.now())) {
    throw new Error("CONTENT_ACCESS_EXPIRED");
  }
  try {
    const wrappingKey = await deriveWrapKey(code, resource);
    const keyBytes = await crypto.subtle.decrypt({ name: "AES-GCM",
      iv: decode64(entry.wrappedKey.iv), additionalData: aad(resource, "key") },
    wrappingKey, decode64(entry.wrappedKey.ciphertext));
    const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM",
      iv: decode64(sealed.iv), additionalData: aad(resource, "data") },
    key, decode64(sealed.ciphertext));
    return JSON.parse(dec.decode(plaintext));
  } catch { throw new Error("CONTENT_ACCESS_REQUIRED"); }
}
