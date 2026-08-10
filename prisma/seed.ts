import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const watchImages = [
  "/images/lorvex/watch-01.jpg",
  "/images/lorvex/watch-02.jpg",
  "/images/lorvex/watch-03.jpg",
  "/images/lorvex/watch-04.jpg",
  "/images/lorvex/watch-05.jpg",
  "/images/lorvex/watch-06.jpg",
  "/images/lorvex/watch-07.jpg",
  "/images/lorvex/watch-08.jpg",
];

const collectionCovers = [
  "/images/lorvex/collection-heritage.jpg",
  "/images/lorvex/collection-sport.jpg",
  "/images/lorvex/collection-haute.jpg",
  "/images/lorvex/collection-limited.jpg",
];

async function main() {
  console.log("Seeding LORVEX…");

  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.compareItem.deleteMany();
  await prisma.recentlyViewed.deleteMany();
  await prisma.productAnswer.deleteMany();
  await prisma.productQuestion.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productRelation.deleteMany();
  await prisma.productTag.deleteMany();
  await prisma.productSpecification.deleteMany();
  await prisma.productMedia.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.giftCard.deleteMany();
  await prisma.shippingMethod.deleteMany();
  await prisma.currency.deleteMany();
  await prisma.taxRate.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.faqItem.deleteMany();
  await prisma.homepageSection.deleteMany();
  await prisma.announcementBar.deleteMany();
  await prisma.footerLink.deleteMany();
  await prisma.footerColumn.deleteMany();
  await prisma.navigationItem.deleteMany();
  await prisma.navigationMenu.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.siteSettings.deleteMany();
  await prisma.address.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hash("LorvexAdmin2026!", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@lorvex.ma",
      passwordHash,
      name: "LORVEX Admin",
      firstName: "Maison",
      lastName: "LORVEX",
      role: "SUPER_ADMIN",
      locale: "fr",
      currency: "MAD",
    },
  });
  console.log(`Admin id: ${admin.id}`);

  const customerHash = await hash("LorvexClient2026!", 12);
  const customer = await prisma.user.create({
    data: {
      email: "client@lorvex.ma",
      passwordHash: customerHash,
      name: "Amine Benali",
      firstName: "Amine",
      lastName: "Benali",
      phone: "+212661000000",
      role: "CUSTOMER",
      locale: "fr",
      currency: "MAD",
    },
  });

  await prisma.siteSettings.create({
    data: {
      id: "default",
      siteName: "LORVEX",
      tagline: "L'horlogerie de luxe au Maroc",
      supportEmail: "concierge@lorvex.ma",
      supportPhone: "+212 5 22 00 00 00",
      whatsappNumber: "212600000000",
      socialInstagram: "https://instagram.com/lorvex",
      socialFacebook: "https://facebook.com/lorvex",
      socialTikTok: "https://tiktok.com/@lorvex",
      defaultLocale: "fr",
      defaultCurrency: "MAD",
      enableGuestCheckout: true,
      theme: {
        accent: "#b89b6a",
        background: "#f7f5f1",
      },
    },
  });

  await prisma.announcementBar.create({
    data: {
      message: "Livraison assurée partout au Maroc · Conciergerie privée sur rendez-vous",
      isActive: true,
    },
  });

  await prisma.currency.createMany({
    data: [
      { code: "MAD", name: "Dirham marocain", symbol: "DH", rateToMad: 1, isDefault: true },
      { code: "EUR", name: "Euro", symbol: "€", rateToMad: 10.8 },
      { code: "USD", name: "US Dollar", symbol: "$", rateToMad: 9.9 },
    ],
  });

  await prisma.taxRate.create({
    data: { name: "TVA Maroc", country: "MA", rate: 0.2, isActive: true },
  });

  const shipping = await Promise.all([
    prisma.shippingMethod.create({
      data: {
        name: "Livraison Standard",
        code: "STD",
        description: "3–5 jours ouvrés",
        price: 79,
        estimatedDays: 5,
        sortOrder: 1,
      },
    }),
    prisma.shippingMethod.create({
      data: {
        name: "Livraison Express",
        code: "EXP",
        description: "24–48h Casablanca / Rabat",
        price: 149,
        estimatedDays: 2,
        sortOrder: 2,
      },
    }),
    prisma.shippingMethod.create({
      data: {
        name: "Remise en main propre",
        code: "PICKUP",
        description: "Boutique Casablanca",
        price: 0,
        estimatedDays: 1,
        sortOrder: 3,
      },
    }),
  ]);

  await prisma.coupon.createMany({
    data: [
      {
        code: "LORVEX10",
        description: "10% de bienvenue",
        type: "PERCENTAGE",
        value: 10,
        minOrderAmount: 5000,
        usageLimit: 1000,
        isActive: true,
      },
      {
        code: "VIP500",
        description: "500 MAD offerts",
        type: "FIXED",
        value: 500,
        minOrderAmount: 15000,
        usageLimit: 200,
        isActive: true,
      },
    ],
  });

  const brands = await Promise.all(
    [
      { name: "Atelier Noir", slug: "atelier-noir", country: "Suisse", sortOrder: 1 },
      { name: "Maison Atlas", slug: "maison-atlas", country: "Maroc", sortOrder: 2 },
      { name: "Horizon Genève", slug: "horizon-geneve", country: "Suisse", sortOrder: 3 },
      { name: "Vérité", slug: "verite", country: "France", sortOrder: 4 },
    ].map((b) =>
      prisma.brand.create({
        data: {
          ...b,
          isFeatured: true,
          description: `${b.name} — sélection LORVEX.`,
          logoUrl: watchImages[0],
          coverUrl: watchImages[1],
        },
      }),
    ),
  );

  const collections = await Promise.all(
    [
      {
        name: "Heritage",
        slug: "heritage",
        description: "Élégance classique, cadrans intemporels.",
        coverUrl: collectionCovers[0],
      },
      {
        name: "Sport Élégance",
        slug: "sport-elegance",
        description: "Performance raffinée pour le quotidien.",
        coverUrl: collectionCovers[1],
      },
      {
        name: "Haute Complication",
        slug: "haute-complication",
        description: "Pièces d'exception et savoir-faire rare.",
        coverUrl: collectionCovers[2],
        isLimited: true,
      },
    ].map((c, i) =>
      prisma.collection.create({
        data: { ...c, isFeatured: true, sortOrder: i + 1 },
      }),
    ),
  );

  const category = await prisma.category.create({
    data: {
      name: "Montres",
      slug: "montres",
      description: "Toutes les montres LORVEX",
    },
  });

  const tags = await Promise.all(
    ["luxe", "automatique", "or", "acier", "édition-limitée"].map((name) =>
      prisma.tag.create({
        data: { name, slug: name },
      }),
    ),
  );

  const catalog = [
    {
      name: "Noir Imperial 40",
      slug: "noir-imperial-40",
      sku: "LX-ANI-001",
      brand: brands[0],
      collection: collections[0],
      price: 48500,
      compare: 52000,
      movement: "AUTOMATIC" as const,
      gender: "MEN" as const,
      featured: true,
      best: true,
      image: watchImages[0],
    },
    {
      name: "Atlas Dawn 36",
      slug: "atlas-dawn-36",
      sku: "LX-MAT-002",
      brand: brands[1],
      collection: collections[0],
      price: 28900,
      movement: "AUTOMATIC" as const,
      gender: "WOMEN" as const,
      featured: true,
      arrival: true,
      image: watchImages[1],
    },
    {
      name: "Horizon Diver 42",
      slug: "horizon-diver-42",
      sku: "LX-HOR-003",
      brand: brands[2],
      collection: collections[1],
      price: 36750,
      movement: "AUTOMATIC" as const,
      gender: "UNISEX" as const,
      best: true,
      image: watchImages[2],
    },
    {
      name: "Vérité Chrono",
      slug: "verite-chrono",
      sku: "LX-VER-004",
      brand: brands[3],
      collection: collections[1],
      price: 41200,
      movement: "AUTOMATIC" as const,
      gender: "MEN" as const,
      arrival: true,
      featured: true,
      image: watchImages[3],
    },
    {
      name: "Imperial Moonphase",
      slug: "imperial-moonphase",
      sku: "LX-ANI-005",
      brand: brands[0],
      collection: collections[2],
      price: 128000,
      movement: "MANUAL" as const,
      gender: "UNISEX" as const,
      limited: true,
      featured: true,
      image: watchImages[4],
    },
    {
      name: "Atlas Sahara GMT",
      slug: "atlas-sahara-gmt",
      sku: "LX-MAT-006",
      brand: brands[1],
      collection: collections[1],
      price: 33900,
      movement: "AUTOMATIC" as const,
      gender: "MEN" as const,
      arrival: true,
      image: watchImages[5],
    },
    {
      name: "Horizon Lady Pearl",
      slug: "horizon-lady-pearl",
      sku: "LX-HOR-007",
      brand: brands[2],
      collection: collections[0],
      price: 27400,
      movement: "QUARTZ" as const,
      gender: "WOMEN" as const,
      best: true,
      image: watchImages[6],
    },
    {
      name: "Vérité Skeleton LE",
      slug: "verite-skeleton-le",
      sku: "LX-VER-008",
      brand: brands[3],
      collection: collections[2],
      price: 96500,
      movement: "MANUAL" as const,
      gender: "UNISEX" as const,
      limited: true,
      featured: true,
      image: watchImages[7],
    },
  ];

  const products = [];
  for (const [index, item] of catalog.entries()) {
    const product = await prisma.product.create({
      data: {
        name: item.name,
        slug: item.slug,
        sku: item.sku,
        barcode: `6100000${1000 + index}`,
        shortDescription: `${item.name} — pièce sélectionnée par la maison LORVEX.`,
        description: `${item.name} incarne l'exigence LORVEX : finitions d'exception, mouvement certifié, et présence discrète. Chaque exemplaire est authentifié, photographié en ultra haute définition et expédié sous écrin muséal depuis Casablanca.`,
        brandId: item.brand.id,
        collectionId: item.collection.id,
        categoryId: category.id,
        gender: item.gender,
        movement: item.movement,
        status: "ACTIVE",
        basePrice: item.price,
        compareAtPrice: item.compare ?? null,
        currency: "MAD",
        isFeatured: Boolean(item.featured),
        isNewArrival: Boolean(item.arrival),
        isBestSeller: Boolean(item.best),
        isLimitedEdition: Boolean(item.limited),
        warrantyMonths: 36,
        metaTitle: `${item.name} | LORVEX`,
        metaDescription: `Achetez ${item.name} chez LORVEX, maison d'horlogerie de luxe au Maroc.`,
        publishedAt: new Date(),
        media: {
          create: [
            {
              type: "IMAGE",
              url: item.image,
              alt: item.name,
              isPrimary: true,
              sortOrder: 0,
            },
            {
              type: "IMAGE",
              url: watchImages[(index + 1) % watchImages.length],
              alt: `${item.name} détail`,
              sortOrder: 1,
            },
            {
              type: "IMAGE",
              url: watchImages[(index + 3) % watchImages.length],
              alt: `${item.name} profil`,
              sortOrder: 2,
            },
            {
              type: "IMAGE",
              url: watchImages[(index + 5) % watchImages.length],
              alt: `${item.name} bracelet`,
              sortOrder: 3,
            },
            ...Array.from({ length: 8 }, (_, frame) => ({
              type: "SPIN_360" as const,
              url: watchImages[(index + frame) % watchImages.length],
              alt: `${item.name} 360 — ${frame * 45}°`,
              sortOrder: 10 + frame,
            })),
            ...(item.featured
              ? [
                  {
                    type: "VIDEO" as const,
                    url: "https://res.cloudinary.com/demo/video/upload/q_auto/f_mp4/sea_turtle.mp4",
                    alt: `${item.name} vidéo`,
                    sortOrder: 30,
                  },
                ]
              : []),
          ],
        },
        variants: {
          create: [
            {
              sku: `${item.sku}-BLK`,
              name: "Cadran noir · Bracelet acier",
              color: "Noir",
              dialColor: "Noir",
              strapMaterial: "Acier",
              caseMaterial: "Acier 316L",
              caseSizeMm: item.name.includes("36") ? 36 : item.name.includes("42") ? 42 : 40,
              waterResistanceM: item.collection.slug === "sport-elegance" ? 200 : 50,
              price: item.price,
              stock: 8,
              isDefault: true,
              imageUrl: item.image,
              sortOrder: 0,
            },
            {
              sku: `${item.sku}-BRN`,
              name: "Cadran champagne · Bracelet cuir",
              color: "Champagne",
              dialColor: "Champagne",
              strapMaterial: "Cuir",
              caseMaterial: "Acier 316L",
              caseSizeMm: item.name.includes("36") ? 36 : 40,
              waterResistanceM: 50,
              price: item.price + 1200,
              stock: 5,
              imageUrl: watchImages[(index + 2) % watchImages.length],
              sortOrder: 1,
            },
          ],
        },
        specifications: {
          create: [
            { group: "Movement", label: "Calibre", value: item.movement, sortOrder: 1 },
            { group: "Movement", label: "Réserve de marche", value: "42 heures", sortOrder: 2 },
            { group: "Case", label: "Matière", value: "Acier 316L", sortOrder: 1 },
            { group: "Case", label: "Épaisseur", value: "11.2 mm", sortOrder: 2 },
            { group: "Glass", label: "Verre", value: "Saphir anti-reflet", sortOrder: 1 },
            { group: "Water", label: "Étanchéité", value: "50 m", sortOrder: 1 },
            { group: "Warranty", label: "Garantie", value: "36 mois LORVEX", sortOrder: 1 },
          ],
        },
        tags: {
          create: [
            { tagId: tags[0].id },
            { tagId: item.limited ? tags[4].id : tags[1].id },
          ],
        },
      },
      include: { variants: true },
    });
    products.push(product);
  }

  for (let i = 0; i < products.length; i++) {
    const related = products[(i + 1) % products.length];
    await prisma.productRelation.create({
      data: {
        productId: products[i].id,
        relatedId: related.id,
        type: "RELATED",
        sortOrder: 1,
      },
    });
    await prisma.productRelation.create({
      data: {
        productId: products[i].id,
        relatedId: products[(i + 2) % products.length].id,
        type: "FREQUENTLY_BOUGHT",
        sortOrder: 2,
      },
    });
  }

  const reviewerHash = await hash("LorvexReviewer2026!", 12);
  const reviewers = await Promise.all(
    [
      { email: "sara.reviewer@lorvex.ma", name: "Sara El Fassi", firstName: "Sara", lastName: "El Fassi" },
      { email: "youssef.reviewer@lorvex.ma", name: "Youssef Amrani", firstName: "Youssef", lastName: "Amrani" },
      { email: "lina.reviewer@lorvex.ma", name: "Lina Berrada", firstName: "Lina", lastName: "Berrada" },
    ].map((r) =>
      prisma.user.create({
        data: {
          ...r,
          passwordHash: reviewerHash,
          role: "CUSTOMER",
          locale: "fr",
          currency: "MAD",
        },
      }),
    ),
  );

  await prisma.review.createMany({
    data: [
      {
        productId: products[0].id,
        userId: customer.id,
        rating: 5,
        title: "Une présence rare",
        body: "Service impeccable, écrin magnifique, et la montre dépasse les photos. LORVEX a redéfini mon standard.",
        images: [watchImages[0], watchImages[2]],
        isVerified: true,
        isApproved: true,
      },
      {
        productId: products[0].id,
        userId: reviewers[0].id,
        rating: 5,
        title: "Digne des grandes maisons",
        body: "Le cadran est encore plus profond en vrai. Livraison soignée à Casablanca en 48h, avec certificat.",
        images: [watchImages[4]],
        isVerified: true,
        isApproved: true,
      },
      {
        productId: products[0].id,
        userId: reviewers[1].id,
        rating: 4,
        title: "Très belle pièce",
        body: "Finitions excellentes et bracelet confortable. J'aurais aimé une option de gravure, d'où la quatrième étoile.",
        isVerified: true,
        isApproved: true,
      },
      {
        productId: products[0].id,
        userId: reviewers[2].id,
        rating: 5,
        title: "Coup de cœur",
        body: "Achat pour un anniversaire : l'écrin et la présentation ont fait autant d'effet que la montre elle-même.",
        images: [watchImages[6]],
        isVerified: false,
        isApproved: true,
      },
      {
        productId: products[2].id,
        userId: reviewers[0].id,
        rating: 5,
        title: "Parfaite au quotidien",
        body: "Étanchéité réelle, lisibilité parfaite. La lunette est d'une précision remarquable.",
        isVerified: true,
        isApproved: true,
      },
    ],
  });

  const question = await prisma.productQuestion.create({
    data: {
      productId: products[0].id,
      userId: customer.id,
      question: "Le bracelet peut-il être ajusté en boutique avant livraison ?",
      isApproved: true,
    },
  });
  await prisma.productAnswer.create({
    data: {
      questionId: question.id,
      userId: admin.id,
      answer:
        "Oui. Indiquez votre tour de poignet en note de commande et nos horlogers ajustent le bracelet avant expédition, sans frais.",
      isOfficial: true,
    },
  });

  const question2 = await prisma.productQuestion.create({
    data: {
      productId: products[0].id,
      userId: reviewers[1].id,
      question: "La garantie couvre-t-elle l'entretien du mouvement ?",
      isApproved: true,
    },
  });
  await prisma.productAnswer.create({
    data: {
      questionId: question2.id,
      userId: admin.id,
      answer:
        "La garantie LORVEX de 36 mois couvre le mouvement et l'étanchéité. Une première révision est offerte la deuxième année.",
      isOfficial: true,
    },
  });

  const shippingAddress = await prisma.address.create({
    data: {
      userId: customer.id,
      firstName: "Amine",
      lastName: "Benali",
      phone: "+212661000000",
      line1: "12 Boulevard d'Anfa",
      city: "Casablanca",
      country: "MA",
      isDefault: true,
    },
  });

  const orderVariant = products[0].variants[0];
  await prisma.order.create({
    data: {
      number: "LX-2026-000001",
      userId: customer.id,
      email: customer.email,
      phone: customer.phone,
      status: "DELIVERED",
      paymentStatus: "PAID",
      paymentMethod: "COD",
      currency: "MAD",
      subtotal: orderVariant.price ?? products[0].basePrice,
      shippingTotal: 0,
      grandTotal: orderVariant.price ?? products[0].basePrice,
      shippingMethodId: shipping[1].id,
      shippingAddressId: shippingAddress.id,
      paidAt: new Date(),
      deliveredAt: new Date(),
      items: {
        create: [
          {
            productId: products[0].id,
            variantId: orderVariant.id,
            name: products[0].name,
            sku: orderVariant.sku,
            imageUrl: orderVariant.imageUrl,
            unitPrice: orderVariant.price ?? products[0].basePrice,
            quantity: 1,
            totalPrice: orderVariant.price ?? products[0].basePrice,
          },
        ],
      },
    },
  });

  await prisma.testimonial.createMany({
    data: [
      {
        name: "Sara El Fassi",
        role: "Collectionneuse",
        city: "Casablanca",
        rating: 5,
        body: "Une expérience digne d'une maison internationale, avec la chaleur marocaine.",
        sortOrder: 1,
      },
      {
        name: "Youssef Amrani",
        role: "Entrepreneur",
        city: "Rabat",
        rating: 5,
        body: "Conseils précis, authenticité garantie, livraison impeccable.",
        sortOrder: 2,
      },
      {
        name: "Lina Berrada",
        role: "Architecte",
        city: "Marrakech",
        rating: 5,
        body: "Le site est aussi beau que les pièces. Rare de trouver cela au Maroc.",
        sortOrder: 3,
      },
    ],
  });

  await prisma.faqItem.createMany({
    data: [
      {
        question: "Les montres sont-elles authentiques ?",
        answer:
          "Oui. Chaque pièce est authentifiée par nos experts avant mise en ligne et livrée avec documentation LORVEX.",
        category: "Authenticité",
        sortOrder: 1,
      },
      {
        question: "Livrez-vous dans tout le Maroc ?",
        answer:
          "Oui, avec options standard, express et remise en boutique à Casablanca.",
        category: "Livraison",
        sortOrder: 2,
      },
      {
        question: "Puis-je payer à la livraison ?",
        answer: "Oui, le paiement à la livraison (COD) est disponible sur la plupart des commandes.",
        category: "Paiement",
        sortOrder: 3,
      },
    ],
  });

  await prisma.homepageSection.createMany({
    data: [
      {
        key: "hero",
        type: "hero",
        title: "Hero",
        sortOrder: 1,
        content: {
          title: "Le temps, élevé au rang d'art.",
          subtitle:
            "Une sélection exclusive de montres de prestige, authentifiées et livrées avec le soin d'une maison.",
          imageUrl: "/images/lorvex/hero.jpg",
        },
      },
      {
        key: "stats",
        type: "stats",
        title: "Stats",
        sortOrder: 2,
        content: {
          items: [
            { value: "120+", label: "Références" },
            { value: "15", label: "Maisons" },
          ],
        },
      },
    ],
  });

  const headerMenu = await prisma.navigationMenu.create({
    data: { key: "header", label: "Header" },
  });

  await prisma.navigationItem.createMany({
    data: [
      { menuId: headerMenu.id, label: "Boutique", href: "/fr/shop", sortOrder: 1 },
      { menuId: headerMenu.id, label: "Collections", href: "/fr/collections", sortOrder: 2, isMega: true },
      { menuId: headerMenu.id, label: "La Maison", href: "/fr/about", sortOrder: 3 },
    ],
  });

  const footerCol = await prisma.footerColumn.create({
    data: { title: "Maison", sortOrder: 1 },
  });
  await prisma.footerLink.createMany({
    data: [
      { columnId: footerCol.id, label: "À propos", href: "/fr/about", sortOrder: 1 },
      { columnId: footerCol.id, label: "Contact", href: "/fr/contact", sortOrder: 2 },
      { columnId: footerCol.id, label: "FAQ", href: "/fr/faq", sortOrder: 3 },
    ],
  });

  console.log("Seed complete.");
  console.log("Admin: admin@lorvex.ma / LorvexAdmin2026!");
  console.log("Client: client@lorvex.ma / LorvexClient2026!");
  console.log(`Shipping methods: ${shipping.map((s) => s.code).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
