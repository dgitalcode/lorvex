import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeQuery } from "./search";

describe("search normalizeQuery", () => {
  it("lowercases and strips accents", () => {
    assert.equal(normalizeQuery("  Chronographe  "), "chronographe");
    assert.equal(normalizeQuery("Édition"), "edition");
  });
});
