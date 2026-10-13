import assert from "node:assert/strict";
import { test } from "node:test";
import { handleRegistration } from "./registration.js";

test("manual registration closure prevents public POST even within a valid cycle", async () => {
  let periodWasAccessed = false;
  const env = {
    DB: {
      prepare(query) {
        if (query.includes("FROM registration_settings")) {
          return {
            async first() {
              return { publicRegistration: 0 };
            },
          };
        }
        if (query.includes("FROM alliance_rotation")) {
          return {
            async all() {
              return { results: [] };
            },
          };
        }
        periodWasAccessed = true;
        throw new Error("Registration period must not be opened after manual closure");
      },
    },
  };

  const request = new Request("https://example.com/api/registration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname: "Someone" }),
  });
  const response = await handleRegistration(request, env);
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    success: false,
    error: "REGISTRATION_DISABLED",
  });
  assert.equal(periodWasAccessed, false);
});
