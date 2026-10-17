// Private AES-GCM storage for share codes. Never publish ciphertext or keys in snapshots.
// STATIC_SHARE_LINK_KEY must be 64 hexadecimal characters (32 random bytes).
function bytesToBase64(bytes) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}
function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
async function encryptionKey(env) {
  const secret = env.STATIC_SHARE_LINK_KEY;
  if (typeof secret !== "string" || !/^[a-fA-F0-9]{64}$/.test(secret)) {
    throw new Error("STATIC_SHARE_LINK_KEY_NOT_CONFIGURED");
  }
  const bytes = Uint8Array.from(secret.match(/../g), (hex) => parseInt(hex, 16));
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function encryptShareCode(env, code, resource) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({
    name: "AES-GCM", iv, additionalData: new TextEncoder().encode(resource),
  }, await encryptionKey(env), new TextEncoder().encode(code));
  return `v1:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(encrypted))}`;
}
export async function decryptShareCode(env, value, resource) {
  if (!value) return null; // Previously created links cannot be recovered.
  const [version, iv, ciphertext] = value.split(":");
  if (version !== "v1" || !iv || !ciphertext) throw new Error("INVALID_SHARE_CIPHERTEXT");
  const result = await crypto.subtle.decrypt({
    name: "AES-GCM", iv: base64ToBytes(iv),
    additionalData: new TextEncoder().encode(resource),
  }, await encryptionKey(env), base64ToBytes(ciphertext));
  return new TextDecoder().decode(result);
}
