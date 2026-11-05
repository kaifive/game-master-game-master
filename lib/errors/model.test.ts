import { describe, expect, test } from "vitest";
import { AppError, isAppError, statusFor } from "./model";

describe("AppError", () => {
  test("carries a code, a player-safe message and its HTTP status", () => {
    const err = new AppError("NOT_FOUND", "We couldn't find that event.");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("We couldn't find that event.");
    expect(err.status).toBe(404);
    expect(err).toBeInstanceOf(Error);
  });

  test("keeps the cause for logs", () => {
    const cause = new Error("db down");
    expect(new AppError("INTERNAL", "Try again.", { cause }).cause).toBe(cause);
  });

  test("maps every code to a status", () => {
    expect(statusFor("BAD_REQUEST")).toBe(400);
    expect(statusFor("NOT_SIGNED_IN")).toBe(401);
    expect(statusFor("FORBIDDEN")).toBe(403);
    expect(statusFor("NOT_FOUND")).toBe(404);
    expect(statusFor("CONFLICT")).toBe(409);
    expect(statusFor("RATE_LIMITED")).toBe(429);
    expect(statusFor("INTERNAL")).toBe(500);
  });

  test("carries player-safe details for the response", () => {
    const err = new AppError("BAD_REQUEST", "Check the form.", { details: { fields: ["name"] } });
    expect(err.details).toEqual({ fields: ["name"] });
    expect(new AppError("CONFLICT", "Taken.").details).toEqual({});
  });

  test("isAppError tells AppErrors apart from other errors", () => {
    expect(isAppError(new AppError("CONFLICT", "Taken."))).toBe(true);
    expect(isAppError(new Error("x"))).toBe(false);
    expect(isAppError("x")).toBe(false);
  });
});
