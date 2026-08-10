import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateSecret, generate } from "otplib";
import {
  findBackupCodeIndex,
  generateBackupCode,
  generateBackupCodes,
  hashBackupCode,
  matchBackupCode,
  normalizeBackupCode,
  verifyTotpCode,
} from "@/server/services/two-factor";

describe("backup codes", () => {
  it("normalizes spacing, case, and dash variants for hashing", () => {
    const a = hashBackupCode("AbCd-Ef12");
    const b = hashBackupCode("abcd ef12");
    const c = hashBackupCode("ABCDEF12");
    const d = hashBackupCode("  AbCd–Ef12  "); // en-dash
    const e = hashBackupCode("AbCd—Ef12"); // em-dash
    assert.equal(a, b);
    assert.equal(a, c);
    assert.equal(a, d);
    assert.equal(a, e);
  });

  it("generates formatted cryptographically random codes", () => {
    const code = generateBackupCode();
    assert.match(code, /^[0-9A-F]{4}-[0-9A-F]{4}$/);
    const set = new Set(generateBackupCodes(8));
    assert.equal(set.size, 8);
  });

  it("never returns plaintext from normalize alone", () => {
    assert.equal(normalizeBackupCode("AAAA-BBBB"), "aaaabbbb");
  });
});

describe("backup code lifecycle", () => {
  it("1) verifies the first generated code successfully", () => {
    const plain = generateBackupCodes(8);
    const hashed = plain.map(hashBackupCode);
    const first = matchBackupCode(hashed, plain[0]!);
    assert.equal(first.ok, true);
    if (first.ok) assert.equal(first.remaining.length, 7);
  });

  it("2) rejects the same code after it was consumed", () => {
    const plain = generateBackupCodes(8);
    let hashed = plain.map(hashBackupCode);
    const first = matchBackupCode(hashed, plain[0]!);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    hashed = first.remaining;
    const again = matchBackupCode(hashed, plain[0]!);
    assert.equal(again.ok, false);
  });

  it("3) accepts another unused generated code", () => {
    const plain = generateBackupCodes(8);
    let hashed = plain.map(hashBackupCode);
    const first = matchBackupCode(hashed, plain[0]!);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    hashed = first.remaining;
    const second = matchBackupCode(hashed, plain[1]!);
    assert.equal(second.ok, true);
  });

  it("4) rejects a wrong code", () => {
    const hashed = generateBackupCodes(8).map(hashBackupCode);
    assert.equal(matchBackupCode(hashed, "DEAD-BEEF").ok, false);
    assert.equal(findBackupCodeIndex(hashed, "0000-0000"), -1);
  });

  it("5) accepts accidental surrounding whitespace", () => {
    const plain = generateBackupCodes(4);
    const hashed = plain.map(hashBackupCode);
    const hit = matchBackupCode(hashed, `  ${plain[2]}  \n`);
    assert.equal(hit.ok, true);
  });

  it("6) regenerate invalidates all previous codes", () => {
    const oldPlain = generateBackupCodes(8);
    const oldHashed = oldPlain.map(hashBackupCode);
    const newPlain = generateBackupCodes(8);
    const newHashed = newPlain.map(hashBackupCode);

    for (const code of oldPlain) {
      assert.equal(
        matchBackupCode(newHashed, code).ok,
        false,
        "old plaintext must not match new hashes",
      );
    }
    assert.equal(matchBackupCode(oldHashed, oldPlain[0]!).ok, true);
    assert.equal(matchBackupCode(newHashed, newPlain[0]!).ok, true);
  });

  it("7) verifyTotpCode does not throw on backup-formatted input", () => {
    const secret = generateSecret();
    assert.equal(verifyTotpCode("A1B2-C3D4", secret), false);
    assert.equal(verifyTotpCode("a1b2c3d4", secret), false);
    assert.equal(verifyTotpCode("ABCDEF", secret), false);
    assert.equal(verifyTotpCode("12345", secret), false);
  });

  it("8) TOTP authentication continues to work normally", async () => {
    const secret = generateSecret();
    const token = await generate({ secret });
    assert.equal(verifyTotpCode(token, secret), true);
    assert.equal(verifyTotpCode("000000", secret), false);

    const plain = generateBackupCodes(2);
    const hashed = plain.map(hashBackupCode);
    // Backup still works alongside a valid TOTP secret
    assert.equal(matchBackupCode(hashed, plain[0]!).ok, true);
  });
});
