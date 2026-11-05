import { describe, expect, test } from "vitest";
import { EMULATOR_CONFIG, parseServiceAccount, readPublicConfig } from "./config";

const good = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "game-master-2caae.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "game-master-2caae",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:521050623238:web:067deb3b079f950ecc2287",
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: "https://game-master-2caae-default-rtdb.firebaseio.com",
};

describe("readPublicConfig", () => {
  test("builds the Firebase web config from the public variables", () => {
    expect(readPublicConfig(good)).toEqual({
      apiKey: "key",
      authDomain: "game-master-2caae.firebaseapp.com",
      projectId: "game-master-2caae",
      appId: "1:521050623238:web:067deb3b079f950ecc2287",
      databaseURL: "https://game-master-2caae-default-rtdb.firebaseio.com",
    });
  });

  test("names every missing variable", () => {
    expect(() =>
      readPublicConfig({
        ...good,
        NEXT_PUBLIC_FIREBASE_API_KEY: "",
        NEXT_PUBLIC_FIREBASE_APP_ID: undefined,
      }),
    ).toThrow(/NEXT_PUBLIC_FIREBASE_API_KEY.*NEXT_PUBLIC_FIREBASE_APP_ID/);
  });

  test("uses the demo project when running against the emulators", () => {
    expect(readPublicConfig({ NEXT_PUBLIC_FIREBASE_EMULATORS: "1" })).toEqual(EMULATOR_CONFIG);
    expect(EMULATOR_CONFIG.projectId).toMatch(/^demo-/);
  });
});

describe("parseServiceAccount", () => {
  const account = {
    type: "service_account",
    project_id: "game-master-2caae",
    client_email: "firebase-adminsdk@game-master-2caae.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
  };

  test("reads the JSON file pasted as-is, and turns escaped newlines in the key into real ones", () => {
    const parsed = parseServiceAccount(JSON.stringify(account));
    expect(parsed.projectId).toBe("game-master-2caae");
    expect(parsed.clientEmail).toBe(account.client_email);
    expect(parsed.privateKey).toContain("\nabc\n");
  });

  test("also reads it base64-encoded", () => {
    const parsed = parseServiceAccount(Buffer.from(JSON.stringify(account)).toString("base64"));
    expect(parsed.projectId).toBe("game-master-2caae");
  });

  test("says which field is missing without ever echoing the value", () => {
    const raw = JSON.stringify({ ...account, private_key: undefined });
    expect(() => parseServiceAccount(raw)).toThrow(/private_key/);
    try {
      parseServiceAccount(JSON.stringify({ ...account, client_email: "" }));
    } catch (err) {
      expect(String(err)).not.toContain("BEGIN PRIVATE KEY");
    }
  });

  test("rejects something that isn't JSON or base64 JSON", () => {
    expect(() => parseServiceAccount("not a key")).toThrow(/FIREBASE_SERVICE_ACCOUNT/);
  });
});
