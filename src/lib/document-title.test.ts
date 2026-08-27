import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  composeDocumentTitle,
  documentTitleHasDuplicateBrand,
} from "./document-title";

describe("composeDocumentTitle", () => {
  it("adds a single brand suffix when the page title has none", () => {
    assert.equal(
      composeDocumentTitle("Noir Imperial 40"),
      "Noir Imperial 40 | LORVEX",
    );
  });

  it("does not duplicate a title that already ends with the brand", () => {
    assert.equal(
      composeDocumentTitle("Noir Imperial 40 | LORVEX"),
      "Noir Imperial 40 | LORVEX",
    );
    assert.equal(
      composeDocumentTitle("Noir Imperial 40 | LORVEX · LORVEX"),
      "Noir Imperial 40 | LORVEX",
    );
    assert.equal(
      composeDocumentTitle("Noir Imperial 40 · LORVEX"),
      "Noir Imperial 40 | LORVEX",
    );
  });

  it("keeps LORVEX inside a product name and still adds one suffix", () => {
    assert.equal(
      composeDocumentTitle("LORVEX Imperial"),
      "LORVEX Imperial | LORVEX",
    );
  });

  it("composes localized homepage and collection titles once", () => {
    assert.equal(
      composeDocumentTitle("Montres de luxe au Maroc"),
      "Montres de luxe au Maroc | LORVEX",
    );
    assert.equal(
      composeDocumentTitle("Luxury Watches in Morocco"),
      "Luxury Watches in Morocco | LORVEX",
    );
    assert.equal(
      composeDocumentTitle("ساعات فاخرة في المغرب"),
      "ساعات فاخرة في المغرب | LORVEX",
    );
    assert.equal(
      composeDocumentTitle("Haute Complication"),
      "Haute Complication | LORVEX",
    );
  });

  it("flags duplicate brand separators", () => {
    assert.equal(
      documentTitleHasDuplicateBrand("Noir Imperial 40 | LORVEX · LORVEX"),
      true,
    );
    assert.equal(
      documentTitleHasDuplicateBrand("Noir Imperial 40 | LORVEX"),
      false,
    );
  });
});
