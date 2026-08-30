import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { dictionaries } from "@/i18n/dictionaries";

describe("storefront product card actions", () => {
  const card = readFileSync(
    join(process.cwd(), "src/components/storefront/product-card.tsx"),
    "utf8",
  );
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const wa = readFileSync(
    join(process.cwd(), "src/components/storefront/whatsapp-button.tsx"),
    "utf8",
  );

  it("reveals three real action buttons on desktop hover and keyboard focus", () => {
    assert.match(card, /copy\.product\.wishlist/);
    assert.match(card, /copy\.product\.compare/);
    assert.match(card, /copy\.product\.addToCart/);
    assert.match(card, /wishlist\.toggle\(product\.id\)/);
    assert.match(card, /compare\.toggle\(product\.id\)/);
    assert.match(card, /addItem\(/);
    assert.match(card, /resolveAddToCartIntent/);
    assert.match(card, /group-focus-within/);
    assert.match(card, /md:flex md:group-hover:opacity-100/);
    assert.match(card, /stopPropagation/);
    assert.doesNotMatch(card, /bg-background\/90/);
    assert.equal(dictionaries.ar.product.addToCart, "أضف إلى السلة");
    assert.equal(dictionaries.fr.product.wishlist, "Ajouter aux favoris");
  });

  it("keeps WhatsApp attention as an infinite CSS pulse that respects reduced motion", () => {
    assert.match(wa, /wa-pulse/);
    assert.match(wa, /!reduce/);
    assert.match(css, /animation: wa-pulse 2\.8s/);
    assert.match(css, /infinite/);
    assert.match(css, /prefers-reduced-motion: reduce[\s\S]*\.wa-pulse/);
  });
});
