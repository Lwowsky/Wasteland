import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { encryptShareCode, decryptShareCode } from "../worker/src/services/shareLinkEncryption.js";

test("2C: AES-GCM link recovery is scoped to resource and key", async () => {
  if (!globalThis.crypto) globalThis.crypto = webcrypto;
  const env = { STATIC_SHARE_LINK_KEY: "1".repeat(64) };
  const encrypted = await encryptShareCode(env, "RANDOM-short-code-123", "players");
  assert.ok(encrypted.startsWith("v1:"));
  assert.ok(!encrypted.includes("RANDOM-short-code-123"));
  assert.equal(await decryptShareCode(env, encrypted, "players"), "RANDOM-short-code-123");
  await assert.rejects(decryptShareCode(env, encrypted, "final_plan"));
  await assert.rejects(decryptShareCode({ STATIC_SHARE_LINK_KEY: "2".repeat(64) }, encrypted, "players"));
  assert.equal(await decryptShareCode(env, null, "players"), null);
});

test("2C: generation without key is rejected", async () => {
  if (!globalThis.crypto) globalThis.crypto = webcrypto;
  await assert.rejects(encryptShareCode({}, "code", "players"), /STATIC_SHARE_LINK_KEY_NOT_CONFIGURED/);
});
