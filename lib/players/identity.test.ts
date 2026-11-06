import { describe, expect, it } from "vitest";
import { isAppError } from "@/lib/errors";
import { bearerToken, deviceUid, verifyDevDevice } from "./identity";

const request = (authorization?: string) =>
  new Request("http://x/api", authorization ? { headers: { authorization } } : {});

describe("device identity", () => {
  it("reads a bearer token", () => {
    expect(bearerToken(request("Bearer abc.def"))).toBe("abc.def");
    expect(bearerToken(request("bearer   xyz"))).toBe("xyz");
    expect(bearerToken(request("Basic abc"))).toBeNull();
    expect(bearerToken(request())).toBeNull();
  });

  it("accepts well-formed dev tokens only", async () => {
    expect(await verifyDevDevice("dev:3f2a9c1e-77aa")).toBe("3f2a9c1e-77aa");
    expect(await verifyDevDevice("dev:short")).toBeNull();
    expect(await verifyDevDevice("dev:../../etc")).toBeNull();
    expect(await verifyDevDevice("eyJhbGciOi.real.token")).toBeNull();
  });

  it("S02-AC11: refuses a missing or invalid token with 401", async () => {
    const verify = (t: string) => Promise.resolve(t === "good" ? "deviceA1" : null);
    expect(await deviceUid(request("Bearer good"), verify)).toBe("deviceA1");
    for (const r of [request(), request("Bearer bad")]) {
      const err: unknown = await deviceUid(r, verify).catch((e: unknown) => e);
      expect(isAppError(err) && err.status).toBe(401);
    }
  });
});
