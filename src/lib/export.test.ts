import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toCsv } from "./export";

describe("toCsv", () => {
  it("serializes rows with headers and escapes commas", () => {
    const csv = toCsv([
      { name: "Noir Imperial", price: 48500 },
      { name: "Atlas, Dawn", price: 28900 },
    ]);
    assert.equal(
      csv,
      'name,price\nNoir Imperial,48500\n"Atlas, Dawn",28900',
    );
  });

  it("returns empty string for empty input", () => {
    assert.equal(toCsv([]), "");
  });
});
