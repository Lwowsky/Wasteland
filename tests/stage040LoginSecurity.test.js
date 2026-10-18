import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { guardSensitiveRequest, readBoundedSensitiveRequest } from "../worker/src/utils/requestGuard.js";
import { verifySensitiveTurnstile } from "../worker/src/utils/turnstile.js";
import { cleanupSharedConsulSessions } from "../worker/src/auth/sharedConsul.js";

const endpoint = "https://example.invalid/api/shared-consul/login";

test("stage 040: repeated incorrect password attempts are stopped before D1 on rate limit", async () => {
  const env = { SHARED_LOGIN_RATE_LIMIT: { async limit() { return { success: false }; } },
    DB: { prepare() { throw new Error("MUST_NOT_QUERY_D1"); } } };
  const req = new Request(endpoint, { method: "POST", body: '{"password":"guess"}' });
  const result = await guardSensitiveRequest(req, env, "sharedLogin");
  assert.equal(result.status, 429);
});

test("stage 040: chunked body is capped by actual bytes even when Content-Length is absent", async () => {
  const stream = new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode("x".repeat(1400)));
    controller.close();
  } });
  const req = new Request(endpoint, { method: "POST", body: stream, duplex: "half" });
  const limited = await readBoundedSensitiveRequest(req, "sharedLogin");
  assert.equal(limited.status, 413);
  assert.equal((await limited.json()).error, "REQUEST_TOO_LARGE");
});

test("stage 040: bounded request preserves JSON and authorization headers", async () => {
  const req = new Request(endpoint, { method: "POST", headers: {
    Authorization: "Bearer test", "Content-Type": "application/json"
  }, body: JSON.stringify({ password: "valid" }) });
  const bounded = await readBoundedSensitiveRequest(req, "sharedLogin");
  assert.ok(bounded instanceof Request);
  assert.equal(bounded.headers.get("Authorization"), "Bearer test");
  assert.deepEqual(await bounded.json(), { password: "valid" });
});

test("stage 040: Turnstile is optional without configured Worker secret", async () => {
  assert.equal(await verifySensitiveTurnstile(new Request(endpoint,{ method:"POST",body:"{}" }),{}), null);
});

test("stage 040: when configured, missing challenge fails before D1 and without outgoing fetch", async () => {
  const result = await verifySensitiveTurnstile(
    new Request(endpoint,{method:"POST",body:"{}"}),
    { TURNSTILE_SECRET_KEY:"test-secret" },
  );
  assert.equal(result.status, 403);
  assert.equal((await result.json()).error, "CHALLENGE_REQUIRED");
});

test("stage 040: valid Turnstile response is accepted and failed response rejected", async () => {
  const req = () => new Request(endpoint,{method:"POST",body:JSON.stringify({turnstileToken:"test-token-1234567890"})});
  const oldFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.match(url, /turnstile\/v0\/siteverify/);
      assert.equal(options.method, "POST");
      assert.equal(options.body.get("secret"),"test-secret");
      return new Response(JSON.stringify({ success:true, action:"shared_login", hostname:"wasteland-king.pages.dev" }),{status:200});
    };
    assert.equal(await verifySensitiveTurnstile(req(), {TURNSTILE_SECRET_KEY:"test-secret", TURNSTILE_ALLOWED_HOSTNAMES:"wasteland-king.pages.dev"}, "shared_login"),null);
    globalThis.fetch = async () => new Response(JSON.stringify({success:false}),{status:200});
    const rejected = await verifySensitiveTurnstile(req(), {TURNSTILE_SECRET_KEY:"test-secret"},"shared_login");
    assert.equal(rejected.status,403);
    assert.equal((await rejected.json()).error,"CHALLENGE_FAILED");
  } finally { globalThis.fetch = oldFetch; }
});

test("stage 040: expired sessions are cleaned once daily without scanning players", async () => {
  const statements = [];
  const env = {DB:{prepare(sql){ const part={sql,bind(...params){this.params=params;return this;}}; statements.push(part);return part; },async batch(items){assert.equal(items.length,2);} }};
  await cleanupSharedConsulSessions(env,123456);
  assert.equal(statements.length,2);
  for(const part of statements){ assert.match(part.sql,/DELETE FROM shared_consul_sessions/);assert.deepEqual(part.params,[123456]); }
});

test("stage 040: Pages links never send secret in Referrer header", () => {
  const headers=readFileSync(new URL("../public/_headers",import.meta.url),"utf8");
  assert.match(headers,/Referrer-Policy:\s*no-referrer/);
});

test("stage 040: Firestore rules template prevents user-written Owner role", () => {
  const rules=readFileSync(new URL("../security/firestore.rules.REVIEW_ONLY",import.meta.url),"utf8");
  assert.match(rules,/request\.resource\.data\.role in \['admin', 'consul'\]/);
  assert.match(rules,/resource\.data\.role != 'owner'/);
  assert.match(rules,/request\.resource\.data\.uid == request\.auth\.uid/);
});

test("stage 040: same valid password with active shared session avoids a new D1 session write", async () => {
  const savedToken = "shared_" + "b".repeat(64);
  let readCount = 0;
  let writes = 0;
  const env = { DB: { prepare(sql) {
    return { bind(...args) {
      if (sql.includes("FROM shared_consul_sessions_v2 s JOIN")) {
        assert.equal(args.length, 2); // session hash + typed password hash
      }
      return this;
    }, async first() {
      readCount += 1;
      return {session_expiry: Math.floor(Date.now() / 1000) + 300,
        credential_expiry: null};
    }, async run() { writes += 1; } };
  } } };
  const { handleSharedLogin } = await import("../worker/src/auth/sharedConsul.js");
  const result = await handleSharedLogin(new Request(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${savedToken}` },
    body: JSON.stringify({ password:"x".repeat(64) }),
  }), env);
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.token, savedToken);
  assert.equal(readCount, 1);
  assert.equal(writes, 0);
});
