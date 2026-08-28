import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  PRODUCTION_SITE_ORIGIN,
  publicPageUrl,
  resolvePublicSiteUrl,
} from "@/config/site";
import { hreflangLanguages, localeCanonical } from "@/lib/i18n-seo";
import { INDEXABLE_STATIC_PATHS, SITEMAP_EXCLUDED_PATHS } from "./seo-indexability";
import {
  buildRobotsDocument,
  missingCatalogMetadata,
  seoOutputHasLeakage,
  shopQueryIsIndexable,
} from "./seo-indexability";

describe("canonical production hostname", () => {
  it("rewrites Vercel and apex hosts to www.lorvex.ma", () => {
    assert.equal(
      resolvePublicSiteUrl("https://lorvex-eight.vercel.app"),
      PRODUCTION_SITE_ORIGIN,
    );
    assert.equal(resolvePublicSiteUrl("https://lorvex.ma"), PRODUCTION_SITE_ORIGIN);
    assert.equal(
      resolvePublicSiteUrl("https://www.lorvex.ma"),
      PRODUCTION_SITE_ORIGIN,
    );
  });
});

describe("locale canonicals", () => {
  it("self-canonicalizes each locale product URL", () => {
    assert.equal(
      localeCanonical("fr", "/product/noir-imperial-40"),
      publicPageUrl("/fr/product/noir-imperial-40"),
    );
    assert.equal(
      localeCanonical("en", "/product/noir-imperial-40"),
      publicPageUrl("/en/product/noir-imperial-40"),
    );
    assert.equal(
      localeCanonical("ar", "/shop"),
      publicPageUrl("/ar/shop"),
    );
  });
});

describe("hreflang", () => {
  it("emits reciprocal Morocco tags plus x-default", () => {
    const languages = hreflangLanguages("/shop");
    assert.equal(languages["fr-MA"], publicPageUrl("/fr/shop"));
    assert.equal(languages["en-MA"], publicPageUrl("/en/shop"));
    assert.equal(languages["ar-MA"], publicPageUrl("/ar/shop"));
    assert.equal(languages["x-default"], languages["fr-MA"]);
  });
});

describe("robots", () => {
  it("declares the production sitemap and does not block the storefront", () => {
    const robots = buildRobotsDocument(PRODUCTION_SITE_ORIGIN);
    assert.equal(robots.sitemap, `${PRODUCTION_SITE_ORIGIN}/sitemap.xml`);
    assert.equal(robots.host, undefined);
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    const raw = rules[0]?.disallow;
    const disallow = Array.isArray(raw) ? raw : raw ? [raw] : [];
    assert.ok(disallow.includes("/admin/"));
    assert.ok(disallow.includes("/*/search"));
    assert.ok(disallow.includes("/*/cart"));
    assert.equal(disallow.includes("/"), false);
    assert.equal("host" in robots, false);
    assert.equal(JSON.stringify(robots).includes("vercel.app"), false);
  });
});

describe("sitemap URL policy", () => {
  it("includes only indexable static paths and excludes private utilities", () => {
    const staticPaths: readonly string[] = INDEXABLE_STATIC_PATHS;
    assert.ok(staticPaths.includes("/shop"));
    assert.ok(staticPaths.includes("/faq"));
    assert.equal(staticPaths.includes("/search"), false);
    for (const path of SITEMAP_EXCLUDED_PATHS) {
      assert.equal(staticPaths.includes(path), false);
    }
  });

  it("emits production locale URLs without query strings or leakage", () => {
    for (const locale of ["fr", "en", "ar"] as const) {
      for (const path of INDEXABLE_STATIC_PATHS) {
        const url = `${PRODUCTION_SITE_ORIGIN}/${locale}${path}`;
        assert.equal(url.includes("?"), false);
        assert.equal(seoOutputHasLeakage(url), false);
      }
    }
    assert.equal(
      seoOutputHasLeakage(
        JSON.stringify(buildRobotsDocument(PRODUCTION_SITE_ORIGIN)),
      ),
      false,
    );
  });
});

describe("shop query indexability", () => {
  it("indexes the clean listing and noindexes filters, sort, and pagination", () => {
    assert.equal(shopQueryIsIndexable({}), true);
    assert.equal(shopQueryIsIndexable({ page: "1", sort: "newest" }), true);
    assert.equal(shopQueryIsIndexable({ page: "2" }), false);
    assert.equal(shopQueryIsIndexable({ brand: "atelier-noir" }), false);
    assert.equal(shopQueryIsIndexable({ limited: "1" }), false);
    assert.equal(shopQueryIsIndexable({ sort: "price_asc" }), false);
  });
});

describe("missing catalog metadata", () => {
  it("is noindex and does not emit canonical or hreflang", () => {
    const metadata = missingCatalogMetadata();
    assert.deepEqual(metadata.robots, { index: false, follow: false });
    assert.equal("alternates" in metadata, false);
    assert.equal("openGraph" in metadata, false);
    assert.equal(JSON.stringify(metadata).includes("canonical"), false);
    assert.equal(JSON.stringify(metadata).includes("hreflang"), false);
  });

  it("disables on-demand params so unknown slugs 404 at the router", () => {
    const productPage = readFileSync(
      join(import.meta.dirname, "../app/[locale]/product/[slug]/page.tsx"),
      "utf8",
    );
    const collectionPage = readFileSync(
      join(import.meta.dirname, "../app/[locale]/collections/[slug]/page.tsx"),
      "utf8",
    );
    assert.ok(productPage.includes("export const dynamicParams = false"));
    assert.ok(collectionPage.includes("export const dynamicParams = false"));
    assert.equal(productPage.includes("notFound();"), true);
    assert.equal(collectionPage.includes("notFound();"), true);
  });
});

describe("Vercel production alias redirects", () => {
  it("permanently redirects known .vercel.app hosts to www.lorvex.ma", () => {
    const vercel = JSON.parse(
      readFileSync(join(import.meta.dirname, "../../vercel.json"), "utf8"),
    ) as {
      redirects: {
        source: string;
        destination: string;
        permanent: boolean;
        has: { type: string; value: string }[];
      }[];
    };
    const hosts = vercel.redirects.map((rule) => rule.has[0]?.value);
    assert.ok(hosts.includes("lorvex-eight.vercel.app"));
    assert.ok(hosts.includes("lorvex-d-gitalcode-s-projects.vercel.app"));
    for (const rule of vercel.redirects) {
      assert.equal(rule.permanent, true);
      assert.equal(rule.destination, "https://www.lorvex.ma/:path*");
      assert.equal(rule.has[0]?.type, "host");
      assert.equal(rule.destination.includes("vercel.app"), false);
    }
  });
});

describe("leakage", () => {
  it("flags Vercel, apex, and localhost in SEO strings", () => {
    assert.equal(seoOutputHasLeakage("https://www.lorvex.ma/fr"), false);
    assert.equal(
      seoOutputHasLeakage("https://lorvex-eight.vercel.app/fr"),
      true,
    );
    assert.equal(seoOutputHasLeakage("http://localhost:3000/fr"), true);
    assert.equal(seoOutputHasLeakage("https://lorvex.ma/fr"), true);
  });
});

