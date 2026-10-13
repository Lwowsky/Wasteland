import assert from "node:assert/strict";
import { test } from "node:test";

import { createDefaultRegistrationSettings, saveRegistrationSettings } from "./registrationSettings.js";

function createFakeEnv() {
  const inserted = [];
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind(...values) {
            return {
              async run() {
                inserted.push({ sql, values });
              },
            };
          },
        };
      },
      async batch(statements) {
        return statements;
      },
    },
  };
  return { env, inserted };
}

for (const [disabled, expectedValue] of [[true, 0], [false, 1]]) {
  test(`saving registration as ${disabled ? "closed" : "open"} persists public_registration=${expectedValue}`, async () => {
    const { env, inserted } = createFakeEnv();
    await saveRegistrationSettings(env, {
      ...createDefaultRegistrationSettings(),
      publicRegistration: !disabled,
    });
    const mainWrite = inserted.find(({ sql }) => sql.includes("INSERT INTO registration_settings"));
    assert.ok(mainWrite, "registration settings should be persisted");
    assert.equal(mainWrite.values[0], expectedValue);
  });
}
