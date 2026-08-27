import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicPageUrl } from "@/config/site";
import { resolveStorefrontSettings } from "@/lib/storefront-settings";
import {
  absoluteAssetUrl,
  buildBreadcrumbListJsonLd,
  buildCollectionPageJsonLd,
  buildFaqPageJsonLd,
  buildProductJsonLd,
  buildSiteGraphJsonLd,
  gtinFromBarcode,
  sellingOffer,
  serializeJsonLd,
  verifiedSameAs,
} from "./json-ld";

const settings = resolveStorefrontSettings(null);

describe("JSON-LD serialization", () => {
  it("escapes script breakers", () => {
    const html = serializeJsonLd({ name: "</script><script>alert(1)" });
    assert.equal(html.includes("</script>"), false);
    assert.equal(html.includes("\\u003c"), true);
  });
});

describe("Organization and WebSite", () => {
  const graph = buildSiteGraphJsonLd(settings);

  it("emits a valid Organization with www URL and logo", () => {
    const organization = (graph["@graph"] as Record<string, unknown>[])[0];
    assert.equal(graph["@context"], "https://schema.org");
    assert.equal(organization["@type"], "Organization");
    assert.equal(organization.url, publicPageUrl("/"));
    assert.equal(typeof organization.logo, "string");
    assert.ok(String(organization.logo).startsWith(publicPageUrl("/")));
  });

  it("emits WebSite without SearchAction", () => {
    const website = (graph["@graph"] as Record<string, unknown>[])[1];
    assert.equal(website["@type"], "WebSite");
    assert.equal(website.url, publicPageUrl("/"));
    assert.equal("potentialAction" in website, false);
  });

  it("omits placeholder social profiles", () => {
    assert.deepEqual(verifiedSameAs(settings), []);
  });
});

describe("Product and Offer", () => {
  const product = buildProductJsonLd({
    locale: "fr",
    slug: "noir-imperial-40",
    name: "Noir Imperial 40",
    description: "Pièce sélectionnée par la maison LORVEX.",
    sku: "LX-ANI-001",
    brandName: "Atelier Noir",
    currency: "MAD",
    images: ["/images/lorvex/watch-01.jpg"],
    barcode: null,
    variants: [{ price: 48500, stock: 3 }],
    basePrice: 99999,
    reviews: [],
  });

  it("uses the canonical PDP URL, brand, image, and visible selling price", () => {
    const offers = product.offers as Record<string, unknown>;
    const canonical = publicPageUrl("/fr/product/noir-imperial-40");
    assert.equal(product["@type"], "Product");
    assert.equal(product.name, "Noir Imperial 40");
    assert.equal(product.url, canonical);
    assert.equal((product.brand as { name: string }).name, "Atelier Noir");
    assert.deepEqual(product.image, [
      publicPageUrl("/images/lorvex/watch-01.jpg"),
    ]);
    assert.equal(offers.url, canonical);
    assert.equal(offers.price, "48500");
    assert.equal(offers.priceCurrency, "MAD");
    assert.equal(offers.availability, "https://schema.org/InStock");
  });

  it("omits ratings, reviews, and GTINs when they are not real", () => {
    assert.equal("aggregateRating" in product, false);
    assert.equal("review" in product, false);
    assert.equal("gtin" in product, false);
  });

  it("marks availability from inventory and prefers an in-stock variant price", () => {
    const out = sellingOffer({
      variants: [{ price: 10, stock: 0 }],
      basePrice: 10,
    });
    assert.equal(out.inStock, false);
    const inStock = sellingOffer({
      variants: [
        { price: 100, stock: 0 },
        { price: 80, stock: 2 },
      ],
      basePrice: 100,
    });
    assert.equal(inStock.price, 80);
    assert.equal(inStock.inStock, true);
  });

  it("includes genuine reviews and aggregateRating together", () => {
    const withReviews = buildProductJsonLd({
      locale: "en",
      slug: "noir-imperial-40",
      name: "Noir Imperial 40",
      description: "Selected by LORVEX.",
      sku: "LX-ANI-001",
      brandName: "Atelier Noir",
      currency: "MAD",
      images: ["https://www.lorvex.ma/images/lorvex/watch-01.jpg"],
      variants: [{ price: 48500, stock: 1 }],
      basePrice: 48500,
      reviews: [
        { rating: 5, body: "Superb.", author: "Amine" },
        { rating: 4, body: "Beautiful.", author: "Sara" },
      ],
    });
    assert.equal(
      (withReviews.aggregateRating as { reviewCount: number }).reviewCount,
      2,
    );
    assert.equal((withReviews.review as unknown[]).length, 2);
  });
});

describe("identifiers", () => {
  it("accepts only real GTIN lengths and rejects SKU-like values", () => {
    assert.equal(gtinFromBarcode("12345678"), "12345678");
    assert.equal(gtinFromBarcode("LX-ANI-001"), undefined);
    assert.equal(gtinFromBarcode("0000000000000"), undefined);
    assert.equal(gtinFromBarcode("noir-imperial-40"), undefined);
  });
});

describe("BreadcrumbList and CollectionPage", () => {
  it("emits sequential www URLs", () => {
    const crumbs = buildBreadcrumbListJsonLd([
      { name: "LORVEX", path: "/fr" },
      { name: "Boutique", path: "/fr/shop" },
      { name: "Heritage", path: "/fr/collections/heritage" },
    ]);
    const items = crumbs.itemListElement as { position: number; item: string }[];
    assert.equal(crumbs["@type"], "BreadcrumbList");
    assert.deepEqual(
      items.map((item) => item.position),
      [1, 2, 3],
    );
    assert.ok(items.every((item) => item.item.startsWith(publicPageUrl("/"))));
  });

  it("lists only the products provided for the collection", () => {
    const page = buildCollectionPageJsonLd({
      locale: "fr",
      slug: "heritage",
      name: "Heritage",
      products: [{ name: "Noir Imperial 40", slug: "noir-imperial-40" }],
    });
    const list = page.mainEntity as {
      numberOfItems: number;
      itemListElement: { url: string }[];
    };
    assert.equal(page["@type"], "CollectionPage");
    assert.equal(list.numberOfItems, 1);
    assert.equal(
      list.itemListElement[0].url,
      publicPageUrl("/fr/product/noir-imperial-40"),
    );
  });
});

describe("FAQPage", () => {
  it("matches visible questions only", () => {
    const faq = buildFaqPageJsonLd([
      { question: "Are all LORVEX watches authentic?", answer: "Yes." },
      { question: " ", answer: "skip" },
    ]);
    assert.equal(faq?.["@type"], "FAQPage");
    assert.equal((faq?.mainEntity as unknown[]).length, 1);
  });
});

describe("domain leakage", () => {
  it("does not emit Vercel, apex, or localhost production hosts in URL fields", () => {
    const product = buildProductJsonLd({
      locale: "ar",
      slug: "noir-imperial-40",
      name: "Noir Imperial 40",
      description: "LORVEX.",
      sku: "LX-ANI-001",
      brandName: "Atelier Noir",
      currency: "MAD",
      images: ["/images/lorvex/watch-01.jpg"],
      variants: [{ price: 48500, stock: 1 }],
      basePrice: 48500,
      reviews: [],
    });
    const blob = JSON.stringify({
      product,
      site: buildSiteGraphJsonLd(settings),
      asset: absoluteAssetUrl("/icons/icon.svg"),
    });
    assert.equal(blob.includes("lorvex-eight"), false);
    assert.equal(blob.includes("vercel.app"), false);
    assert.equal(/https:\/\/lorvex\.ma\//.test(blob), false);
  });
});
