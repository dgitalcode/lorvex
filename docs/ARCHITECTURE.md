# LORVEX — Architecture & Implementation Roadmap

> Luxury watch e-commerce platform for Morocco. Target: Awwwards-level UX, enterprise maintainability, production-ready.

---

## 1. Brand & Positioning

| Item | Value |
|------|--------|
| Brand | **LORVEX** |
| Market | Morocco (MAD primary) + multi-currency |
| Languages | Français, English, العربية (RTL) |
| Tone | Quiet luxury — Rolex / AP / Nothing / Apple restraint |

---

## 2. Clean Architecture Layers

```
src/
├── app/                    # Next.js App Router (presentation + routing)
│   ├── [locale]/          # Storefront + account (i18n)
│   │   ├── (store)/        # Public commerce pages
│   │   ├── (account)/      # Authenticated customer area
│   │   └── (auth)/         # Sign-in / register
│   ├── admin/              # Admin panel (RBAC-gated)
│   └── api/                # Route handlers (webhooks, auth, health)
├── components/
│   ├── ui/                 # Primitives (Shadcn-based, Lorvex-themed)
│   ├── storefront/         # Domain UI for shop
│   ├── admin/              # Domain UI for back-office
│   └── shared/             # Cross-cutting (providers, motion, SEO)
├── server/
│   ├── actions/            # Server Actions (mutations)
│   ├── services/           # Business logic (pure-ish, testable)
│   ├── repositories/       # Prisma data access
│   └── validations/        # Zod schemas
├── lib/                    # Infra: prisma, auth, cloudinary, cache, rate-limit
├── stores/                 # Client state (cart, wishlist, compare, UI)
├── hooks/
├── config/                 # Site config, theme tokens, feature flags
├── i18n/
└── types/
```

### Dependency rule

`app → components → hooks/stores → server/actions → services → repositories → prisma`

Never import Prisma from components. Never put business rules in UI.

---

## 3. Tech Decisions

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | Next.js 16 App Router + Cache Components | PPR, `'use cache'`, Turbopack |
| Auth | Auth.js (NextAuth v5) + Prisma adapter | Credentials + OAuth ready |
| ORM | Prisma + PostgreSQL | Type-safe, migrations, enterprise |
| Media | Cloudinary | Transforms, 360, video |
| Forms | RHF + Zod | Shared client/server validation |
| Motion | Framer Motion | Luxury transitions |
| i18n | next-intl | FR/EN/AR + RTL |
| Theme | next-themes | Dark/Light |
| Cart | Cookie + DB cart sync | Guest + account |
| Admin CMS | DB-driven sections / builders | Zero code edits for content |
| Payments | Stripe + Cash on Delivery (MAD) | Morocco realities |
| Email | Resend (transactional) | Orders, invoices |
| PDF | @react-pdf/renderer | Invoices |

---

## 4. Database Domains (Prisma)

1. **Identity** — User, Account, Session, Role, Permission, AuditLog  
2. **Catalog** — Brand, Collection, Category, Product, Variant, Media, Spec, Tag  
3. **Commerce** — Cart, Order, OrderItem, Coupon, GiftCard, ShippingMethod, Tax, Currency  
4. **CRM** — Address, Wishlist, Review, Question, SupportTicket, Notification  
5. **CMS** — Page, Section, Navigation, Footer, Announcement, ThemeSettings, HomepageBlock  
6. **Content** — BlogPost, FAQ, MediaAsset  
7. **Ops** — InventoryMovement, Return, Refund, EmailLog, SystemHealth  

Full schema: `prisma/schema.prisma`

---

## 5. Reusable Component System

### Design tokens (`globals.css` + CSS variables)

- Colors: ivory / charcoal / gold accent (sparing), never purple template kits
- Type: Editorial display + refined sans (loaded via `next/font`)
- Spacing scale: 4/8/12/16/24/32/48/64/96/128
- Motion: 200–600ms ease `[0.22, 1, 0.36, 1]`
- Shadows: soft layered, never neon glow

### Primitive UI (`components/ui`)

Button, Input, Select, Dialog, Sheet, Tabs, Accordion, Badge, Skeleton, Tooltip, Toast, Separator, Checkbox, Switch, Slider, Pagination, Command, Dropdown, NavigationMenu

### Storefront molecules

`ProductCard`, `ProductGallery`, `ProductViewer360`, `MegaMenu`, `FilterRail`, `Price`, `StockBadge`, `AddToCart`, `WishlistButton`, `CompareToggle`, `NewsletterForm`, `TestimonialMarquee`, `SectionReveal`

### Admin molecules

`DataTable`, `StatCard`, `MediaPicker`, `RichText`, `SectionBuilder`, `NavBuilder`, `ThemeEditor`, `BulkActions`

---

## 6. Admin System

- Route group: `/admin/*` with middleware RBAC (`SUPER_ADMIN`, `ADMIN`, `EDITOR`, `SUPPORT`, `ANALYST`)
- Every storefront content entity editable via CMS builders
- Inventory, orders, marketing, SEO fields, media library, roles, activity logs, system health
- Dashboard: revenue, orders, conversion, low stock, abandoned carts

---

## 7. SEO & Performance

- Dynamic `generateMetadata` per locale/product/collection
- JSON-LD: Organization, Product, BreadcrumbList, FAQ, Review
- `sitemap.xml` + `robots.txt` + canonicals + OG/Twitter
- Image: `next/image` + Cloudinary CDN
- `'use cache'` + `cacheTag` / `cacheLife` for catalog ISR-equivalent
- PWA: manifest + service worker (offline shell)

---

## 8. Security

- Auth.js secure cookies, CSRF (built-in)
- Zod on every Server Action
- RBAC on admin + sensitive actions
- Rate limiting on auth / checkout / search
- AuditLog for admin mutations
- Helmet-equivalent headers in `next.config` / proxy
- Prisma parameterized queries (SQLi protection)

---

## 9. Implementation Roadmap (strict order)

Each phase must pass: typecheck + lint + production build before the next.

### Phase 0 — Foundation ✅
- Next.js 16 scaffold, Tailwind, design tokens, fonts
- Complete Prisma schema + seed
- Env template, Docker Postgres (port 5433), core libs

### Phase 1 — Auth & Shell ✅
- NextAuth credentials + session
- Locale routing FR/EN/AR + RTL
- Storefront shell: navbar, mega menu, footer, theme toggle
- Admin shell + RBAC gate

### Phase 2 — Catalog ✅ (core)
- Brands, collections, categories, products, variants, media
- Shop filters, sort, pagination, search
- PDP: gallery, variants, specs, reviews, recommendations

### Phase 3 — Commerce ✅ (core)
- Cart (guest), wishlist, compare, recently viewed
- Checkout: address, shipping, coupons, notes, COD/CARD
- Orders + confirmation page

### Phase 4 — Account ✅ (core)
- Dashboard, orders, wishlist, sign-in / register

### Phase 5 — Admin & CMS ✅ (Enterprise)
- Enterprise admin shell (command palette, RBAC, dark/light, responsive)
- Catalog CRUD, inventory, brands, collections, Cloudinary media library
- Orders workflow (timeline, notes, tracking, invoices/labels PDF, refunds/returns)
- Customers CRM (LTV, tags, wishlist, activity)
- CMS builders (homepage, navigation, footer, announcement) with draft/publish/versions
- Marketing (coupons, gift cards, campaigns, popups, discounts, abandoned carts, loyalty)
- Analytics dashboard + custom reports + CSV export + realtime page_view tracking
- System ops (health, backups, audit logs, roles matrix, site settings)

### Phase 6 — Intelligence & Polish ✅
- Personalization engine, hybrid recommendations, enterprise search
- PWA service worker (offline shell, push hooks, shortcuts)
- 2FA / device sessions / login history / rate limiting
- Analytics funnels + search analytics
- Performance: AVIF/WebP, package import optimization, route prefetch

### Phase 7 — Growth ⏳
- Vision provider for image search, Lighthouse 100 polish, voice commerce

---

## 10. Quality Gates (every PR / phase)

- `npx tsc --noEmit` → 0 errors  
- `npm run lint` → 0 errors  
- `npm run build` → success  
- No hydration warnings  
- No placeholder / TODO / fake stubs in shipped paths  

---

## 11. Local Development

```bash
docker compose up -d          # PostgreSQL on host port 5433
cp .env.example .env.local    # fill secrets
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

> Note: port **5433** avoids conflicts with a local Postgres already on 5432.

Storefront: `http://localhost:3000/fr`  
Admin: `http://localhost:3000/admin`  
Default admin (seed): `admin@lorvex.ma` / `LorvexAdmin2026!`  
Default client (seed): `client@lorvex.ma` / `LorvexClient2026!`
