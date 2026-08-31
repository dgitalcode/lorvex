import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("storefront mobile WhatsApp and iOS input zoom", () => {
  const wa = readFileSync(
    join(process.cwd(), "src/components/storefront/whatsapp-button.tsx"),
    "utf8",
  );
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
  const cta = readFileSync(
    join(process.cwd(), "src/components/product/floating-cta.tsx"),
    "utf8",
  );

  it("anchors WhatsApp to the mobile bottom-end corner and keeps the pulse", () => {
    assert.match(wa, /whatsapp-fab/);
    assert.match(wa, /bottom-\[calc\(1\.25rem\+env\(safe-area-inset-bottom,0px\)\)\]/);
    assert.match(wa, /right-\[max\(1\.25rem,env\(safe-area-inset-right,0px\)\)\]/);
    assert.match(wa, /lg:bottom-\[calc\(1\.5rem\+env\(safe-area-inset-bottom,0px\)\)\]/);
    assert.match(wa, /wa-pulse/);
    assert.match(cta, /data-floating-purchase/);
    assert.match(css, /body:has\(\[data-floating-purchase\]\) \.whatsapp-fab/);
  });

  it("sets 16px form fields on mobile without disabling viewport zoom", () => {
    assert.match(css, /font-size:\s*16px/);
    assert.match(css, /@media \(max-width: 767px\)/);
    assert.match(layout, /viewportFit:\s*"cover"/);
    assert.doesNotMatch(layout, /maximumScale/);
    assert.doesNotMatch(layout, /userScalable/);
    assert.doesNotMatch(layout, /maximum-scale/);
    assert.doesNotMatch(layout, /user-scalable/);
  });
});
