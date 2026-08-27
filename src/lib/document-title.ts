const DEFAULT_BRAND = "LORVEX";

/**
 * Single brand suffix for document titles.
 * Collapses "| LORVEX · LORVEX" (and similar) into one intentional occurrence.
 * Does not strip LORVEX from the middle of a product name.
 */
export function composeDocumentTitle(
  pageTitle: string,
  brand = DEFAULT_BRAND,
): string {
  const trimmed = pageTitle.replace(/\s+/g, " ").trim();
  if (!trimmed) return brand;

  const parts = trimmed
    .split(/\s*[|·—–]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  while (
    parts.length > 1 &&
    parts[parts.length - 1]!.toUpperCase() === brand.toUpperCase()
  ) {
    parts.pop();
  }

  const core = parts.join(" | ");
  if (!core || core.toUpperCase() === brand.toUpperCase()) return brand;

  const words = core.split(/\s+/);
  const lastWord = words[words.length - 1];
  if (lastWord?.toUpperCase() === brand.toUpperCase()) return core;

  return `${core} | ${brand}`;
}

export function documentTitleHasDuplicateBrand(
  title: string,
  brand = DEFAULT_BRAND,
): boolean {
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const duplicate = new RegExp(
    `${escaped}\\s*[|·—–]\\s*${escaped}`,
    "i",
  );
  return duplicate.test(title);
}
