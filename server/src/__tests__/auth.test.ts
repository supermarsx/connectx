import { describe, it, expect, vi, beforeAll } from "vitest";
import jwt from "jsonwebtoken";

// Mock the config module before importing auth modules
vi.mock("../config.js", () => ({
  config: {
    JWT_SECRET: "test-secret-key-for-unit-tests",
    JWT_EXPIRES_IN: "7d",
  },
}));

const TEST_SECRET = "test-secret-key-for-unit-tests";

// ── Password Utils ──

describe("passwordUtils", () => {
  let hashPassword: typeof import("../auth/passwordUtils.js").hashPassword;
  let verifyPassword: typeof import("../auth/passwordUtils.js").verifyPassword;

  beforeAll(async () => {
    const mod = await import("../auth/passwordUtils.js");
    hashPassword = mod.hashPassword;
    verifyPassword = mod.verifyPassword;
  });

  it("produces different hashes for the same password (salt)", async () => {
    const password = "my-secret-password";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });

  it("verification succeeds with correct password", async () => {
    const password = "correct-horse-battery-staple";
    const hash = await hashPassword(password);
    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });

  it("verification fails with wrong password", async () => {
    const password = "correct-horse-battery-staple";
    const hash = await hashPassword(password);
    const result = await verifyPassword("wrong-password", hash);
    expect(result).toBe(false);
  });

  it("verification fails with empty password", async () => {
    const hash = await hashPassword("real-password");
    const result = await verifyPassword("", hash);
    expect(result).toBe(false);
  });
});

// ── Token Revalidation ──

describe("revalidateToken", () => {
  let revalidateToken: typeof import("../auth/authMiddleware.js").revalidateToken;

  beforeAll(async () => {
    const mod = await import("../auth/authMiddleware.js");
    revalidateToken = mod.revalidateToken;
  });

  it("returns payload for a valid JWT", () => {
    const payload = { id: "user-123", username: "alice" };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: "1h" });
    const result = revalidateToken(token);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("user-123");
    expect(result!.username).toBe("alice");
  });

  it("returns null for an expired JWT", () => {
    const payload = { id: "user-456", username: "bob" };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: "-1s" });
    const result = revalidateToken(token);
    expect(result).toBeNull();
  });

  it("returns null for a JWT signed with wrong secret", () => {
    const payload = { id: "user-789", username: "charlie" };
    const token = jwt.sign(payload, "wrong-secret");
    const result = revalidateToken(token);
    expect(result).toBeNull();
  });

  it("returns null for malformed token string", () => {
    expect(revalidateToken("not-a-valid-token")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(revalidateToken("")).toBeNull();
  });
});
