export type AddToCartUiState = "idle" | "adding" | "added";

export function resolveAddToCartIntent(
  stock: number,
  cartState: AddToCartUiState,
): { add: boolean; animate: boolean } {
  if (stock < 1) return { add: false, animate: false };
  return { add: true, animate: cartState === "idle" };
}
