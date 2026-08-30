import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { brandIconUrls, lorvexMetadataIcons } from "./brand-icons";

describe("LORVEX favicon metadata", () => {
  it("points crawlers at LORVEX assets, not Vercel defaults", () => {
    const serialized = JSON.stringify(lorvexMetadataIcons);
    assert.equal(serialized.includes("vercel"), false);
    assert.equal(serialized.includes("/favicon.ico"), true);
    assert.equal(serialized.includes("/icons/icon.svg"), true);
    assert.equal(serialized.includes("/apple-touch-icon.png"), true);
  });

  it("ships raster and vector icons on disk", () => {
    for (const url of brandIconUrls()) {
      const file = url.replace(/^\//, "public/");
      const bytes = readFileSync(file);
      assert.ok(bytes.byteLength > 32, file);
    }
    assert.ok(readFileSync("src/app/favicon.ico").byteLength > 32);
    assert.ok(readFileSync("src/app/icon.svg").byteLength > 32);
  });
});
