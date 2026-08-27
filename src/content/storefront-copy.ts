import type { Locale } from "@/config/site";

export type StorefrontFaqItem = {
  id: string;
  question: string;
  answer: string;
};

type AboutPillar = { n: string; title: string; body: string };

type PageCopy = {
  homeTitle: string;
  homeDescription: string;
  shopTitle: string;
  shopDescription: string;
  shopLead: string;
  collectionsTitle: string;
  collectionsDescription: string;
  collectionsEyebrow: string;
  collectionsH1: string;
  collectionsLead: string;
  collectionEyebrow: string;
  collectionLimitedEyebrow: string;
  collectionPieces: (count: number) => string;
  aboutTitle: string;
  aboutDescription: string;
  aboutEyebrow: string;
  aboutH1: string;
  aboutLead: string;
  aboutPillars: AboutPillar[];
  aboutShop: string;
  aboutContact: string;
  faqTitle: string;
  faqDescription: string;
  faqEyebrow: string;
  faqH1: string;
  faqShop: string;
  faqContact: string;
  faqItems: StorefrontFaqItem[];
  contactTitle: string;
  contactDescription: string;
  contactEyebrow: string;
  contactH1: string;
  contactLead: string;
  contactFormTitle: string;
  contactName: string;
  contactEmail: string;
  contactSubject: string;
  contactMessage: string;
  contactSubmit: string;
  contactCity: string;
  marquee: string[];
  whyUs: { title: string; body: string }[];
  stats: { value: string; label: string }[];
  brandStoryCta: string;
  brandStoryAlt: string;
  scroll: string;
  watchAlt: (name: string) => string;
};

const copy: Record<Locale, PageCopy> = {
  fr: {
    homeTitle: "Montres de luxe au Maroc",
    homeDescription:
      "LORVEX est une maison marocaine de montres de prestige. Découvrez une sélection exclusive, authentifiée, proposée en dirham, avec conciergerie et livraison au Maroc.",
    shopTitle: "Boutique de montres de luxe",
    shopDescription:
      "Achetez des montres de prestige chez LORVEX au Maroc. Filtrez par maison, collection et disponibilité. Paiement à la livraison ou par carte, selon les options du paiement.",
    shopLead:
      "Une sélection de montres de prestige à acheter au Maroc, avec accompagnement de la conciergerie.",
    collectionsTitle: "Collections de montres",
    collectionsDescription:
      "Parcourez les collections LORVEX : univers distincts, pièces authentifiées, disponibles à l’achat au Maroc.",
    collectionsEyebrow: "Univers",
    collectionsH1: "Collections",
    collectionsLead:
      "Chaque collection rassemble des pièces autour d’un caractère propre — pas un catalogue générique.",
    collectionEyebrow: "Collection LORVEX",
    collectionLimitedEyebrow: "Collection limitée",
    collectionPieces: (count) =>
      count === 1 ? "1 montre" : `${count} montres`,
    aboutTitle: "La maison LORVEX",
    aboutDescription:
      "LORVEX sélectionne des montres de prestige pour le Maroc : curation, authenticité et conciergerie, sans vitrine inventée.",
    aboutEyebrow: "La maison",
    aboutH1: "Le temps, choisi avec exigence.",
    aboutLead:
      "LORVEX est une maison d’horlogerie en ligne, au Maroc. Nous proposons une sélection de montres de prestige, un service de conciergerie, et un achat en dirham — sans prétendre à un réseau de boutiques que nous n’avons pas déclaré ici.",
    aboutPillars: [
      {
        n: "01",
        title: "Authenticité",
        body: "Chaque montre proposée est authentifiée avant mise en ligne et livrée avec la documentation applicable à la pièce.",
      },
      {
        n: "02",
        title: "Curation",
        body: "Nous choisissons les références pour leur caractère, leur présence et leur place dans une collection personnelle — pas pour remplir un catalogue.",
      },
      {
        n: "03",
        title: "Conciergerie",
        body: "De la première question jusqu’après la livraison, l’équipe reste joignable par e-mail, téléphone ou WhatsApp selon les coordonnées affichées.",
      },
    ],
    aboutShop: "Voir la boutique",
    aboutContact: "Contacter la conciergerie",
    faqTitle: "Questions fréquentes",
    faqDescription:
      "Authenticité, livraison au Maroc, paiement à la livraison ou par carte, retours et contact LORVEX — réponses alignées sur le fonctionnement réel de la boutique.",
    faqEyebrow: "Service client",
    faqH1: "Questions fréquentes",
    faqShop: "Aller à la boutique",
    faqContact: "Écrire à la conciergerie",
    faqItems: [
      {
        id: "authenticity",
        question: "Les montres LORVEX sont-elles authentiques ?",
        answer:
          "Oui. Chaque pièce est authentifiée avant d’être proposée, puis expédiée avec la documentation et la garantie applicables à cette référence.",
      },
      {
        id: "delivery",
        question: "Livrez-vous au Maroc ?",
        answer:
          "Oui. La livraison est proposée au Maroc. Les modes disponibles — y compris, lorsqu’ils sont activés, l’express ou une remise à Casablanca — s’affichent au paiement avec leurs délais.",
      },
      {
        id: "payment",
        question: "Quels moyens de paiement acceptez-vous ?",
        answer:
          "Le paiement à la livraison (COD) et le paiement par carte sont proposés au paiement, selon l’interface de commande.",
      },
      {
        id: "returns",
        question: "Puis-je retourner une montre ?",
        answer:
          "Contactez la conciergerie rapidement après réception. Tout retour est examiné selon l’état de la pièce, les scellés, les documents et les conditions générales.",
      },
      {
        id: "contact",
        question: "Comment joindre LORVEX ?",
        answer:
          "Utilisez la page Contact, l’e-mail et le téléphone affichés, ou WhatsApp lorsque le numéro est publié sur le site.",
      },
    ],
    contactTitle: "Contacter la conciergerie",
    contactDescription:
      "Écrivez à LORVEX pour une référence, une commande ou un conseil. Casablanca, Maroc — e-mail et téléphone affichés sur la page.",
    contactEyebrow: "Conciergerie",
    contactH1: "Comment pouvons-nous vous aider ?",
    contactLead:
      "Pour une référence précise ou un premier achat, l’équipe répond avec discrétion. Les coordonnées ci-dessous sont celles publiées pour la maison.",
    contactFormTitle: "Envoyer un message",
    contactName: "Nom",
    contactEmail: "E-mail",
    contactSubject: "Sujet",
    contactMessage: "Message",
    contactSubmit: "Envoyer",
    contactCity: "Casablanca, Maroc",
    marquee: [
      "Maison LORVEX",
      "Maroc",
      "Montres de prestige",
      "Conciergerie",
      "Dirham marocain",
    ],
    whyUs: [
      {
        title: "Authenticité",
        body: "Chaque pièce est authentifiée par nos équipes avant d’être proposée.",
      },
      {
        title: "Conciergerie",
        body: "Un accompagnement privé, de la sélection jusqu’à la livraison.",
      },
      {
        title: "Livraison au Maroc",
        body: "Expédition assurée selon les modes proposés au paiement, partout où le service est ouvert.",
      },
      {
        title: "Achat en MAD",
        body: "Les prix de la boutique sont exprimés en dirham marocain, la devise par défaut de LORVEX.",
      },
    ],
    stats: [
      { value: "Maroc", label: "Le marché que nous servons" },
      { value: "MAD", label: "Devise d’affichage" },
      { value: "COD", label: "Paiement à la livraison" },
      { value: "Maison", label: "Conciergerie privée" },
    ],
    brandStoryCta: "Découvrir la maison",
    brandStoryAlt: "Atelier LORVEX — horlogerie et savoir-faire",
    scroll: "Défiler",
    watchAlt: (name) => `Montre ${name}`,
  },
  en: {
    homeTitle: "Luxury watches in Morocco",
    homeDescription:
      "LORVEX is a Moroccan house for prestige watches. Shop an exclusive, authenticated selection priced in dirham, with concierge support and delivery in Morocco.",
    shopTitle: "Luxury watch boutique",
    shopDescription:
      "Buy prestige watches from LORVEX in Morocco. Filter by house, collection and availability. Cash on delivery or card, as offered at checkout.",
    shopLead:
      "A considered selection of prestige watches to buy in Morocco, with concierge support.",
    collectionsTitle: "Watch collections",
    collectionsDescription:
      "Browse LORVEX collections: distinct worlds, authenticated pieces, available to purchase in Morocco.",
    collectionsEyebrow: "Worlds",
    collectionsH1: "Collections",
    collectionsLead:
      "Each collection groups pieces around a character of its own — not a generic catalogue.",
    collectionEyebrow: "LORVEX collection",
    collectionLimitedEyebrow: "Limited collection",
    collectionPieces: (count) =>
      count === 1 ? "1 watch" : `${count} watches`,
    aboutTitle: "The LORVEX house",
    aboutDescription:
      "LORVEX curates prestige watches for Morocco: authentication, concierge service, and an online maison — without claiming a store network we have not published.",
    aboutEyebrow: "The house",
    aboutH1: "Time, chosen with purpose.",
    aboutLead:
      "LORVEX is an online watch house serving Morocco. We offer a prestige selection, concierge support, and checkout in Moroccan dirham.",
    aboutPillars: [
      {
        n: "01",
        title: "Authenticity",
        body: "Every watch we offer is authenticated before it is listed and shipped with the documentation that belongs to that piece.",
      },
      {
        n: "02",
        title: "Curation",
        body: "We select references for design, presence and a lasting place in a personal collection — not to pad a catalogue.",
      },
      {
        n: "03",
        title: "Concierge",
        body: "From the first question through after delivery, the team is reachable via the email, phone or WhatsApp published on the site.",
      },
    ],
    aboutShop: "Browse the shop",
    aboutContact: "Contact the concierge",
    faqTitle: "Frequently asked questions",
    faqDescription:
      "Authenticity, delivery in Morocco, cash on delivery or card, returns, and how to reach LORVEX — answers that match how the shop actually works.",
    faqEyebrow: "Client services",
    faqH1: "Frequently asked questions",
    faqShop: "Go to the shop",
    faqContact: "Write to the concierge",
    faqItems: [
      {
        id: "authenticity",
        question: "Are LORVEX watches authentic?",
        answer:
          "Yes. Each piece is authenticated before it is offered, then shipped with the documentation and warranty that apply to that reference.",
      },
      {
        id: "delivery",
        question: "Do you deliver in Morocco?",
        answer:
          "Yes. Delivery is offered in Morocco. Available methods — including, when enabled, express or Casablanca handover — appear at checkout with their timings.",
      },
      {
        id: "payment",
        question: "Which payment methods are available?",
        answer:
          "Cash on delivery (COD) and card payment are offered at checkout, according to the order interface.",
      },
      {
        id: "returns",
        question: "Can I return a watch?",
        answer:
          "Contact the concierge promptly after delivery. Returns are assessed against condition, seals, documents and the terms that apply to your order.",
      },
      {
        id: "contact",
        question: "How do I reach LORVEX?",
        answer:
          "Use the Contact page, the published email and phone number, or WhatsApp when a number is shown on the site.",
      },
    ],
    contactTitle: "Contact the concierge",
    contactDescription:
      "Write to LORVEX about a reference, an order or advice. Casablanca, Morocco — email and phone as published on this page.",
    contactEyebrow: "Concierge",
    contactH1: "How may we assist?",
    contactLead:
      "Whether you are looking for a specific reference or guidance on a first exceptional watch, the team replies with discretion. Details below are those published for the house.",
    contactFormTitle: "Send an enquiry",
    contactName: "Name",
    contactEmail: "Email",
    contactSubject: "Subject",
    contactMessage: "Message",
    contactSubmit: "Send",
    contactCity: "Casablanca, Morocco",
    marquee: [
      "Maison LORVEX",
      "Morocco",
      "Prestige watches",
      "Concierge",
      "Moroccan dirham",
    ],
    whyUs: [
      {
        title: "Authenticity",
        body: "Every piece is authenticated by our team before it is offered.",
      },
      {
        title: "Concierge",
        body: "Private guidance from selection through delivery.",
      },
      {
        title: "Delivery in Morocco",
        body: "Insured shipping according to the methods shown at checkout.",
      },
      {
        title: "Priced in MAD",
        body: "Storefront prices are shown in Moroccan dirham, LORVEX’s default currency.",
      },
    ],
    stats: [
      { value: "Morocco", label: "The market we serve" },
      { value: "MAD", label: "Display currency" },
      { value: "COD", label: "Cash on delivery" },
      { value: "House", label: "Private concierge" },
    ],
    brandStoryCta: "Discover the house",
    brandStoryAlt: "LORVEX atelier — watchmaking and craft",
    scroll: "Scroll",
    watchAlt: (name) => `${name} watch`,
  },
  ar: {
    homeTitle: "ساعات فاخرة في المغرب",
    homeDescription:
      "لورفكس دار مغربية للساعات الراقية. تشكيلة حصرية موثّقة، بأسعار بالدرهم، مع خدمة كونسيرج وتوصيل داخل المغرب.",
    shopTitle: "متجر الساعات الفاخرة",
    shopDescription:
      "اشترِ ساعات راقية من لورفكس في المغرب. صفِّ حسب الدار والمجموعة والتوفر. الدفع عند الاستلام أو بالبطاقة حسب خيارات الدفع.",
    shopLead:
      "تشكيلة مختارة من الساعات الراقية للشراء في المغرب، مع مرافقة الكونسيرج.",
    collectionsTitle: "مجموعات الساعات",
    collectionsDescription:
      "تصفح مجموعات لورفكس: عوالم متمايزة، قطع موثّقة، متاحة للشراء في المغرب.",
    collectionsEyebrow: "عوالم",
    collectionsH1: "المجموعات",
    collectionsLead:
      "كل مجموعة تجمع قطعاً حول طابع خاص — وليست كتالوجاً عاماً مكرراً.",
    collectionEyebrow: "مجموعة لورفكس",
    collectionLimitedEyebrow: "مجموعة محدودة",
    collectionPieces: (count) =>
      count === 1 ? "ساعة واحدة" : `${count} ساعات`,
    aboutTitle: "دار لورفكس",
    aboutDescription:
      "لورفكس تنتقي ساعات راقية للمغرب: توثيق، كونسيرج، ومتجر عبر الإنترنت — دون ادعاء شبكة متاجر غير معلنة هنا.",
    aboutEyebrow: "الدار",
    aboutH1: "الزمن، مختاراً بعناية.",
    aboutLead:
      "لورفكس دار ساعات عبر الإنترنت تخدم المغرب. نقدّم تشكيلة راقية، وخدمة كونسيرج، وطلباً بالدرهم المغربي.",
    aboutPillars: [
      {
        n: "01",
        title: "الأصالة",
        body: "كل ساعة نعرضها تُوثَّق قبل إدراجها وتُشحن مع الوثائق الخاصة بتلك القطعة.",
      },
      {
        n: "02",
        title: "الانتقاء",
        body: "نختار المراجع لطابعها وحضورها ومكانها في مجموعة شخصية — لا لملء كتالوج.",
      },
      {
        n: "03",
        title: "الكونسيرج",
        body: "من أول سؤال إلى ما بعد التسليم، يمكن التواصل عبر البريد أو الهاتف أو واتساب كما هو منشور في الموقع.",
      },
    ],
    aboutShop: "تصفح المتجر",
    aboutContact: "تواصل مع الكونسيرج",
    faqTitle: "الأسئلة المتكررة",
    faqDescription:
      "الأصالة، التوصيل في المغرب، الدفع عند الاستلام أو بالبطاقة، الإرجاع، وكيفية التواصل مع لورفكس — إجابات تطابق عمل المتجر فعلياً.",
    faqEyebrow: "خدمة العملاء",
    faqH1: "الأسئلة المتكررة",
    faqShop: "إلى المتجر",
    faqContact: "اكتب إلى الكونسيرج",
    faqItems: [
      {
        id: "authenticity",
        question: "هل ساعات لورفكس أصلية؟",
        answer:
          "نعم. تُوثَّق كل قطعة قبل عرضها، ثم تُشحن مع الوثائق والضمان المنطبقين على ذلك المرجع.",
      },
      {
        id: "delivery",
        question: "هل توصّلون داخل المغرب؟",
        answer:
          "نعم. يتوفر التوصيل في المغرب. تظهر طرق الشحن المتاحة — بما فيها، عند تفعيلها، السريع أو التسليم في الدار البيضاء — عند الدفع مع المدد.",
      },
      {
        id: "payment",
        question: "ما وسائل الدفع المتاحة؟",
        answer:
          "يتوفر الدفع عند الاستلام (COD) والدفع بالبطاقة عند إتمام الطلب، بحسب واجهة الطلب.",
      },
      {
        id: "returns",
        question: "هل يمكن إرجاع ساعة؟",
        answer:
          "تواصل مع الكونسيرج بعد الاستلام مباشرة. يُقيَّم أي إرجاع وفق حالة القطعة والأختام والوثائق والشروط المنطبقة على طلبك.",
      },
      {
        id: "contact",
        question: "كيف أتواصل مع لورفكس؟",
        answer:
          "استخدم صفحة الاتصال، والبريد والهاتف المنشورين، أو واتساب عندما يظهر رقم على الموقع.",
      },
    ],
    contactTitle: "تواصل مع الكونسيرج",
    contactDescription:
      "اكتب إلى لورفكس بخصوص مرجع أو طلب أو استشارة. الدار البيضاء، المغرب — البريد والهاتف كما هما منشوران في هذه الصفحة.",
    contactEyebrow: "الكونسيرج",
    contactH1: "كيف يمكننا مساعدتك؟",
    contactLead:
      "سواء كنت تبحث عن مرجع محدد أو توجيهاً لأول ساعة استثنائية، يردّ الفريق بتحفظ. البيانات أدناه هي المنشورة للدار.",
    contactFormTitle: "أرسل استفساراً",
    contactName: "الاسم",
    contactEmail: "البريد الإلكتروني",
    contactSubject: "الموضوع",
    contactMessage: "الرسالة",
    contactSubmit: "إرسال",
    contactCity: "الدار البيضاء، المغرب",
    marquee: [
      "دار لورفكس",
      "المغرب",
      "ساعات راقية",
      "كونسيرج",
      "الدرهم المغربي",
    ],
    whyUs: [
      {
        title: "الأصالة",
        body: "تُوثَّق كل قطعة من فريقنا قبل عرضها.",
      },
      {
        title: "الكونسيرج",
        body: "مرافقة خاصة من الاختيار حتى التسليم.",
      },
      {
        title: "التوصيل في المغرب",
        body: "شحن مؤمَّن وفق الطرق المعروضة عند الدفع.",
      },
      {
        title: "الأسعار بالدرهم",
        body: "تُعرض أسعار المتجر بالدرهم المغربي، العملة الافتراضية للورفكس.",
      },
    ],
    stats: [
      { value: "المغرب", label: "السوق الذي نخدمه" },
      { value: "MAD", label: "عملة العرض" },
      { value: "COD", label: "الدفع عند الاستلام" },
      { value: "الدار", label: "كونسيرج خاص" },
    ],
    brandStoryCta: "اكتشف الدار",
    brandStoryAlt: "محترف لورفكس — صناعة الساعات والحرفية",
    scroll: "مرّر",
    watchAlt: (name) => `ساعة ${name}`,
  },
};

export function storefrontCopy(locale: Locale): PageCopy {
  return copy[locale];
}

export function getStorefrontFaq(locale: Locale): StorefrontFaqItem[] {
  return copy[locale].faqItems;
}

export function looksLikeArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}
