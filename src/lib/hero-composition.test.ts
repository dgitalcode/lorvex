import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("home hero composition", () => {
  const hero = readFileSync(
    join(process.cwd(), "src/components/storefront/home-sections.tsx"),
    "utf8",
  );
  const video = readFileSync(
    join(process.cwd(), "src/components/storefront/hero-video.tsx"),
    "utf8",
  );

  it("centers copy over the cinematic video instead of pinning it to the bottom", () => {
    const section = hero.slice(
      hero.indexOf("export function HeroSection"),
      hero.indexOf("export function ProductRail"),
    );
    assert.match(section, /items-center/);
    assert.doesNotMatch(section, /items-end/);
    assert.doesNotMatch(section, /text-balance/);
    assert.doesNotMatch(section, /max-w-\[14ch\]/);
    assert.match(section, /<h1/);
    assert.match(section, /dictionary\.hero\.title/);
    assert.match(section, /luxury-container/);
    assert.match(section, /text-center/);
    assert.match(section, /object-center/);
  });

  it("keeps the existing hero video as a full-bleed cover background", () => {
    assert.match(video, /object-cover/);
    assert.match(video, /object-center/);
    assert.match(video, /preload="metadata"/);
    assert.doesNotMatch(video, /fetchPriority/);
  });
});
