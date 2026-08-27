import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRODUCTION_SITE_ORIGIN,
  publicPageUrl,
  resolvePublicSiteUrl,
} from "./site";

describe("resolvePublicSiteUrl", () => {
  it("rewrites the Vercel deployment host to the production origin", () => {
    assert.equal(
      resolvePublicSiteUrl("https://lorvex-eight.vercel.app"),
      PRODUCTION_SITE_ORIGIN,
    );
    assert.equal(
      resolvePublicSiteUrl("https://lorvex-eight.vercel.app/"),
      PRODUCTION_SITE_ORIGIN,
    );
  });

  it("normalizes the apex domain to www", () => {
    assert.equal(
      resolvePublicSiteUrl("https://lorvex.ma"),
      PRODUCTION_SITE_ORIGIN,
    );
  });

  it("keeps localhost for local development", () => {
    assert.equal(
      resolvePublicSiteUrl("http://localhost:3000"),
      "http://localhost:3000",
    );
  });

  it("builds page URLs without trailing slashes", () => {
    assert.equal(publicPageUrl("/fr"), `${resolvePublicSiteUrl()}/fr`);
    assert.equal(
      publicPageUrl("/fr/product/noir-imperial-40"),
      `${resolvePublicSiteUrl()}/fr/product/noir-imperial-40`,
    );
  });
});
