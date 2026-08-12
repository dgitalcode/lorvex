import type { Locale } from "@/config/site";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  slug: "privacy" | "terms";
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  updatedLabel: string;
  tocLabel: string;
  contactHeading: string;
  sections: LegalSection[];
};

type ContactBits = {
  siteName: string;
  supportEmail: string;
  supportPhone: string;
};

function privacyFr(c: ContactBits): LegalDocument {
  return {
    slug: "privacy",
    title: "Politique de confidentialité",
    description:
      "Comment LORVEX collecte, utilise et protège les informations liées à votre navigation, vos commandes et votre compte.",
    eyebrow: "Informations légales",
    intro:
      "Cette page décrit les pratiques techniques et opérationnelles de la plateforme e-commerce LORVEX concernant les données personnelles. Elle reflète les fonctionnalités actuellement déployées. Elle ne constitue pas un avis juridique et ne prétend pas à une certification réglementaire particulière.",
    updatedLabel: "Dernière mise à jour",
    tocLabel: "Sommaire",
    contactHeading: "Nous contacter",
    sections: [
      {
        id: "controller",
        title: "1. Qui traite vos données",
        paragraphs: [
          `${c.siteName} exploite une boutique en ligne de montres de prestige destinée principalement au Maroc. Pour toute question relative à vos données, contactez notre conciergerie à ${c.supportEmail} ou au ${c.supportPhone}.`,
          "Selon votre localisation et le droit applicable, des obligations supplémentaires peuvent s’appliquer. Cette page décrit ce que l’application fait techniquement aujourd’hui.",
        ],
      },
      {
        id: "data-collected",
        title: "2. Données collectées",
        paragraphs: [
          "Compte client : adresse e-mail, mot de passe hashé, nom, prénom, téléphone optionnel, langue et devise préférées, rôle et statut du compte.",
          "Commandes : e-mail, téléphone, adresses de livraison/facturation, articles, montants, méthode de paiement sélectionnée (notamment paiement à la livraison ou carte), statut de commande et de paiement, notes éventuelles.",
          "Navigation et expérience : recherches, produits consultés récemment, liste d’envies, panier, comparateur, préférences de personnalisation/recommandations lorsque ces modules sont actifs, et événements analytiques internes de la plateforme.",
          "Sécurité du compte : sessions appareils, historique de connexion, authentification à deux facteurs (secret TOTP et codes de secours hashés), jetons de réinitialisation de mot de passe hashés, et journalisation d’événements de sécurité utiles (tentatives de connexion, rate limiting).",
          "Communications : e-mails transactionnels (par ex. réinitialisation de mot de passe) lorsque le service d’e-mail est configuré ; prise de contact WhatsApp si vous utilisez le bouton WhatsApp du site.",
          "Médias : les images produits peuvent être hébergées via un prestataire média (ex. Cloudinary) lorsqu’il est configuré. Les fichiers téléversés côté administration ne sont pas destinés à contenir des données personnelles de clients.",
        ],
      },
      {
        id: "purposes",
        title: "3. Finalités",
        paragraphs: [
          "Fournir le site, le catalogue, la recherche, le panier et le parcours de commande.",
          "Créer et sécuriser votre compte (authentification, 2FA, codes de secours, récupération de mot de passe, sessions).",
          "Traiter et suivre les commandes, livraisons et échanges avec la conciergerie.",
          "Améliorer l’expérience (recommandations, personnalisation, analytics internes) lorsque ces fonctionnalités sont actives.",
          "Assurer la sécurité, prévenir les abus et maintenir la disponibilité du service.",
        ],
      },
      {
        id: "cookies",
        title: "4. Cookies et stockage local",
        paragraphs: [
          "Le site utilise des cookies ou un stockage équivalent nécessaires à la session d’authentification et au fonctionnement du panier/préférences côté navigateur.",
          "Des outils d’analyse tiers peuvent être ajoutés ultérieurement via configuration. Lorsqu’ils ne sont pas configurés, seuls les mécanismes internes de la plateforme s’appliquent.",
        ],
      },
      {
        id: "processors",
        title: "5. Prestataires et sous-traitants techniques",
        paragraphs: [
          "Hébergement applicatif (ex. Vercel), base de données PostgreSQL managée, envoi d’e-mails (ex. Resend lorsqu’il est configuré), médias (ex. Cloudinary lorsqu’il est configuré), et messagerie WhatsApp si vous initiez le contact.",
          "Les paiements par carte, s’ils sont sélectionnés au checkout, peuvent être organisés hors passerelle automatisée complète selon la configuration actuelle. Aucune donnée de carte bancaire complète n’est stockée par LORVEX dans l’application telle qu’elle est déployée aujourd’hui.",
        ],
      },
      {
        id: "retention",
        title: "6. Conservation",
        paragraphs: [
          "Les données de compte et de commande sont conservées tant que nécessaire à l’exécution du service, au suivi commercial et aux obligations opérationnelles.",
          "Les jetons de réinitialisation de mot de passe expirent et sont invalidés après usage. Les codes de secours 2FA sont stockés sous forme hashée et consommés à l’usage.",
        ],
      },
      {
        id: "security",
        title: "7. Sécurité",
        paragraphs: [
          "Mots de passe hashés, sessions JWT, 2FA optionnelle, codes de secours, rate limiting, journalisation de sécurité et contrôles d’accès administrateur (RBAC) sont mis en œuvre dans l’application.",
          "Aucune mesure technique ne garantit une sécurité absolue. Signalez immédiatement toute activité suspecte à notre conciergerie.",
        ],
      },
      {
        id: "rights",
        title: "8. Vos demandes",
        paragraphs: [
          "Selon le droit applicable, vous pouvez demander l’accès, la rectification ou la suppression de certaines données, ou la clôture de votre compte.",
          `Pour exercer une demande, écrivez à ${c.supportEmail} depuis l’adresse associée à votre compte, en précisant l’objet de la demande. Nous pourrons vérifier votre identité avant toute action.`,
          "Cette section décrit une procédure opérationnelle de contact ; elle ne crée pas automatiquement des droits réglementaires au-delà de ce que la loi applicable prévoit.",
        ],
      },
      {
        id: "children",
        title: "9. Mineurs",
        paragraphs: [
          "Le site s’adresse à un public adulte capable de conclure des actes d’achat. Nous ne collectons pas sciemment des données d’enfants.",
        ],
      },
      {
        id: "updates",
        title: "10. Mises à jour",
        paragraphs: [
          "Nous pouvons mettre à jour cette page pour refléter l’évolution des fonctionnalités ou de l’exploitation. La date de mise à jour affichée sur la page fait foi pour la version publiée.",
        ],
      },
    ],
  };
}

function privacyEn(c: ContactBits): LegalDocument {
  return {
    slug: "privacy",
    title: "Privacy Policy",
    description:
      "How LORVEX collects, uses and protects information related to browsing, orders and your account.",
    eyebrow: "Legal",
    intro:
      "This page describes the technical and operational practices of the LORVEX e-commerce platform regarding personal data. It reflects currently deployed features. It is not legal advice and does not claim a specific regulatory certification.",
    updatedLabel: "Last updated",
    tocLabel: "Contents",
    contactHeading: "Contact us",
    sections: [
      {
        id: "controller",
        title: "1. Who processes your data",
        paragraphs: [
          `${c.siteName} operates an online boutique for prestige watches, primarily serving Morocco. For privacy questions, contact our concierge at ${c.supportEmail} or ${c.supportPhone}.`,
          "Depending on your location and applicable law, additional obligations may apply. This page describes what the application currently does technically.",
        ],
      },
      {
        id: "data-collected",
        title: "2. Data we collect",
        paragraphs: [
          "Customer account: email, hashed password, name, optional phone, preferred locale and currency, account role and status.",
          "Orders: email, phone, shipping/billing addresses, line items, amounts, selected payment method (including cash on delivery or card), order and payment status, optional notes.",
          "Browsing and experience: search queries, recently viewed products, wishlist, cart, compare list, personalization/recommendation preferences when enabled, and internal analytics events.",
          "Account security: device sessions, login history, two-factor authentication (TOTP secret and hashed backup codes), hashed password-reset tokens, and security-related logs (login attempts, rate limiting).",
          "Communications: transactional emails (for example password reset) when email delivery is configured; WhatsApp contact if you use the site WhatsApp button.",
          "Media: product images may be hosted by a media provider (for example Cloudinary) when configured. Admin media uploads are not intended to store customer personal data.",
        ],
      },
      {
        id: "purposes",
        title: "3. Purposes",
        paragraphs: [
          "Operate the storefront, catalogue, search, cart and checkout.",
          "Create and secure accounts (authentication, 2FA, backup codes, password recovery, sessions).",
          "Process and follow orders, delivery and concierge communications.",
          "Improve experience (recommendations, personalization, internal analytics) when those features are active.",
          "Protect the service against abuse and maintain availability.",
        ],
      },
      {
        id: "cookies",
        title: "4. Cookies and local storage",
        paragraphs: [
          "The site uses cookies or equivalent storage required for authentication sessions and browser-side cart/preferences.",
          "Third-party analytics may be added later through configuration. When not configured, only the platform’s internal mechanisms apply.",
        ],
      },
      {
        id: "processors",
        title: "5. Technical service providers",
        paragraphs: [
          "Application hosting (for example Vercel), managed PostgreSQL, email delivery (for example Resend when configured), media hosting (for example Cloudinary when configured), and WhatsApp if you initiate contact.",
          "Card payments, if selected at checkout, may be arranged without a fully automated card gateway depending on current configuration. LORVEX does not store full card numbers in the application as deployed today.",
        ],
      },
      {
        id: "retention",
        title: "6. Retention",
        paragraphs: [
          "Account and order data are retained as needed to operate the service and handle commercial follow-up.",
          "Password-reset tokens expire and are invalidated after use. 2FA backup codes are stored hashed and consumed when used.",
        ],
      },
      {
        id: "security",
        title: "7. Security",
        paragraphs: [
          "Hashed passwords, JWT sessions, optional 2FA, backup codes, rate limiting, security logging and admin RBAC are implemented in the application.",
          "No technical measure guarantees absolute security. Please report suspicious activity to our concierge promptly.",
        ],
      },
      {
        id: "rights",
        title: "8. Your requests",
        paragraphs: [
          "Depending on applicable law, you may request access, correction or deletion of certain data, or account closure.",
          `To make a request, email ${c.supportEmail} from the address linked to your account and describe the request. We may verify your identity before acting.`,
          "This section describes an operational contact process; it does not automatically create regulatory rights beyond those provided by applicable law.",
        ],
      },
      {
        id: "children",
        title: "9. Minors",
        paragraphs: [
          "The site is intended for adults able to enter purchase transactions. We do not knowingly collect children’s data.",
        ],
      },
      {
        id: "updates",
        title: "10. Updates",
        paragraphs: [
          "We may update this page to reflect product or operational changes. The update date shown on the page identifies the published version.",
        ],
      },
    ],
  };
}

function privacyAr(c: ContactBits): LegalDocument {
  return {
    slug: "privacy",
    title: "سياسة الخصوصية",
    description:
      "كيف تجمع لورفكس وتستخدم وتحمي المعلومات المرتبطة بالتصفح والطلبات وحسابك.",
    eyebrow: "المعلومات القانونية",
    intro:
      "تصف هذه الصفحة الممارسات التقنية والتشغيلية لمنصة لورفكس للتجارة الإلكترونية فيما يتعلق بالبيانات الشخصية، وتعكس الوظائف المفعّلة حالياً. وهي ليست استشارة قانونية ولا تدّعي شهادة تنظيمية محددة.",
    updatedLabel: "آخر تحديث",
    tocLabel: "المحتويات",
    contactHeading: "تواصل معنا",
    sections: [
      {
        id: "controller",
        title: "1. من يعالج بياناتك",
        paragraphs: [
          `تشغّل ${c.siteName} متجراً إلكترونياً للساعات الفاخرة موجهاً أساساً إلى المغرب. لأي استفسار حول الخصوصية، تواصل مع الكونسيرج عبر ${c.supportEmail} أو ${c.supportPhone}.`,
          "قد تنطبق التزامات إضافية بحسب موقعك والقانون الواجب التطبيق. توضّح هذه الصفحة ما تقوم به المنصة تقنياً اليوم.",
        ],
      },
      {
        id: "data-collected",
        title: "2. البيانات التي نجمعها",
        paragraphs: [
          "الحساب: البريد الإلكتروني، كلمة المرور المشفّرة، الاسم، الهاتف اختياريًا، اللغة والعملة المفضلتان، ودور الحساب وحالته.",
          "الطلبات: البريد، الهاتف، عناوين الشحن/الفوترة، المنتجات، المبالغ، طريقة الدفع المختارة (بما في ذلك الدفع عند الاستلام أو البطاقة)، وحالة الطلب والدفع.",
          "التصفح والتجربة: البحث، المنتجات التي تمت مشاهدتها مؤخراً، قائمة الأمنيات، السلة، المقارنة، التخصيص/التوصيات عند تفعيلها، وأحداث التحليل الداخلية.",
          "أمان الحساب: جلسات الأجهزة، سجل الدخول، المصادقة الثنائية (سر TOTP ورموز احتياطية مشفّرة)، رموز إعادة تعيين كلمة المرور المشفّرة، وسجلات الأمان.",
          "التواصل: رسائل بريدية معاملية عند تهيئة خدمة البريد، والتواصل عبر واتساب إذا استخدمت زر واتساب في الموقع.",
          "الوسائط: قد تُستضاف صور المنتجات عبر مزوّد وسائط (مثل Cloudinary) عند التهيئة.",
        ],
      },
      {
        id: "purposes",
        title: "3. الأغراض",
        paragraphs: [
          "تشغيل المتجر والكتالوج والبحث والسلة وإتمام الطلب.",
          "إنشاء الحسابات وتأمينها (المصادقة، 2FA، الرموز الاحتياطية، استعادة كلمة المرور، الجلسات).",
          "معالجة الطلبات ومتابعتها والتواصل مع الكونسيرج.",
          "تحسين التجربة (التوصيات والتخصيص والتحليلات الداخلية) عند تفعيلها.",
          "حماية الخدمة من إساءة الاستخدام وضمان استمراريتها.",
        ],
      },
      {
        id: "cookies",
        title: "4. ملفات الارتباط والتخزين المحلي",
        paragraphs: [
          "يستخدم الموقع ملفات ارتباط أو تخزيناً معادلاً لازماً لجلسة المصادقة وتفضيلات السلة في المتصفح.",
          "قد تُضاف أدوات تحليل خارجية لاحقاً عبر الإعدادات. عند عدم تهيئتها، تُطبَّق فقط آليات المنصة الداخلية.",
        ],
      },
      {
        id: "processors",
        title: "5. مزوّدو الخدمات التقنية",
        paragraphs: [
          "استضافة التطبيق، قاعدة بيانات PostgreSQL مُدارة، إرسال البريد عند التهيئة، استضافة الوسائط عند التهيئة، وواتساب إذا بدأت التواصل.",
          "مدفوعات البطاقة، إن اختيرت عند الدفع، قد تُرتَّب دون بوابة بطاقة مؤتمتة بالكامل بحسب التهيئة الحالية. لا تخزّن لورفكس أرقام البطاقات الكاملة في التطبيق كما هو منشور اليوم.",
        ],
      },
      {
        id: "retention",
        title: "6. الاحتفاظ",
        paragraphs: [
          "تُحفظ بيانات الحساب والطلبات طالما كانت لازمة لتشغيل الخدمة والمتابعة التجارية.",
          "تنتهي صلاحية رموز إعادة تعيين كلمة المرور وتُبطل بعد الاستخدام. تُخزَّن الرموز الاحتياطية لـ 2FA بشكل مشفّر وتُستهلك عند الاستخدام.",
        ],
      },
      {
        id: "security",
        title: "7. الأمن",
        paragraphs: [
          "تشمل المنصة كلمات مرور مشفّرة، جلسات JWT، مصادقة ثنائية اختيارية، رموزاً احتياطية، تحديد المعدل، سجلات أمنية وصلاحيات إدارية.",
          "لا يوجد ضمان أمني مطلق. يُرجى إبلاغ الكونسيرج فوراً عن أي نشاط مشبوه.",
        ],
      },
      {
        id: "rights",
        title: "8. طلباتك",
        paragraphs: [
          "بحسب القانون الواجب التطبيق، يمكنك طلب الاطلاع أو التصحيح أو الحذف لبعض البيانات، أو إغلاق الحساب.",
          `قدّم الطلب عبر ${c.supportEmail} من البريد المرتبط بحسابك مع توضيح المطلوب. قد نتحقق من هويتك قبل التنفيذ.`,
          "تصف هذه الفقرة إجراء تواصل تشغيلياً؛ ولا تنشئ تلقائياً حقوقاً تنظيمية تتجاوز ما ينص عليه القانون.",
        ],
      },
      {
        id: "children",
        title: "9. القُصَّر",
        paragraphs: [
          "الموقع موجّه للبالغين القادرين على إتمام عمليات الشراء. لا نجمع عن علم بيانات الأطفال.",
        ],
      },
      {
        id: "updates",
        title: "10. التحديثات",
        paragraphs: [
          "قد نحدّث هذه الصفحة لتعكس تطور الوظائف أو التشغيل. تاريخ التحديث الظاهر على الصفحة يحدد النسخة المنشورة.",
        ],
      },
    ],
  };
}

function termsFr(c: ContactBits): LegalDocument {
  return {
    slug: "terms",
    title: "Conditions générales",
    description:
      "Conditions d’utilisation de la boutique LORVEX, des comptes clients et du parcours de commande.",
    eyebrow: "Informations légales",
    intro:
      "Les présentes conditions encadrent l’accès au site et les commandes passées via la plateforme LORVEX. Elles décrivent le fonctionnement commercial réellement proposé par l’application. En cas de divergence avec une confirmation de commande écrite, cette dernière prévaut pour la transaction concernée.",
    updatedLabel: "Dernière mise à jour",
    tocLabel: "Sommaire",
    contactHeading: "Conciergerie",
    sections: [
      {
        id: "acceptance",
        title: "1. Acceptation",
        paragraphs: [
          `En naviguant sur le site ${c.siteName} ou en passant commande, vous acceptez les présentes conditions dans la mesure où elles s’appliquent à votre usage.`,
          "Si vous n’acceptez pas ces conditions, veuillez ne pas utiliser le site pour passer commande.",
        ],
      },
      {
        id: "service",
        title: "2. Service proposé",
        paragraphs: [
          "LORVEX propose une sélection de montres et accessoires via une boutique en ligne, avec catalogue, recherche, fiches produits, panier, checkout, compte client et espace administrateur dédié à l’exploitation.",
          "Certaines fonctionnalités (avis, personnalisation, médias cloud, e-mails, analytics tiers) dépendent de la configuration active.",
        ],
      },
      {
        id: "accounts",
        title: "3. Comptes",
        paragraphs: [
          "Vous pouvez créer un compte avec une adresse e-mail et un mot de passe conforme à la politique de robustesse du site. L’accès peut être sécurisé par authentification à deux facteurs et codes de secours.",
          "Vous êtes responsable de la confidentialité de vos identifiants, appareils et codes. Signalez toute utilisation non autorisée à la conciergerie.",
          "LORVEX peut suspendre un compte en cas d’abus, fraude suspectée ou atteinte à la sécurité.",
        ],
      },
      {
        id: "products",
        title: "4. Produits, disponibilité et prix",
        paragraphs: [
          "Les descriptions, images et prix sont présentés de bonne foi. Les stocks et disponibilités peuvent évoluer.",
          "Les prix sont affichés dans la devise indiquée (notamment MAD) et peuvent inclure ou exclure certains frais selon le récapitulatif de commande.",
          "Une commande n’est définitive qu’après validation du parcours checkout et enregistrement de la commande dans le système.",
        ],
      },
      {
        id: "orders",
        title: "5. Commandes et confirmation",
        paragraphs: [
          "Le checkout permet de saisir les informations de livraison, de choisir un mode d’expédition disponible et une méthode de paiement proposée (paiement à la livraison et/ou carte selon l’interface).",
          "Après validation, un numéro de commande est généré et une page de confirmation/bon de commande peut être consultée ou téléchargée.",
          "Nous pouvons contacter le client pour vérifier une commande inhabituelle, incomplete ou à risque.",
        ],
      },
      {
        id: "payment",
        title: "6. Paiement",
        paragraphs: [
          "Paiement à la livraison (COD) : le paiement reste dû à la réception selon les modalités convenues ; le statut de paiement peut rester « en attente » jusqu’à encaissement. Cela ne signifie pas que la commande est prépayée.",
          "Paiement par carte : lorsqu’il est proposé, le règlement peut être organisé selon le processus opérationnel en vigueur. L’application ne stocke pas les numéros de carte complets.",
          "Aucun faux statut « payé » n’est attribué automatiquement aux commandes COD.",
        ],
      },
      {
        id: "shipping",
        title: "7. Livraison",
        paragraphs: [
          "Les modes et frais de livraison disponibles sont ceux présentés au checkout. Les délais annoncés sont indicatifs.",
          "Le client doit fournir des coordonnées exactes. LORVEX n’est pas responsable des retards dus à des informations incorrectes ou à des événements hors contrôle raisonnable.",
        ],
      },
      {
        id: "returns",
        title: "8. Retours, remboursements et annulations",
        paragraphs: [
          "Les demandes de retour, remboursement ou annulation sont évaluées au cas par cas selon l’état du produit, les scellés, la documentation et le statut de la commande.",
          `Contactez ${c.supportEmail} rapidement après réception pour toute demande. Une procédure administrative (retours/remboursements) peut ensuite être traitée par l’équipe.`,
          "Sauf engagement écrit spécifique, aucune politique de retour illimitée n’est garantie automatiquement.",
        ],
      },
      {
        id: "warranty",
        title: "9. Authenticité et garantie",
        paragraphs: [
          "LORVEX s’attache à proposer des pièces authentiques via ses canaux d’approvisionnement. Les garanties constructeur éventuelles restent celles fournies avec la montre, le cas échéant.",
          "Les détails de garantie applicables à une pièce donnée sont précisés lors de la vente ou dans la documentation livrée.",
        ],
      },
      {
        id: "ip",
        title: "10. Propriété intellectuelle",
        paragraphs: [
          "Les marques, textes, visuels, mise en page et éléments logiciels du site sont protégés. Toute reproduction non autorisée est interdite.",
          "Les marques de manufactures tierces restent la propriété de leurs titulaires.",
        ],
      },
      {
        id: "conduct",
        title: "11. Usage interdit",
        paragraphs: [
          "Il est interdit d’utiliser le site pour frauder, perturber le service, contourner les contrôles de sécurité, scraper abusivement le catalogue ou porter atteinte aux droits de tiers.",
        ],
      },
      {
        id: "liability",
        title: "12. Limitation de responsabilité",
        paragraphs: [
          "Dans les limites autorisées par la loi applicable, LORVEX ne saurait être responsable des dommages indirects, pertes de profit ou interruptions résultant d’un usage du site ou d’un événement hors contrôle raisonnable.",
          "Rien dans ces conditions n’exclut une responsabilité qui ne peut légalement être limitée.",
        ],
      },
      {
        id: "law",
        title: "13. Droit applicable",
        paragraphs: [
          "Sauf disposition légale contraire d’ordre public, les présentes conditions sont interprétées conformément au droit marocain et aux tribunaux compétents du Maroc, sans préjudice des droits impératifs dont vous pourriez bénéficier.",
        ],
      },
      {
        id: "contact",
        title: "14. Contact",
        paragraphs: [
          `Conciergerie LORVEX — ${c.supportEmail} — ${c.supportPhone} — Casablanca, Maroc.`,
        ],
      },
    ],
  };
}

function termsEn(c: ContactBits): LegalDocument {
  return {
    slug: "terms",
    title: "Terms & Conditions",
    description:
      "Terms of use for the LORVEX boutique, customer accounts and order flow.",
    eyebrow: "Legal",
    intro:
      "These terms govern access to the site and orders placed through the LORVEX platform. They describe the commercial flow actually offered by the application. If a written order confirmation differs for a specific transaction, that confirmation prevails for that order.",
    updatedLabel: "Last updated",
    tocLabel: "Contents",
    contactHeading: "Concierge",
    sections: [
      {
        id: "acceptance",
        title: "1. Acceptance",
        paragraphs: [
          `By browsing ${c.siteName} or placing an order, you agree to these terms to the extent they apply to your use.`,
          "If you do not agree, please do not use the site to place orders.",
        ],
      },
      {
        id: "service",
        title: "2. Service",
        paragraphs: [
          "LORVEX offers a curated selection of watches and related products through an online boutique with catalogue, search, product pages, cart, checkout, customer account and an admin operations console.",
          "Some features (reviews, personalization, cloud media, email delivery, third-party analytics) depend on active configuration.",
        ],
      },
      {
        id: "accounts",
        title: "3. Accounts",
        paragraphs: [
          "You may create an account with an email and a password that meets the site’s strength policy. Access may be protected with two-factor authentication and backup codes.",
          "You are responsible for keeping credentials, devices and codes confidential. Report unauthorized use to the concierge.",
          "LORVEX may suspend accounts in cases of abuse, suspected fraud or security risk.",
        ],
      },
      {
        id: "products",
        title: "4. Products, availability and pricing",
        paragraphs: [
          "Descriptions, images and prices are presented in good faith. Stock and availability may change.",
          "Prices are shown in the indicated currency (including MAD) and may include or exclude certain fees as shown in the order summary.",
          "An order becomes recorded only after checkout validation and creation of the order in the system.",
        ],
      },
      {
        id: "orders",
        title: "5. Orders and confirmation",
        paragraphs: [
          "Checkout collects delivery details, available shipping methods and a offered payment method (cash on delivery and/or card depending on the interface).",
          "After confirmation, an order number is generated and a confirmation/receipt page may be viewed or downloaded.",
          "We may contact customers to verify unusual, incomplete or higher-risk orders.",
        ],
      },
      {
        id: "payment",
        title: "6. Payment",
        paragraphs: [
          "Cash on delivery (COD): payment remains due on delivery under the agreed process; payment status may remain pending until collection. This does not mean the order is prepaid.",
          "Card payment: when offered, settlement follows the operational process in place. The application does not store full card numbers.",
          "COD orders are not falsely marked as paid.",
        ],
      },
      {
        id: "shipping",
        title: "7. Shipping",
        paragraphs: [
          "Available shipping methods and fees are those shown at checkout. Time estimates are indicative.",
          "Customers must provide accurate contact details. LORVEX is not responsible for delays caused by incorrect information or events beyond reasonable control.",
        ],
      },
      {
        id: "returns",
        title: "8. Returns, refunds and cancellations",
        paragraphs: [
          "Return, refund or cancellation requests are assessed case by case based on product condition, seals, documentation and order status.",
          `Contact ${c.supportEmail} promptly after delivery for any request. An administrative returns/refunds process may then be handled by the team.`,
          "Unless a specific written commitment is provided, no unlimited return policy is automatically guaranteed.",
        ],
      },
      {
        id: "warranty",
        title: "9. Authenticity and warranty",
        paragraphs: [
          "LORVEX aims to offer authentic pieces through trusted channels. Any manufacturer warranty remains the one supplied with the watch, when applicable.",
          "Warranty details for a specific piece are confirmed at sale or in the delivered documentation.",
        ],
      },
      {
        id: "ip",
        title: "10. Intellectual property",
        paragraphs: [
          "Site branding, copy, visuals, layout and software elements are protected. Unauthorized reproduction is prohibited.",
          "Third-party manufacturer trademarks remain owned by their respective owners.",
        ],
      },
      {
        id: "conduct",
        title: "11. Prohibited use",
        paragraphs: [
          "You may not use the site to commit fraud, disrupt the service, bypass security controls, abusively scrape the catalogue or infringe third-party rights.",
        ],
      },
      {
        id: "liability",
        title: "12. Limitation of liability",
        paragraphs: [
          "To the extent permitted by applicable law, LORVEX is not liable for indirect damages, lost profits or interruptions arising from use of the site or events beyond reasonable control.",
          "Nothing in these terms excludes liability that cannot legally be limited.",
        ],
      },
      {
        id: "law",
        title: "13. Governing law",
        paragraphs: [
          "Unless mandatory law provides otherwise, these terms are interpreted under Moroccan law and the competent courts of Morocco, without prejudice to any mandatory rights you may have.",
        ],
      },
      {
        id: "contact",
        title: "14. Contact",
        paragraphs: [
          `LORVEX Concierge — ${c.supportEmail} — ${c.supportPhone} — Casablanca, Morocco.`,
        ],
      },
    ],
  };
}

function termsAr(c: ContactBits): LegalDocument {
  return {
    slug: "terms",
    title: "الشروط والأحكام",
    description:
      "شروط استخدام متجر لورفكس والحسابات ومسار الطلب.",
    eyebrow: "المعلومات القانونية",
    intro:
      "تنظّم هذه الشروط الوصول إلى الموقع والطلبات عبر منصة لورفكس، وتصف التدفق التجاري الذي توفره المنصة فعلياً. إذا اختلف تأكيد طلب مكتوب لمعاملة محددة، يسود ذلك التأكيد لتلك المعاملة.",
    updatedLabel: "آخر تحديث",
    tocLabel: "المحتويات",
    contactHeading: "الكونسيرج",
    sections: [
      {
        id: "acceptance",
        title: "1. القبول",
        paragraphs: [
          `بتصفح موقع ${c.siteName} أو تقديم طلب، فإنك توافق على هذه الشروط بالقدر الذي ينطبق على استخدامك.`,
          "إذا كنت لا توافق، يُرجى عدم استخدام الموقع لتقديم الطلبات.",
        ],
      },
      {
        id: "service",
        title: "2. الخدمة",
        paragraphs: [
          "توفر لورفكس تشكيلة مختارة من الساعات عبر متجر إلكتروني يشمل الكتالوج والبحث وصفحات المنتجات والسلة وإتمام الطلب والحساب ولوحة إدارة.",
          "بعض الوظائف (التقييمات، التخصيص، الوسائط السحابية، البريد، التحليلات الخارجية) تعتمد على التهيئة النشطة.",
        ],
      },
      {
        id: "accounts",
        title: "3. الحسابات",
        paragraphs: [
          "يمكنك إنشاء حساب ببريد إلكتروني وكلمة مرور وفق سياسة القوة المعتمدة. قد يُحمى الدخول بالمصادقة الثنائية والرموز الاحتياطية.",
          "أنت مسؤول عن سرية بيانات الدخول والأجهزة والرموز. أبلغ الكونسيرج عن أي استخدام غير مصرح به.",
          "يجوز للورفكس تعليق الحسابات في حال إساءة الاستخدام أو الاشتباه بالاحتيال أو المخاطر الأمنية.",
        ],
      },
      {
        id: "products",
        title: "4. المنتجات والتوفر والأسعار",
        paragraphs: [
          "تُعرض الأوصاف والصور والأسعار بحسن نية. قد يتغير المخزون والتوفر.",
          "تظهر الأسعار بالعملة المبينة (بما في ذلك الدرهم) وقد تشمل أو تستثني رسوماً وفق ملخص الطلب.",
          "يُسجَّل الطلب فقط بعد إتمام مسار الدفع وإنشائه في النظام.",
        ],
      },
      {
        id: "orders",
        title: "5. الطلبات والتأكيد",
        paragraphs: [
          "يجمع إتمام الطلب بيانات التسليم وطرق الشحن المتاحة وطريقة دفع معروضة (الدفع عند الاستلام و/أو البطاقة بحسب الواجهة).",
          "بعد التأكيد يُنشأ رقم طلب ويمكن الاطلاع على صفحة التأكيد/الإيصال أو تنزيلها.",
          "قد نتواصل للتحقق من الطلبات غير المعتادة أو غير المكتملة أو الأعلى خطراً.",
        ],
      },
      {
        id: "payment",
        title: "6. الدفع",
        paragraphs: [
          "الدفع عند الاستلام (COD): يبقى الدفع مستحقاً عند التسليم؛ وقد تبقى حالة الدفع قيد الانتظار حتى التحصيل. هذا لا يعني أن الطلب مدفوع مسبقاً.",
          "الدفع بالبطاقة: عند توفره يتبع العملية التشغيلية المعتمدة. لا تخزّن المنصة أرقام البطاقات الكاملة.",
          "لا تُعلَّم طلبات COD خطأً بأنها مدفوعة.",
        ],
      },
      {
        id: "shipping",
        title: "7. الشحن",
        paragraphs: [
          "طرق الشحن والرسوم المتاحة هي المعروضة عند إتمام الطلب. المدد تقديرية.",
          "يجب تقديم بيانات اتصال دقيقة. لا تتحمل لورفكس التأخير الناتج عن معلومات غير صحيحة أو أحداث خارج السيطرة المعقولة.",
        ],
      },
      {
        id: "returns",
        title: "8. الإرجاع والاسترداد والإلغاء",
        paragraphs: [
          "تُقيَّم طلبات الإرجاع أو الاسترداد أو الإلغاء حالة بحالة بحسب حالة المنتج والأختام والوثائق وحالة الطلب.",
          `تواصل مع ${c.supportEmail} بسرعة بعد الاستلام لأي طلب. قد تُعالج الإدارة لاحقاً مسار إرجاع/استرداد.`,
          "ما لم يوجد التزام مكتوب محدد، لا تُضمن سياسة إرجاع غير محدودة تلقائياً.",
        ],
      },
      {
        id: "warranty",
        title: "9. الأصالة والضمان",
        paragraphs: [
          "تسعى لورفكس لتقديم قطع أصلية عبر قنوات موثوقة. أي ضمان من الشركة المصنّعة يبقى كما هو مرفق مع الساعة عند الاقتضاء.",
          "تفاصيل الضمان لقطعة محددة تُوضَّح عند البيع أو في الوثائق المسلّمة.",
        ],
      },
      {
        id: "ip",
        title: "10. الملكية الفكرية",
        paragraphs: [
          "هوية الموقع والنصوص والصور والتخطيط وعناصر البرمجيات محمية. يُحظر النسخ غير المصرح به.",
          "علامات الشركات المصنّعة تبقى ملكاً لأصحابها.",
        ],
      },
      {
        id: "conduct",
        title: "11. الاستخدام المحظور",
        paragraphs: [
          "يُحظر استخدام الموقع للاحتيال أو تعطيل الخدمة أو تجاوز الضوابط الأمنية أو سحب الكتالوج بشكل مسيء أو انتهاك حقوق الغير.",
        ],
      },
      {
        id: "liability",
        title: "12. تحديد المسؤولية",
        paragraphs: [
          "في الحدود التي يسمح بها القانون، لا تتحمل لورفكس الأضرار غير المباشرة أو فوات الربح أو الانقطاعات الناشئة عن استخدام الموقع أو أحداث خارج السيطرة المعقولة.",
          "لا يستبعد أي بند مسؤولية لا يجوز قانوناً الحد منها.",
        ],
      },
      {
        id: "law",
        title: "13. القانون الواجب التطبيق",
        paragraphs: [
          "ما لم يقتض قانون آمر خلاف ذلك، تُفسَّر هذه الشروط وفق القانون المغربي وأمام المحاكم المختصة في المغرب، مع حفظ أي حقوق إلزامية قد تتمتع بها.",
        ],
      },
      {
        id: "contact",
        title: "14. التواصل",
        paragraphs: [
          `كونسيرج لورفكس — ${c.supportEmail} — ${c.supportPhone} — الدار البيضاء، المغرب.`,
        ],
      },
    ],
  };
}

export function getLegalDocument(
  locale: Locale,
  slug: "privacy" | "terms",
  contact: ContactBits,
): LegalDocument {
  if (slug === "privacy") {
    if (locale === "en") return privacyEn(contact);
    if (locale === "ar") return privacyAr(contact);
    return privacyFr(contact);
  }
  if (locale === "en") return termsEn(contact);
  if (locale === "ar") return termsAr(contact);
  return termsFr(contact);
}

export const LEGAL_SLUGS = ["privacy", "terms"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}
