import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dictionaries } from "@/i18n/dictionaries";
import { getAuthStrings } from "@/i18n/auth-strings";
import { resolveAddToCartIntent } from "@/lib/add-to-cart-intent";
import type { CartLine } from "@/stores/cart-store";

describe("checkout dictionary locales", () => {
  it("localizes checkout headings and empty state in FR, EN, and AR", () => {
    assert.equal(dictionaries.fr.checkout.title, "Paiement");
    assert.equal(dictionaries.fr.checkout.emptyCart, "Votre panier est vide");
    assert.equal(dictionaries.fr.checkout.cashOnDelivery, "Paiement à la livraison");
    assert.equal(dictionaries.fr.checkout.placeOrder, "Confirmer la commande");
    assert.equal(dictionaries.fr.checkout.email, "E-mail");

    assert.equal(dictionaries.en.checkout.title, "Checkout");
    assert.equal(dictionaries.en.checkout.emptyCart, "Your cart is empty");
    assert.equal(dictionaries.en.checkout.cashOnDelivery, "Cash on delivery");
    assert.equal(dictionaries.en.checkout.placeOrder, "Place order");

    assert.equal(dictionaries.ar.checkout.title, "إتمام الشراء");
    assert.equal(dictionaries.ar.checkout.emptyCart, "سلتك فارغة");
    assert.equal(dictionaries.ar.checkout.cashOnDelivery, "الدفع عند الاستلام");
    assert.equal(dictionaries.ar.checkout.placeOrder, "تأكيد الطلب");
  });
});

describe("auth sign-in shell strings", () => {
  it("localizes metadata title and page shell", () => {
    assert.equal(getAuthStrings("fr").signIn, "Connexion");
    assert.equal(getAuthStrings("fr").signInEyebrow, "Espace client privé");
    assert.equal(getAuthStrings("fr").signInWelcome, "Bienvenue chez LORVEX");

    assert.equal(getAuthStrings("en").signIn, "Sign in");
    assert.equal(getAuthStrings("en").signInEyebrow, "Private client area");
    assert.equal(getAuthStrings("en").signInWelcome, "Welcome to LORVEX");

    assert.equal(getAuthStrings("ar").signIn, "تسجيل الدخول");
    assert.equal(getAuthStrings("ar").signInEyebrow, "منطقة العميل الخاصة");
    assert.equal(getAuthStrings("ar").signInWelcome, "مرحباً بك في LORVEX");
  });
});

describe("rapid add-to-cart intent", () => {
  it("adds on idle and still adds during adding/added lockout", () => {
    assert.deepEqual(resolveAddToCartIntent(7, "idle"), { add: true, animate: true });
    assert.deepEqual(resolveAddToCartIntent(7, "adding"), { add: true, animate: false });
    assert.deepEqual(resolveAddToCartIntent(7, "added"), { add: true, animate: false });
  });

  it("rejects out-of-stock regardless of UI state", () => {
    assert.deepEqual(resolveAddToCartIntent(0, "idle"), { add: false, animate: false });
    assert.deepEqual(resolveAddToCartIntent(0, "added"), { add: false, animate: false });
  });

  it("merges the same variant and clamps to stock", () => {
    const item: Omit<CartLine, "quantity"> = {
      productId: "p1",
      variantId: "v1",
      slug: "noir-imperial-40",
      name: "Noir Imperial 40",
      variantName: "Steel",
      imageUrl: "/images/lorvex/watch-01.jpg",
      price: 48500,
      currency: "MAD",
      stock: 7,
    };

    let items: CartLine[] = [];
    const add = () => {
      const existing = items.find((line) => line.variantId === item.variantId);
      if (existing) {
        items = items.map((line) =>
          line.variantId === item.variantId
            ? { ...line, quantity: Math.min(line.stock, line.quantity + 1) }
            : line,
        );
      } else {
        items = [...items, { ...item, quantity: Math.min(item.stock, 1) }];
      }
    };

    add();
    add();
    add();
    assert.equal(items.length, 1);
    assert.equal(items[0]?.quantity, 3);

    for (let i = 0; i < 20; i++) add();
    assert.equal(items.length, 1);
    assert.equal(items[0]?.quantity, 7);
  });
});
